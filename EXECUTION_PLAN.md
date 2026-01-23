# V8 Optimization Lab - Frontend Execution Plan

> **Objective**: Transform the CLI-based V8 learning lab into an interactive web application with Next.js 14 frontend and Express API backend.

## 📋 Quick Reference

- **Target Stack**: Next.js 14 (App Router), Express 4.19+, Node 22+, TypeScript
- **Architecture**: Monorepo structure with separate frontend/server packages
- **Scope**: Local learning UI with experiment orchestration, live output streaming, and artifact visualization

---

## Phase 0: Project Setup & Architecture (Day 1)

### 0.1 Environment & Tooling Decisions
**Goal**: Establish technical foundations before writing code

**Tasks**:
- [ ] Verify Node.js version (require >=20, recommend 22.9+)
  - Check: `node --version` and update `.nvmrc` if needed
- [ ] Choose package manager: **npm** (align with existing repo)
- [ ] Define workspace structure:
  ```
  /
  ├── frontend/          # Next.js 14 app
  ├── server/            # Express API
  ├── shared/            # Common types, utilities, schemas
  ├── experiments/       # (existing)
  ├── docs/              # (existing)
  ├── scripts/           # (existing - CLI tools)
  └── artifacts/         # (existing + new structured output)
  ```
- [ ] Update root `.gitignore` for:
  - `frontend/.next/`, `frontend/out/`
  - `server/dist/`, `server/.tsbuildinfo`
  - `node_modules/` in all workspaces
  - `artifacts/runs/*.json` (but keep directory)

**Deliverables**:
- Updated `package.json` with workspaces configuration
- `.nvmrc` file pinning Node version
- Updated `.gitignore`

---

## Phase 1: Express API Backend (Days 2-4)

### 1.1 Bootstrap Server (Day 2 Morning)
**Goal**: Get a basic TypeScript Express server running

**Tasks**:
- [ ] Create `server/` directory structure:
  ```
  server/
  ├── src/
  │   ├── index.ts           # Entry point
  │   ├── config.ts          # Environment config
  │   ├── routes/            # Route handlers
  │   └── services/          # Business logic
  ├── package.json
  ├── tsconfig.json
  └── .env.example
  ```
- [ ] Initialize `server/package.json` with dependencies:
  - Core: `express@^4.19.2`, `cors`, `helmet`, `morgan`
  - Utils: `zod@^3`, `execa@^8`, `dotenv`
  - Dev: `typescript`, `tsx`, `@types/express`, `@types/node`
- [ ] Configure `tsconfig.json` targeting Node 22 (ES2022, ESM modules)
- [ ] Create basic server with health check endpoint (`GET /health`)
- [ ] Add `npm run dev` script using `tsx watch`

**Test**: `curl http://localhost:4000/health` returns 200 OK

---

### 1.2 Core Data Endpoints (Day 2 Afternoon)
**Goal**: Serve static content (docs, experiments metadata)

**Tasks**:
- [ ] **Docs API**:
  - `GET /api/docs` - List all docs with metadata
    - Scan `docs/` directory
    - Parse frontmatter from Markdown files using `gray-matter`
    - Return: `{slug, title, description, path}`
  - `GET /api/docs/:slug` - Return full Markdown content + frontmatter
- [ ] **Experiments API**:
  - `GET /api/experiments` - List all experiments
    - Scan `experiments/*/` directories
    - Parse each `README.md` for metadata
    - Detect available variants (baseline.js, deopt.js, fixed.js)
    - Return: `{id, name, slug, description, variants[], tags[], difficulty}`
  - `GET /api/experiments/:slug` - Get single experiment details
    - Include README content, code snippets (optional preview)

**Test**: Use `curl` or Postman to verify JSON responses

---

### 1.3 Experiment Execution Engine (Day 3)
**Goal**: Orchestrate experiment runs via API

**Tasks**:
- [ ] Create `RunService` class to manage experiment execution
- [ ] Implement run queue (in-memory for MVP):
  - Queue structure: `{id, exp, variant, options, status, createdAt}`
  - Concurrency limit: 1 (avoid overlapping runs)
  - Status: `queued → running → completed | failed`
- [ ] **Run endpoint**:
  - `POST /api/runs` - Start new experiment run
    - Body: `{exp, variant, trace?, profile?, warmup?, repeat?}`
    - Validation: Zod schema
    - Response: `{runId, status: 'queued'}`
  - Execute via `execa` calling `node scripts/run-experiment.js`
  - Capture environment: Node version, V8 version, git commit SHA
  - Save run metadata to `artifacts/runs/<runId>.json`
- [ ] **Run status endpoints**:
  - `GET /api/runs` - List all runs (with filters: exp, status, date)
  - `GET /api/runs/:id` - Get single run details + metadata
  - `GET /api/runs/:id/artifacts` - List output files for run

**Schema for `artifacts/runs/<runId>.json`**:
```typescript
{
  id: string;              // UUID
  experiment: string;      // e.g., "01-hidden-classes"
  variant: string;         // "baseline" | "deopt" | "fixed"
  options: {
    trace: boolean;
    profile: boolean;
    warmup: number;
    repeat: number;
  };
  status: "queued" | "running" | "completed" | "failed";
  timestamps: {
    queued: string;
    started?: string;
    completed?: string;
  };
  environment: {
    nodeVersion: string;
    v8Version: string;
    gitSha?: string;
    platform: string;
  };
  results?: {
    exitCode: number;
    durationMs: number;
  };
  artifacts: {
    stdout?: string;       // Path relative to artifacts/
    stderr?: string;       // Path (trace log)
    cpuProfile?: string;   // Path
  };
}
```

**Test**: POST a run, verify it executes and saves metadata

---

### 1.4 Live Output Streaming (Day 4)
**Goal**: Stream experiment output in real-time

**Tasks**:
- [ ] Install `eventsource-parser` (for SSE)
- [ ] Implement `GET /api/runs/:id/stream` endpoint:
  - Use Server-Sent Events (SSE)
  - Stream stdout/stderr as experiment runs
  - Send status updates: `{type: 'status', data: 'running'}`
  - Send log chunks: `{type: 'log', data: '...'}`
  - Close stream on completion: `{type: 'complete', data: {...}}`
- [ ] Handle client disconnection gracefully

**Test**: Use `curl -N` or browser EventSource to verify streaming

---

### 1.5 Backend Testing & Hardening (Day 4 Evening)
**Goal**: Ensure reliability and security

**Tasks**:
- [ ] Input validation:
  - Whitelist experiment names (prevent path traversal)
  - Validate numeric inputs (warmup, repeat)
  - Sanitize file paths
- [ ] Error handling:
  - Wrap async routes with error middleware
  - Return consistent error format: `{error: string, details?: any}`
- [ ] Safety limits:
  - Max run timeout: 10 minutes (kill hung processes)
  - Max concurrent runs: 1
  - Rate limiting: 10 runs per hour (optional)
- [ ] Add integration tests:
  - Test experiment listing
  - Test run creation and execution
  - Mock filesystem for unit tests

**Test**: Try invalid inputs, verify graceful errors

---

## Phase 2: Next.js Frontend (Days 5-8)

### 2.1 Bootstrap Next.js App (Day 5 Morning)
**Goal**: Set up Next.js 14 with App Router and basic layout

**Tasks**:
- [ ] Create Next.js app:
  ```bash
  npx create-next-app@latest frontend \
    --typescript --eslint --app --tailwind --no-src-dir
  ```
- [ ] Configure `next.config.mjs`:
  - API proxy: rewrite `/api/*` → `http://localhost:4000/api/*` (dev mode)
  - Allow external images (if needed for docs)
- [ ] Set up root layout with navigation:
  - Top nav: Logo, theme toggle, GitHub link
  - Sidebar: Docs, Experiments, Runs, Glossary
  - Main content area
- [ ] Configure Tailwind with dark mode support
- [ ] Add shared components:
  - `<Card>`, `<Button>`, `<Badge>`, `<Skeleton>` (loading states)

**Test**: `npm run dev`, verify layout renders

---

### 2.2 Documentation Pages (Day 5 Afternoon)
**Goal**: Browse and view documentation

**Tasks**:
- [ ] **Docs List Page** (`/docs`)
  - Fetch `GET /api/docs` (React Server Component)
  - Display cards with title, description, tags
  - Search/filter by keyword
- [ ] **Doc Detail Page** (`/docs/[slug]`)
  - Fetch `GET /api/docs/:slug`
  - Render Markdown using `react-markdown` + `remark-gfm`
  - Syntax highlighting: `rehype-prism-plus`
  - Table of contents (extract headings)
  - Dark mode friendly code blocks
- [ ] **Glossary Page** (`/glossary`)
  - Parse `docs/06-glossary.md`
  - Add search/filter UI
  - Link terms to relevant docs

**Test**: Navigate docs, verify Markdown renders correctly

---

### 2.3 Experiments Explorer (Day 6)
**Goal**: Browse experiments and view details

**Tasks**:
- [ ] **Experiments List** (`/experiments`)
  - Fetch `GET /api/experiments`
  - Display experiment cards:
    - Title, difficulty badge, tags (polymorphism, GC, etc.)
    - Quick actions: "Run Baseline", "Run Deopt", "Run Fixed"
  - Filters: difficulty, tags, search by name
  - Sort: alphabetically, by difficulty
- [ ] **Experiment Detail** (`/experiments/[slug]`)
  - Display README.md content (rendered)
  - Show available variants (baseline, deopt, fixed)
  - Code preview (collapsible)
  - "Run Experiment" form with options:
    - Select variant (dropdown)
    - Toggle trace, profile
    - Set warmup, repeat iterations
    - "Run" button → POST to `/api/runs`

**Test**: Click through experiments, verify details load

---

### 2.4 Experiment Runner UI (Day 7)
**Goal**: Execute experiments and view live output

**Tasks**:
- [ ] **Run Form** (on experiment detail page):
  - Form state management (React Hook Form or simple useState)
  - Submit → POST `/api/runs`
  - On success, redirect to `/runs/:id` or show inline
- [ ] **Run Detail Page** (`/runs/[id]`)
  - Fetch `GET /api/runs/:id` for metadata
  - Status chip: Queued (gray), Running (blue), Completed (green), Failed (red)
  - **Live Log Panel**:
    - Subscribe to `/api/runs/:id/stream` via EventSource
    - Display logs in terminal-style component (with ANSI color support)
    - Auto-scroll to bottom
    - "Copy logs" button
  - **Results Section** (shown after completion):
    - Display exit code, duration
    - Link to artifacts: stdout.log, trace.log, CPU profile
    - Parse key metrics from logs (ops/sec, deopt count)
  - **Actions**:
    - "Re-run" button (same experiment + options)
    - "Download Artifacts" button (zip or individual files)

**Test**: Run experiment, verify live logs stream in real-time

---

### 2.5 Runs History & Comparison (Day 8)
**Goal**: View past runs and compare results

**Tasks**:
- [ ] **Runs List** (`/runs`)
  - Fetch `GET /api/runs`
  - Table with columns: Date, Experiment, Variant, Status, Duration
  - Filters: experiment, variant, status, date range
  - Pagination (client-side for MVP)
  - Click row → navigate to `/runs/:id`
- [ ] **Comparison View** (`/runs/compare?ids=...`)
  - Select multiple runs (checkboxes on list page)
  - Display side-by-side comparison:
    - Timing chart (bar chart: baseline vs deopt vs fixed)
    - Deopt count (if trace enabled)
    - Environment diff (Node version, options)
  - Use Chart.js or Recharts for visualization

**Test**: Compare baseline vs deopt runs, verify charts render

---

### 2.6 UX Polish (Day 8 Evening)
**Goal**: Improve user experience

**Tasks**:
- [ ] **Dark/Light Mode**:
  - Toggle in header
  - Persist preference in localStorage
  - Sync with Tailwind's `dark:` classes
- [ ] **Keyboard Shortcuts**:
  - `Cmd+K` / `Ctrl+K`: Command palette (search docs/experiments)
  - `/`: Focus search
  - `r`: Re-run last experiment
- [ ] **Copy CLI Command**:
  - On experiment detail page, show equivalent CLI command:
    ```bash
    npm run exp -- --exp 01-hidden-classes --variant deopt --trace on
    ```
  - "Copy" button
- [ ] **Loading States**:
  - Skeleton screens for initial load
  - Spinners for actions (run experiment)

**Test**: Try keyboard shortcuts, verify persistence

---

## Phase 3: Integration & Shared Code (Day 9)

### 3.1 Shared Package
**Goal**: Avoid code duplication between frontend/backend

**Tasks**:
- [ ] Create `shared/` directory:
  ```
  shared/
  ├── src/
  │   ├── types.ts        # Shared TypeScript types
  │   ├── schemas.ts      # Zod schemas (run options, metadata)
  │   └── utils.ts        # Common helpers
  ├── package.json
  └── tsconfig.json
  ```
- [ ] Export shared types:
  - `ExperimentMetadata`, `RunMetadata`, `RunOptions`, `RunStatus`
- [ ] Export Zod schemas for validation (used by both frontend & backend)
- [ ] Update `server/` and `frontend/` to import from `shared`

**Test**: Verify type safety across packages

---

### 3.2 Concurrently Dev Script
**Goal**: Run frontend + backend in parallel

**Tasks**:
- [ ] Install `concurrently` in root
- [ ] Add root `package.json` script:
  ```json
  {
    "scripts": {
      "dev": "concurrently \"npm run dev -w server\" \"npm run dev -w frontend\"",
      "build": "npm run build -w server && npm run build -w frontend"
    }
  }
  ```
- [ ] Document in root README:
  ```bash
  npm run dev     # Start both server (4000) and frontend (3000)
  ```

**Test**: `npm run dev`, verify both services start

---

### 3.3 Environment Configuration
**Goal**: Centralize configuration

**Tasks**:
- [ ] Create root `.env.example`:
  ```env
  # Server
  SERVER_PORT=4000
  NODE_ENV=development

  # Frontend
  NEXT_PUBLIC_API_URL=http://localhost:4000

  # Experiments
  ARTIFACTS_DIR=./artifacts
  MAX_RUN_TIMEOUT_MS=600000
  ```
- [ ] Load in `server/src/config.ts`
- [ ] Access in Next.js via `process.env.NEXT_PUBLIC_API_URL`

**Test**: Change port in `.env`, verify services use new port

---

## Phase 4: Testing & Documentation (Day 10)

### 4.1 End-to-End Tests
**Goal**: Ensure critical flows work

**Tasks**:
- [ ] Install Playwright
- [ ] Write E2E tests:
  - Navigate to experiments page
  - Select experiment, fill run form, submit
  - Verify run detail page shows logs
  - Verify artifacts are downloadable
- [ ] Add to CI (GitHub Actions)

**Test**: `npm run test:e2e`

---

### 4.2 Update Documentation
**Goal**: Onboard new contributors

**Tasks**:
- [ ] Update root `README.md`:
  - Add "Web UI" section with screenshots
  - Document setup: `npm install && npm run dev`
  - Link to API docs
- [ ] Create `frontend/README.md` with architecture overview
- [ ] Create `server/README.md` with API reference
- [ ] Add troubleshooting section

**Deliverable**: Clear setup instructions

---

### 4.3 Demo Data Script
**Goal**: Quickly populate UI for demos

**Tasks**:
- [ ] Create `scripts/generate-demo-data.js`:
  - Run 5-10 experiments programmatically
  - Seed `artifacts/runs/` with sample data
  - Include mix of statuses (completed, failed)
- [ ] Add `npm run demo:seed` script

**Test**: Fresh clone, run `npm run demo:seed`, verify UI shows data

---

## Phase 5: Stretch Goals (Optional)

### 5.1 Advanced Features
- [ ] **Authentication** (if multi-user):
  - GitHub OAuth via NextAuth.js
  - Protect API with session cookies
- [ ] **Shareable Run Links**:
  - Generate permalink for runs: `/share/:shareId`
  - Store in separate table (or JSON file)
- [ ] **Experiment Playground**:
  - Monaco editor to edit code inline
  - "Run Custom Code" button
  - Save custom experiments to browser localStorage

### 5.2 Production Readiness
- [ ] **Containerization**:
  - Multi-stage Dockerfile for frontend + backend
  - Docker Compose for local dev
- [ ] **Reverse Proxy**:
  - Use Caddy/NGINX to serve both apps on single port
- [ ] **Offline Mode**:
  - Bundle docs into frontend at build time (no API calls needed)
  - Fallback when server is down

---

## 🚀 MVP Checklist (Days 1-10)

By end of Day 10, you should have:

- [x] Working Next.js frontend (localhost:3000)
- [x] Working Express API (localhost:4000)
- [x] Ability to browse docs and experiments
- [x] Ability to run experiments via UI
- [x] Live log streaming
- [x] Runs history with comparison
- [x] Dark/light mode
- [x] Basic E2E tests
- [x] Updated documentation

---

## 📊 Success Metrics

**Functional**:
- User can discover all 20 experiments via UI
- User can run any experiment with any variant
- User can see live logs without refreshing
- User can compare baseline vs deopt performance

**Non-functional**:
- Page load time < 2s (Next.js with SSR)
- Log streaming latency < 500ms
- No experiment runs fail due to concurrency issues
- Mobile-responsive layout

---

## 🛠 Development Commands (Quick Reference)

```bash
# Root (monorepo)
npm run dev                # Start frontend + backend
npm run build              # Build all packages
npm run demo:seed          # Generate demo data

# Server (cd server/)
npm run dev                # Start Express (watch mode)
npm run build              # Compile TypeScript
npm run test               # Run unit tests

# Frontend (cd frontend/)
npm run dev                # Start Next.js dev server
npm run build              # Build for production
npm run test:e2e           # Run Playwright tests
```

---

## 🔗 Key Dependencies

**Backend**:
- `express` - Web framework
- `zod` - Schema validation
- `execa` - Process execution
- `eventsource` - SSE streaming

**Frontend**:
- `next` - React framework
- `react-markdown` - Markdown rendering
- `rehype-prism-plus` - Syntax highlighting
- `recharts` - Data visualization
- `tailwindcss` - Styling

**Shared**:
- `typescript` - Type safety
- `zod` - Shared schemas

---

## ❓ Open Decisions (from TODO.md)

**1. Should Express live in this repo or be standalone?**
- **Recommendation**: Keep in this repo as a workspace. Easier for learners to clone once.

**2. Is Dockerization desired?**
- **Recommendation**: Phase 5 (optional). Not needed for MVP since target is local dev.

**3. Offline mode requirement?**
- **Recommendation**: Phase 5 (optional). Nice-to-have but not critical for initial launch.

---

## 📅 Timeline Summary

| Phase | Days | Deliverable |
|-------|------|-------------|
| 0 | 1 | Project structure, tooling |
| 1 | 2-4 | Express API with run orchestration |
| 2 | 5-8 | Next.js frontend with all pages |
| 3 | 9 | Integration, shared code, dev scripts |
| 4 | 10 | Testing, docs, demo data |
| **Total** | **10 days** | **MVP ready** |

---

**Next Step**: Start with Phase 0 to establish foundations, then iterate through each phase sequentially.
