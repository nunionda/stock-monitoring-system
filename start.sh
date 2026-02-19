#!/bin/bash

# Portfolio Suite Startup Script

echo "🚀 Starting Portfolio Suite Servers..."

# Auto-cleanup occupied ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $(jobs -p)
    exit
}

trap cleanup SIGINT SIGTERM

# 1. Start Backend Server (FastAPI)
echo "------------------------------------------------"
echo "📦 Starting Backend Server (FastAPI)..."
python3 -m uvicorn backend.main:app --reload --port 8000 &

# 2. Start Frontend Server (Next.js)
echo "🎨 Starting Frontend Server (Next.js)..."
cd frontend
npm run dev &
cd ..

# Display URLs
echo "------------------------------------------------"
echo "✅ Servers are starting up!"
echo ""
echo "🔗 Backend API (Swagger): http://localhost:8000/docs"
echo "🔗 Frontend Web App:      http://localhost:3000"
echo "------------------------------------------------"
echo "💡 Press Ctrl+C to stop all servers."

# Keep the script running
wait
