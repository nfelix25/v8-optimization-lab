# Session Implementation Plan

## Goal
Implement a full-stack web UI for the V8 Optimization Lab that allows users to:
1. Browse documentation and experiments via web interface
2. Run experiments through the UI (instead of CLI only)
3. View live logs and results in real-time
4. Compare experiment results visually

## Architecture Overview
```
User Browser
    ↓
Next.js Frontend (localhost:3000)
    ↓ API calls
Express Backend (localhost:4000)
    ↓ spawns child process
Existing run-experiment.js script
    ↓ writes
artifacts/ directory
```

## Implementation Steps

### Step 1: Setup & Backend Foundation
**Deliverable**: Working Express API that can serve docs/experiments metadata and execute runs

Tasks:
- Create workspace structure (server/, frontend/, shared/)
- Build Express server with TypeScript
- Implement core endpoints:
  - GET /api/docs, /api/docs/:slug
  - GET /api/experiments, /api/experiments/:slug
  - POST /api/runs, GET /api/runs, GET /api/runs/:id
  - GET /api/runs/:id/stream (SSE)
- Create RunService to execute experiments and manage queue

### Step 2: Frontend Foundation
**Deliverable**: Next.js app with navigation and basic pages

Tasks:
- Create Next.js 14 app with App Router
- Setup Tailwind CSS and layout
- Configure API proxy to backend
- Create page structure (docs, experiments, runs)

### Step 3: Core Features
**Deliverable**: Users can browse docs/experiments and run them via UI

Tasks:
- Implement docs list and detail pages with Markdown rendering
- Implement experiments list and detail pages
- Create run form with options (variant, trace, profile, iterations)
- Build run detail page with live log streaming

### Step 4: Polish & Integration
**Deliverable**: Production-ready MVP

Tasks:
- Add dark/light mode
- Setup workspaces and concurrent dev script
- Add error handling and loading states
- Update README with setup instructions
- Test complete flow

## Key Technical Decisions

1. **Monorepo with npm workspaces** - Single repo, easy to manage
2. **Reuse existing run-experiment.js** - No duplication, stay in sync with CLI
3. **Server-Sent Events for streaming** - Simpler than WebSockets for unidirectional streaming
4. **Filesystem as database** - No PostgreSQL needed, artifacts already on disk
5. **Queue with concurrency=1** - Prevent resource contention during experiments

## Success Criteria

- ✅ Can browse all 20 experiments via web UI
- ✅ Can run any experiment with any variant through UI
- ✅ Live logs stream without page refresh
- ✅ Can view past runs and their artifacts
- ✅ Can compare baseline vs deopt performance
- ✅ Dark/light mode works
- ✅ Both CLI and web UI work (CLI not replaced, augmented)

## Non-Goals (Out of Scope)

- Authentication (local dev only)
- Multi-user support
- Distributed execution
- Database (filesystem is sufficient)
- Mobile app

## Implementation Order

1. **Backend first** - Get API working, test with curl
2. **Frontend pages** - Build UI to consume API
3. **Integration** - Connect everything with workspaces
4. **Polish** - UX improvements and docs

---

**Current Phase**: Pre-implementation
**Ready to start**: Yes
**Estimated time**: 3-4 hours for MVP
