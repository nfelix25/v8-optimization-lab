#!/bin/bash

# Start both services
echo "Starting V8 Optimization Lab..."
echo ""

# Start backend in background
echo "[Backend] Starting Express server on port 4000..."
(cd server && npm run dev) &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 2

# Start frontend in background
echo "[Frontend] Starting Next.js on port 3000..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# Wait for Ctrl+C
echo ""
echo "✅ Both services started!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:4000"
echo ""
echo "Press Ctrl+C to stop both services"

# Trap Ctrl+C and kill both processes
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for both processes
wait
