# 🍲 FoodBridge AI

> Real-time food rescue logistics platform connecting surplus food donors with shelters through AI-powered matching and optimized routing.

**Problem**: Local food businesses discard tons of surplus edible food daily at closing time while nearby shelters face critical food shortages. The barrier is not scarcity but logistics inefficiency.

**Solution**: FoodBridge AI uses the Hungarian Algorithm for optimal donor-driver-shelter matching and TSP + 2-opt for route optimization, all coordinated in real-time via WebSocket.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      Docker Compose                            │
│                                                                │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐                 │
│   │ Frontend │   │ Backend  │   │AI Engine │                 │
│   │ React+TW │◄─►│ FastAPI  │◄─►│ Matcher  │                 │
│   │ :3000    │   │ :8000    │   │ Router   │                 │
│   │          │   │          │   │ :8001    │                 │
│   └────┬─────┘   └────┬─────┘   └──────────┘                 │
│        │     WS       │                                        │
│        └──────────────┤         ┌──────────┐  ┌──────────┐   │
│                       └────────►│ Postgres │  │  Redis   │   │
│                                 │ :5432    │  │ :6379    │   │
│                                 └──────────┘  └──────────┘   │
└────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- No other dependencies needed!

### Setup

```bash
# 1. Clone and enter directory
cd "FoodBridge AI"

# 2. Copy environment file
cp .env.example .env

# 3. Start all services (one command!)
docker-compose up --build

# 4. Open in browser
open http://localhost:3000
```

### Demo Credentials

| Role    | Email                      | Password       |
|---------|----------------------------|----------------|
| Admin   | admin@foodbridge.ai        | foodbridge123  |
| Donor   | manohar@foodbridge.ai      | foodbridge123  |
| Driver  | rajesh@foodbridge.ai       | foodbridge123  |
| Shelter | children@foodbridge.ai     | foodbridge123  |

---

## 🧠 How AI Matching Works

### Hungarian Algorithm (Bipartite Matching)

1. **Build graph**: Available drivers (within 10km) × eligible shelters (with capacity)
2. **Cost matrix** with 4 weighted factors:
   - `w1=0.4` — Pickup distance (driver → donor)
   - `w2=0.3` — Delivery distance (donor → shelter)
   - `w3=0.2` — Expiry urgency penalty (exponential near expiry)
   - `w4=0.1` — Capacity mismatch (prefer tight vehicle fit)
3. **Solve** using `scipy.optimize.linear_sum_assignment`
4. **Validate** hard constraints (expiry, capacity)
5. **Confidence score** = 1 - (cost / max_possible_cost)

### Route Optimization (TSP + 2-opt)

1. **Nearest-neighbor** heuristic with precedence (pickup before dropoff)
2. **2-opt improvement** loop (max 500 iterations)
3. **ETA computation** per stop (30 km/h urban average or OSRM)
4. **Expiry validation** — removes violating donations from route

---

## 📡 Real-Time Layer

- **WebSocket** at `ws://localhost:8000/ws/{user_id}?token=JWT`
- **Redis Pub/Sub** channels: `new_match`, `route_updated`, `driver_location`, `delivery_done`, `expiry_alert`
- **No double booking** via Redis distributed locks (`SET key NX EX 10`)

---

## 🛣️ API Documentation

Once running, visit: **http://localhost:8000/docs** (Swagger UI)

### Key Endpoints

| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| POST   | /auth/register            | Create user account            |
| POST   | /auth/login               | Get JWT tokens                 |
| POST   | /donations                | Create surplus food listing    |
| GET    | /donations                | List donations (with filters)  |
| GET    | /drivers/available        | Available drivers + locations  |
| POST   | /matches/trigger          | Trigger AI matching (admin)    |
| GET    | /routes/{id}              | Get optimized route            |
| POST   | /routes/{id}/complete     | Mark delivery done             |
| GET    | /admin/metrics            | System KPIs                    |

---

## 🧪 Running Tests

```bash
# Backend tests
docker-compose exec backend pytest tests/ -v --cov=app

# AI Engine tests
docker-compose exec ai_engine pytest tests/ -v --cov=.
```

---

## 🗂️ Project Structure

```
FoodBridge AI/
├── docker-compose.yml          # Orchestrates all services
├── .env.example                # Environment variables
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/                # Database migrations
│   ├── app/
│   │   ├── main.py             # FastAPI app entry point
│   │   ├── config.py           # Settings from .env
│   │   ├── database.py         # SQLAlchemy engine
│   │   ├── redis_client.py     # Redis connection
│   │   ├── websocket.py        # WebSocket manager
│   │   ├── background.py       # Background tasks
│   │   ├── schemas.py          # Pydantic models
│   │   ├── auth/               # JWT + RBAC
│   │   ├── models/             # SQLAlchemy models (7)
│   │   └── routes/             # API endpoints (7 routers)
│   ├── scripts/seed.py         # Seed data
│   └── tests/
├── ai_engine/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app.py                  # FastAPI internal service
│   ├── matcher.py              # Hungarian Algorithm matching
│   ├── router.py               # TSP + 2-opt routing
│   └── tests/
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── api/axios.js        # Axios with JWT refresh
        ├── context/AppContext.jsx  # Global state (Context + useReducer)
        ├── hooks/useWebSocket.js   # WS with exponential backoff
        ├── components/         # Reusable UI components
        └── pages/              # 8 route pages
```

## 📄 License

MIT — Built with ❤️ to fight food waste.
