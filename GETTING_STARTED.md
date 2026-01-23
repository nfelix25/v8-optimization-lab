# Getting Started with the V8 Optimization Lab Web UI

## ✅ What's Been Built

A full-stack web application with:

### Backend (Express API)
- ✅ REST API serving docs and experiments metadata
- ✅ Run execution engine with queue management
- ✅ Live log streaming via Server-Sent Events
- ✅ Run history and artifacts management

### Frontend (Next.js 14)
- ✅ Documentation browser with Markdown rendering and syntax highlighting
- ✅ Experiments explorer with 20 interactive experiments
- ✅ Run form with all options (variant, trace, profile, iterations)
- ✅ Live log viewer with real-time streaming
- ✅ Run history page with results comparison
- ✅ Dark/light mode support

## 🚀 Quick Start

### 1. Install Dependencies

From the **root directory**:

```bash
npm install
```

This installs dependencies for the root workspace and both the server and frontend.

### 2. Start the Development Servers

**Option A: Using the dev script (recommended)**

From the **root directory**:

```bash
./dev.sh
```

**Option B: Run services separately**

Terminal 1 (Backend):
```bash
cd server
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health

## 📖 Using the Web UI

### Browse Documentation
1. Go to http://localhost:3000/docs
2. Click any document to view with full Markdown rendering
3. Code blocks have syntax highlighting

### Run Experiments
1. Go to http://localhost:3000/experiments
2. Browse the 20 available experiments
3. Click any experiment to see details
4. Use the form on the right to:
   - Select variant (baseline, deopt, fixed)
   - Toggle trace and CPU profiling
   - Adjust warmup and repeat iterations
5. Click "Run Experiment"
6. View live logs as the experiment executes
7. See results and download artifacts when complete

### View Run History
1. Go to http://localhost:3000/runs
2. See all past experiment runs
3. Click any run to view detailed results
4. Compare performance metrics

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │
│  (port 3000)│
└──────┬──────┘
       │ HTTP + SSE
       ▼
┌─────────────┐
│  Next.js    │
│  Frontend   │
└──────┬──────┘
       │ API calls to /api/*
       ▼
┌─────────────┐
│   Express   │
│   Backend   │
│  (port 4000)│
└──────┬──────┘
       │ spawns
       ▼
┌─────────────┐
│ Experiment  │
│   Scripts   │
│ (run-exper  │
│  iment.js)  │
└──────┬──────┘
       │ writes
       ▼
┌─────────────┐
│  artifacts/ │
│   directory │
└─────────────┘
```

## 📁 Project Structure

```
/
├── server/              # Express API backend
│   ├── src/
│   │   ├── routes/     # API endpoints
│   │   └── services/   # Business logic
│   └── package.json
├── frontend/            # Next.js web interface
│   ├── app/            # Pages (docs, experiments, runs)
│   ├── components/     # React components (RunForm, LiveLogViewer)
│   └── package.json
├── scripts/             # Experiment runner (used by CLI and API)
├── experiments/         # 20 experiment directories
├── docs/                # Documentation files
└── artifacts/           # Generated results
    └── runs/           # Run metadata JSON files
```

## 🔧 Development Tips

### Testing the API Directly

```bash
# List docs
curl http://localhost:4000/api/docs

# List experiments
curl http://localhost:4000/api/experiments

# Create a run
curl -X POST http://localhost:4000/api/runs \
  -H "Content-Type: application/json" \
  -d '{"exp":"01-hidden-classes","variant":"baseline","trace":true,"warmup":1000,"repeat":100000}'

# List runs
curl http://localhost:4000/api/runs

# Stream live logs (Server-Sent Events)
curl -N http://localhost:4000/api/runs/{runId}/stream
```

### Hot Reload

Both services support hot reload:
- **Backend**: Changes to `server/src/**/*.ts` automatically reload
- **Frontend**: Changes to `frontend/**/*.tsx` automatically refresh the browser

### Stopping the Services

If you used `./dev.sh`, press `Ctrl+C` once to stop both services.

If running separately, press `Ctrl+C` in each terminal.

## 🎯 Next Steps

1. **Explore the UI**: Browse documentation and run your first experiment
2. **Compare CLI vs Web**: Try running the same experiment via CLI and web UI
3. **Customize**: Adjust the frontend styling or add new features
4. **Learn**: Work through the experiments in the recommended order

## 🐛 Troubleshooting

### Port Already in Use

If you see "port already in use" errors:

```bash
# Kill processes on port 3000
lsof -ti:3000 | xargs kill

# Kill processes on port 4000
lsof -ti:4000 | xargs kill
```

### Dependencies Not Installed

Make sure you ran `npm install` from the **root directory**, not from `server/` or `frontend/`.

### Frontend Not Loading

1. Check that both services are running
2. Verify backend is responding: `curl http://localhost:4000/health`
3. Check for errors in the terminal running the frontend

### Experiments Not Running

1. Ensure the backend can execute scripts
2. Check `artifacts/runs/` directory exists and is writable
3. Look for errors in the backend logs

## 📚 Additional Resources

- [Architecture Details](./ARCHITECTURE.md)
- [Implementation Plan](./EXECUTION_PLAN.md)
- [Original TODO](./TODO.md)
- [Main README](./README.md)

## ✨ Features Implemented

- [x] Express API backend with TypeScript
- [x] Next.js 14 frontend with App Router
- [x] Documentation browser with Markdown + syntax highlighting
- [x] Experiments explorer with 20 experiments
- [x] Interactive run form with all options
- [x] Live log streaming via Server-Sent Events
- [x] Run history and artifact management
- [x] Dark/light mode support
- [x] Workspace integration with concurrent dev script
- [x] Full type safety across frontend and backend

## 🎉 Ready to Learn!

You now have a fully functional web interface for exploring V8 optimization. Start by browsing the documentation or running your first experiment!
