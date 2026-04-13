#!/bin/bash
# ============================================================
#  FoodBridge AI — Stop All Services
# ============================================================

echo ""
echo "🛑 Stopping FoodBridge AI services..."

# Kill by saved PIDs
if [ -f /tmp/foodbridge_pids.txt ]; then
  read BACKEND_PID AI_PID FRONTEND_PID < /tmp/foodbridge_pids.txt
  kill $BACKEND_PID $AI_PID $FRONTEND_PID 2>/dev/null || true
  rm /tmp/foodbridge_pids.txt
fi

# Kill by port (fallback)
lsof -ti :8000 | xargs kill -9 2>/dev/null || true
lsof -ti :8001 | xargs kill -9 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || true

echo "✅ All services stopped."
echo ""
