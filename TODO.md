# Frontend & API Implementation Plan

> Target stack: Next.js 14 (App Router, React 18, Turbopack dev), Express 4.19+ (Node 22 runtime).
> Scope: Local learning UI for browsing docs, running experiments via existing scripts, and inspecting artifacts.

## Phase 0 – Foundations & Decisions
- [ ] Confirm Node LTS (>= 20, ideally 22.9+) for shared dev/prod parity and compatibility with Next 14 + latest Express.
- [ ] Decide package manager (npm vs pnpm). Default to npm to align with current repo unless team prefers pnpm.
- [ ] Define folder layout (e.g., `/frontend` for Next app, `/server` for Express API) and shared config (eslint/prettier/tsconfig base). Ensure `.gitignore` updated for `.next/`, `server/.tsbuildinfo`, etc.

## Phase 1 – Express API Service
1. **Bootstrap service**
   - [ ] Initialize `server/package.json` with TypeScript, ts-node-dev (or nodemon + ts-node), eslint.
   - [ ] Install dependencies: `express@^4.19.2`, `morgan`, `zod` (request validation), `execa` (safer child-process), `ws`/`eventsource` (for live log streaming), `cors` (during dev), `helmet` (basic hardening).
   - [ ] Configure tsconfig targeting Node 22 features (ES2022 modules). Use ESM or CJS consistently (recommend ESM for alignment with Next).

2. **Core endpoints**
   - [ ] `GET /api/docs`: list docs with metadata (title, slug, summary). Scan `docs/` dir lazily, cache results.
   - [ ] `GET /api/docs/:slug`: return Markdown + frontmatter. Reuse same Markdown parser as frontend (gray-matter).
   - [ ] `GET /api/experiments`: read `experiments/*/README.md`, baseline/deopt/fixed file names, tags inferred from folder names.
   - [ ] `GET /api/runs`: list run metadata stored in `artifacts/runs/*.json` (see Phase 3 for schema).
   - [ ] `POST /api/run`: accepts JSON {exp, variant, trace, profile, warmup, repeat}. Uses child_process to run `npm run exp -- --exp ...`. Stream stdout/stderr via Server-Sent Events (`/api/run/:id/stream`). Persist run metadata (status, timings, paths) on completion.
   - [ ] `GET /api/run/:id/log`: serve saved log file.
   - [ ] `GET /api/run/:id/artifacts`: list output files (summaries, traces, cpuprofile).

3. **Job orchestration**
   - [ ] Implement run queue to avoid overlapping `npm run exp` invocations. Use BullMQ or lightweight in-memory queue with concurrency=1.
   - [ ] Capture environment info (`process.version`, `process.versions.v8`, git commit) per run.
   - [ ] Enforce safety: sanitize inputs, limit runtime, kill hung processes.

4. **Testing & tooling**
   - [ ] Unit test endpoints with Vitest/Jest using mocked filesystem/process.
   - [ ] Integration smoke test hitting real scripts (guarded with `CI=true` flag).
   - [ ] Document .env (port, artifacts dir, allowed commands).

## Phase 2 – Next.js 14 Frontend
1. **Bootstrap app**
   - [ ] `npx create-next-app@latest frontend --ts --eslint --app --tailwind` (or CSS solution of choice).
   - [ ] Configure absolute imports, shared UI theme (Tailwind or CSS vars). Add layout with sidebar nav (Docs, Experiments, Runs, Glossary).
   - [ ] Add API proxy (`next.config.mjs` rewrites `/api/*` → Express during dev) or co-host via custom server later.

2. **Docs & glossary views**
   - [ ] Build docs list page fetching `/api/docs` (React Server Component for caching).
   - [ ] Detail page renders Markdown via `next-mdx-remote` or `react-markdown` with syntax highlighting.
   - [ ] Glossary search/filter UI, linking to doc anchors.

3. **Experiment explorer**
   - [ ] Experiments index showing cards with tags, difficulty, status.
   - [ ] Experiment detail view: display README.md, code snippets, quick actions (run baseline/deopt/fixed).

4. **Experiment runner UI**
   - [ ] Form for selecting variant, warmup, repeat, trace/profile toggles.
   - [ ] Live log panel subscribing to `/api/run/:id/stream` (SSE). Show status chips (queued, running, succeeded, failed).
   - [ ] On completion, link to artifacts downloads, highlight key metrics (duration, deopt reasons parser from log).

5. **Runs history + analysis**
   - [ ] Table of `GET /api/runs` with filters (experiment, date, status, trace on/off).
   - [ ] Detail view comparing baseline vs deopt runtimes, showing charts (e.g., line chart of durations).
   - [ ] Integrate existing `npm run summarize` output by parsing JSON/text and embedding charts.

6. **DX/UX polish**
   - [ ] Dark/light theme toggle stored in localStorage.
   - [ ] Keyboard shortcuts (e.g., `r` to rerun last experiment).
   - [ ] Add “copy CLI command” buttons for transparency.

## Phase 3 – Shared Infrastructure
- [ ] Define `/artifacts/runs/<timestamp>-<exp>-<variant>.json` schema: {id, exp, variant, options, status, timestamps, nodeVersion, v8Version, gitSha, logPath, artifactPaths, metrics}.
- [ ] Utility library (`packages/shared`) exporting Markdown helpers, experiment metadata parser, run-schema zod validators for both Express + Next.
- [ ] Logging: use `pino` or `winston` with consistent format; surface logs via `/api/health`.
- [ ] Container/dev scripts: `npm run dev` concurrently starts Express (port 4000) + Next (port 3000) with shared `.env`.
- [ ] Optional Dockerfile (multi-stage) bundling both apps behind a single Node process or using reverse proxy (Caddy/NGINX) for production-like testing.

## Phase 4 – QA & Documentation
- [ ] Write end-to-end tests (Playwright) covering doc browsing, experiment launch, log streaming, artifact download.
- [ ] Update root README with setup instructions, environment variables, and screenshots.
- [ ] Provide "demo data" script to generate sample runs for UI previews without heavy experiments.
- [ ] Accessibility pass (ARIA for live regions, focus traps for modals).
- [ ] Performance audit (`next build`, Lighthouse) to ensure assets stay lean.

## Phase 5 – Stretch Ideas
- [ ] Auth gating (GitHub OAuth) if multi-user scenarios arise.
- [ ] Shareable run links (deep-link artifacts via signed URLs).
- [ ] Notebook-like mode allowing Markdown + code cells referencing experiments.
- [ ] Plugin system so learners can add custom experiments without editing core repo.

---
**Open Questions**
1. Should the Express server live inside this repo or be a standalone package published to npm? (Assumed local-only for now.)
2. Is Dockerization desired for distribution, or is `npm install && npm run dev` sufficient?
3. Any requirement for offline mode (i.e., bundling docs to avoid API calls when Express is down)?
