# Implementation Checklist - Current Session

This is the working checklist for implementing the frontend during the current coding session.

## Pre-Implementation Setup
- [ ] Verify Node.js version (>=20)
- [ ] Create workspace structure (frontend/, server/, shared/)
- [ ] Update .gitignore for new directories

## Phase 1: Express API Backend (Core)
### 1.1 Bootstrap Server
- [ ] Create server/package.json with dependencies
- [ ] Create server/tsconfig.json
- [ ] Create basic Express server with /health endpoint
- [ ] Test: curl http://localhost:4000/health

### 1.2 Docs API
- [ ] Implement GET /api/docs (list all docs)
- [ ] Implement GET /api/docs/:slug (single doc)
- [ ] Test: curl endpoints return JSON

### 1.3 Experiments API
- [ ] Implement GET /api/experiments (list all)
- [ ] Implement GET /api/experiments/:slug (single experiment)
- [ ] Parse README.md and detect variants
- [ ] Test: curl endpoints return experiment metadata

### 1.4 Run Execution Engine
- [ ] Create RunService with queue (concurrency=1)
- [ ] Implement POST /api/runs (create run)
- [ ] Implement GET /api/runs (list runs)
- [ ] Implement GET /api/runs/:id (single run)
- [ ] Execute experiments via execa calling run-experiment.js
- [ ] Save run metadata to artifacts/runs/<id>.json
- [ ] Test: POST run, verify execution and metadata saved

### 1.5 Live Streaming
- [ ] Implement GET /api/runs/:id/stream (SSE)
- [ ] Stream stdout/stderr in real-time
- [ ] Test: curl -N to verify streaming

## Phase 2: Next.js Frontend
### 2.1 Bootstrap App
- [ ] Create Next.js 14 app with TypeScript + Tailwind
- [ ] Configure API proxy in next.config.mjs
- [ ] Create root layout with navigation
- [ ] Test: npm run dev, verify layout renders

### 2.2 Documentation Pages
- [ ] Create /docs list page
- [ ] Create /docs/[slug] detail page with Markdown rendering
- [ ] Add syntax highlighting
- [ ] Test: Navigate docs, verify rendering

### 2.3 Experiments Pages
- [ ] Create /experiments list page with cards
- [ ] Create /experiments/[slug] detail page
- [ ] Add run form with options
- [ ] Test: Browse experiments

### 2.4 Run Pages
- [ ] Create /runs list page
- [ ] Create /runs/[id] detail page with live logs
- [ ] Implement EventSource for SSE
- [ ] Display run status and artifacts
- [ ] Test: Run experiment, see live output

### 2.5 UX Features
- [ ] Add dark/light mode toggle
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test: Toggle theme, verify persistence

## Phase 3: Integration
- [ ] Create shared/ package with types
- [ ] Update root package.json with workspaces
- [ ] Add npm run dev script (concurrently)
- [ ] Test: npm run dev starts both services

## Phase 4: Polish
- [ ] Update root README with web UI instructions
- [ ] Add .env.example
- [ ] Test full flow: browse → run → view results

---

## Current Status
**Phase**: Not started
**Blockers**: None
**Next Action**: Verify Node version and create workspace structure
