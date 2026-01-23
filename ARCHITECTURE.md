# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Next.js 14 Frontend (Port 3000)              │  │
│  │                                                            │  │
│  │  Pages:                                                    │  │
│  │  • /docs              → Browse documentation              │  │
│  │  • /docs/[slug]       → View single doc                   │  │
│  │  • /experiments       → List all experiments              │  │
│  │  • /experiments/[id]  → Experiment detail + run form     │  │
│  │  • /runs              → Runs history                      │  │
│  │  • /runs/[id]         → Live run output + artifacts       │  │
│  │  • /runs/compare      → Compare multiple runs             │  │
│  │  • /glossary          → Searchable V8 terms               │  │
│  │                                                            │  │
│  │  Features:                                                 │  │
│  │  • Server-Side Rendering (RSC)                            │  │
│  │  • EventSource for live logs                              │  │
│  │  • Dark/light mode                                        │  │
│  │  • Keyboard shortcuts                                     │  │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                            │
└─────────────────────┼────────────────────────────────────────────┘
                      │
                      │ HTTP Requests
                      │ + SSE (Server-Sent Events)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Express API Server (Port 4000)                      │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     REST API Endpoints                    │  │
│  │                                                            │  │
│  │  GET  /api/docs                List docs                 │  │
│  │  GET  /api/docs/:slug          Get doc content           │  │
│  │  GET  /api/experiments         List experiments          │  │
│  │  GET  /api/experiments/:id     Get experiment details    │  │
│  │  POST /api/runs                Create new run            │  │
│  │  GET  /api/runs                List runs (filterable)    │  │
│  │  GET  /api/runs/:id            Get run details           │  │
│  │  GET  /api/runs/:id/stream     SSE: Live log stream      │  │
│  │  GET  /api/runs/:id/artifacts  List artifacts            │  │
│  │                                                            │  │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                            │
│  ┌──────────────────▼───────────────────────────────────────┐  │
│  │                  Business Logic Services                  │  │
│  │                                                            │  │
│  │  • DocsService      → Scan & parse docs/                 │  │
│  │  • ExperimentsService → Scan & parse experiments/        │  │
│  │  • RunService       → Orchestrate experiment execution   │  │
│  │    - Run queue (concurrency: 1)                          │  │
│  │    - Process spawning via execa                          │  │
│  │    - Artifact management                                 │  │
│  │  • StreamService    → SSE management                     │  │
│  │                                                            │  │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                            │
└─────────────────────┼────────────────────────────────────────────┘
                      │
                      │ spawn child_process
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Node.js Child Processes (V8 Experiments)            │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │    Existing CLI Tool: scripts/run-experiment.js          │  │
│  │                                                            │  │
│  │  Executes:                                                 │  │
│  │    node [--trace-opt --trace-deopt]                       │  │
│  │         [--cpu-prof --cpu-prof-dir=...]                   │  │
│  │         experiments/<exp>/<variant>.js                    │  │
│  │                                                            │  │
│  │  Output:                                                   │  │
│  │    • stdout → Experiment results (timings)                │  │
│  │    • stderr → V8 trace logs                               │  │
│  │    • files  → CPU profiles                                │  │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                            │
└─────────────────────┼────────────────────────────────────────────┘
                      │
                      │ writes to filesystem
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      File System Storage                         │
│                                                                   │
│  artifacts/                                                       │
│  ├── runs/                                                        │
│  │   └── <runId>.json        ← Run metadata                     │
│  │                                                                │
│  ├── <experiment>/                                                │
│  │   └── <variant>/                                              │
│  │       └── <timestamp>/                                        │
│  │           ├── stdout.log         ← Experiment output         │
│  │           ├── trace.log          ← V8 trace output           │
│  │           ├── metadata.json      ← Run environment           │
│  │           └── *.cpuprofile       ← CPU profiling data        │
│  │                                                                │
│  docs/                   ← Documentation (read-only)             │
│  experiments/            ← Experiment code (read-only)           │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. **User Browses Experiments**
```
User clicks "Experiments"
  → GET /api/experiments
    → Server scans experiments/*/README.md
    → Returns JSON: [{id, name, variants[], tags[]}, ...]
  → Frontend renders cards
```

### 2. **User Runs Experiment**
```
User fills form on /experiments/01-hidden-classes
  ↓ (exp: "01-hidden-classes", variant: "deopt", trace: true)
  → POST /api/runs
    → Server validates input (Zod)
    → Generates runId (UUID)
    → Adds to queue {status: "queued"}
    → Returns {runId, status: "queued"}
  ← Frontend redirects to /runs/{runId}
```

### 3. **Run Executes (Background)**
```
RunService queue processor
  ↓ (status: "queued" → "running")
  → spawn child process:
      node --trace-opt --trace-deopt \
        experiments/01-hidden-classes/deopt.js
  → Capture stdout/stderr in real-time
  → Broadcast via SSE to connected clients
  → On completion:
    - Save artifacts to disk
    - Update metadata.json (status: "completed")
```

### 4. **User Views Live Logs**
```
Frontend on /runs/{runId}
  ↓
  → GET /api/runs/{runId}/stream (EventSource)
    → Server opens SSE connection
    → Sends chunks as experiment runs:
        {type: "log", data: "..."}
        {type: "status", data: "running"}
        {type: "complete", data: {...}}
  ← Frontend appends to terminal component
```

### 5. **User Downloads Artifacts**
```
User clicks "Download Trace Log"
  → GET /api/runs/{runId}/artifacts
    → Server reads metadata.json
    → Returns list: ["stdout.log", "trace.log"]
  → User clicks individual file
    → GET /artifacts/<exp>/<variant>/<timestamp>/trace.log
    → Server sends file (static serving)
```

---

## Technology Stack

### Frontend (Next.js 14)
```typescript
Next.js 14 (App Router)
  ├── React 18 (Server Components)
  ├── TypeScript 5
  ├── Tailwind CSS (styling)
  ├── react-markdown (doc rendering)
  │   ├── remark-gfm (GitHub-flavored Markdown)
  │   └── rehype-prism-plus (syntax highlighting)
  ├── Recharts (data visualization)
  └── EventSource API (live streaming)
```

**Pages Architecture**:
- `app/layout.tsx` - Root layout with nav
- `app/docs/page.tsx` - Docs list (RSC)
- `app/docs/[slug]/page.tsx` - Doc detail (RSC)
- `app/experiments/page.tsx` - Experiments list
- `app/experiments/[id]/page.tsx` - Experiment detail + form
- `app/runs/page.tsx` - Runs list
- `app/runs/[id]/page.tsx` - Run detail + live logs (client component)

### Backend (Express)
```typescript
Express 4.19
  ├── TypeScript 5 (compiled to dist/)
  ├── Zod (schema validation)
  ├── execa (safe child_process spawning)
  ├── gray-matter (Markdown frontmatter parsing)
  ├── morgan (HTTP logging)
  ├── helmet (security headers)
  └── cors (dev CORS handling)
```

**Directory Structure**:
```
server/src/
  ├── index.ts          # Express app setup
  ├── config.ts         # Environment config
  ├── routes/
  │   ├── docs.ts       # Docs endpoints
  │   ├── experiments.ts # Experiments endpoints
  │   └── runs.ts       # Runs endpoints + SSE
  ├── services/
  │   ├── DocsService.ts
  │   ├── ExperimentsService.ts
  │   ├── RunService.ts
  │   └── StreamService.ts
  └── types.ts          # Shared types
```

### Shared Package
```
shared/src/
  ├── types.ts          # TypeScript interfaces
  ├── schemas.ts        # Zod schemas
  └── utils.ts          # Common helpers
```

---

## Key Design Decisions

### 1. **Monorepo with Workspaces**
- Single repository, multiple packages
- Benefits:
  - Shared types between frontend/backend (type-safe APIs)
  - Single `npm install`
  - Easier dependency management

### 2. **Reuse Existing CLI**
- Backend spawns `scripts/run-experiment.js` as-is
- Benefits:
  - No duplication of experiment execution logic
  - CLI and UI stay in sync
  - Less code to maintain

### 3. **Server-Sent Events (SSE) for Streaming**
- Why not WebSockets?
  - Simpler (HTTP-based, no handshake)
  - Unidirectional (server → client) is all we need
  - Built-in reconnection in browsers
  - Less overhead

### 4. **Filesystem as Database**
- Run metadata stored in `artifacts/runs/*.json`
- Why not real DB?
  - Simpler setup (no PostgreSQL required)
  - Artifacts already on filesystem
  - Easier to inspect/debug
  - Good enough for single-user local dev

### 5. **Run Queue with Concurrency=1**
- Only one experiment runs at a time
- Why?
  - Prevents V8 resource contention
  - More accurate performance measurements
  - Simplifies implementation (no distributed locks)

---

## Security Considerations

### Input Validation
- **Whitelist experiment names**: Only allow names matching `experiments/*/` folders
- **Path traversal prevention**: Reject `..` in paths
- **Numeric bounds**: Validate `warmup` and `repeat` are reasonable

### Process Safety
- **Timeout enforcement**: Kill processes after 10 minutes
- **Resource limits**: Consider `ulimit` for spawned processes
- **No arbitrary code execution**: Only run scripts in `experiments/` directory

### API Security
- **CORS**: Only allow `localhost:3000` in dev
- **Rate limiting**: Max 10 runs per hour (prevent accidental DoS)
- **Helmet**: Set security headers (CSP, HSTS, etc.)

---

## Performance Characteristics

### Expected Load
- **Users**: 1 (local dev environment)
- **Concurrent runs**: 1 (enforced by queue)
- **API requests**: Low (<100/min)
- **SSE connections**: 1-2 active at a time

### Bottlenecks
- **Experiment execution**: Can take 10-120 seconds
- **Trace logs**: Can be 1-10 MB (needs streaming, not buffering)
- **CPU profiling**: Adds 20-50% overhead to experiments

### Optimizations
- **Docs caching**: Cache parsed docs in memory (invalidate on file change)
- **Static serving**: Use Express static middleware for artifacts
- **Next.js SSR**: Pre-render docs pages at build time

---

## Development Workflow

### Starting Development
```bash
# Terminal 1: Start everything
npm run dev

# Terminal 2: Run tests in watch mode
npm run test:watch

# Terminal 3: Monitor logs
tail -f server/logs/app.log
```

### Testing Changes
1. Edit code in `server/` or `frontend/`
2. Hot reload triggers automatically
3. Use browser DevTools + Network tab to debug API calls
4. Use `curl` to test API endpoints directly

### Debugging Experiments
1. Run experiment via CLI first:
   ```bash
   npm run exp -- --exp 01-hidden-classes --variant deopt --trace on
   ```
2. Verify artifacts are created in `artifacts/`
3. Then test via UI

---

## Deployment (Future)

### Option 1: Single Node Process
```
Node.js server
  ├── Serves Next.js static files (from frontend/out/)
  └── Runs Express API
```

### Option 2: Docker Compose
```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]

  backend:
    build: ./server
    ports: ["4000:4000"]
    volumes:
      - ./artifacts:/app/artifacts
      - ./experiments:/app/experiments:ro
```

### Option 3: Reverse Proxy (Recommended)
```
Caddy/NGINX (Port 80)
  ├── /         → frontend:3000
  └── /api/*    → backend:4000
```

---

## Monitoring & Observability

### Logs
- **Server**: Use `pino` or `winston` → `server/logs/app.log`
- **Frontend**: Next.js built-in logging
- **Experiments**: Already captured in `artifacts/*/stdout.log`

### Health Checks
- `GET /health` → `{status: "ok", uptime: 123, queueLength: 0}`
- Monitor queue length (alert if > 5)

### Metrics (Optional)
- Track run durations (histogram)
- Count runs by experiment (counter)
- Error rate (counter)
- Export to Prometheus/Grafana if needed

---

## FAQ

**Q: Why not a database?**
A: Filesystem is simpler for local dev. If multi-user support is needed later, migrate to SQLite or PostgreSQL.

**Q: Can multiple experiments run in parallel?**
A: Not in MVP (concurrency=1). Could be added later with worker pool.

**Q: How do I add a new experiment?**
A: Copy `experiments/_template/`, fill in files, restart server. API auto-discovers new folders.

**Q: Can I run this on a remote server?**
A: Yes, but add authentication (NextAuth.js + Express sessions) to prevent unauthorized runs.

**Q: What if an experiment hangs?**
A: RunService enforces 10-minute timeout, kills process, marks run as failed.

---

**Next**: See [EXECUTION_PLAN.md](./EXECUTION_PLAN.md) for step-by-step build instructions.
