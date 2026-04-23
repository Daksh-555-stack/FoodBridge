#!/bin/bash
# ============================================================
#  FoodBridge AI — One-Command Startup Script
# ============================================================

set -e

PROJECT_DIR="$(pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
AI_ENGINE_DIR="$PROJECT_DIR/ai_engine"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo ""
echo "🍲 ============================================"
echo "   FoodBridge AI — Starting All Services"
echo "============================================"
echo ""

# ── Step 1: Start PostgreSQL + Redis ───────────────────────
echo "▶ Starting PostgreSQL & Redis..."
brew services start postgresql@15 2>/dev/null || true
brew services start redis 2>/dev/null || true
sleep 2
echo "✅ PostgreSQL & Redis started"

# ── Step 2: Kill anything on ports 8000, 8001, 3000 ────────
echo "▶ Freeing ports 3000, 8000, 8001..."
lsof -ti :8000 | xargs kill -9 2>/dev/null || true
lsof -ti :8001 | xargs kill -9 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
sleep 1

# ── Step 3: Start Backend ────────────────────────────────────
echo "▶ Starting Backend (FastAPI) on :8000..."
cd "$BACKEND_DIR"
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/foodbridge_backend.log 2>&1 &
BACKEND_PID=$!
deactivate
sleep 3

# Check backend started
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
  echo "✅ Backend running (PID $BACKEND_PID)"
else
  echo "⚠️  Backend may still be starting — check logs: tail -f /tmp/foodbridge_backend.log"
fi

# ── Step 4: Start AI Engine ──────────────────────────────────
echo "▶ Starting AI Engine on :8001..."
cd "$AI_ENGINE_DIR"
source venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8001 > /tmp/foodbridge_ai.log 2>&1 &
AI_PID=$!
deactivate
sleep 2
echo "✅ AI Engine running (PID $AI_PID)"

# ── Step 5: Start Frontend ───────────────────────────────────
echo "▶ Starting Frontend (Vite) on :3000..."
cd "$FRONTEND_DIR"
npx vite --host 0.0.0.0 --port 3000 > /tmp/foodbridge_frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 3
echo "✅ Frontend running (PID $FRONTEND_PID)"

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "🎉 ============================================"
echo "   All Services Running!"
echo "============================================"
echo ""
echo "   🌐 App          →  http://localhost:3000"
echo "   📡 Backend API  →  http://localhost:8000"
echo "   🧠 AI Engine    →  http://localhost:8001"
echo "   📚 API Docs     →  http://localhost:8000/docs"
echo ""
echo "   Demo Logins:"
echo "   Admin   →  admin@foodbridge.ai / foodbridge123"
echo "   Donor   →  manohar@foodbridge.ai / foodbridge123"
echo "   Driver  →  rajesh@foodbridge.ai / foodbridge123"
echo "   Shelter →  children@foodbridge.ai / foodbridge123"
echo ""
echo "   Logs:"
echo "   tail -f /tmp/foodbridge_backend.log"
echo "   tail -f /tmp/foodbridge_ai.log"
echo "   tail -f /tmp/foodbridge_frontend.log"
echo ""
echo "   To stop everything: bash '$PROJECT_DIR/stop.sh'"
echo ""

# Save PIDs for stop script
echo "$BACKEND_PID $AI_PID $FRONTEND_PID" > /tmp/foodbridge_pids.txt

# Open browser
sleep 2
open http://localhost:3000
