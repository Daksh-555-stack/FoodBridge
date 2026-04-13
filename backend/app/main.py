import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import (
    auth_router, donations_router, drivers_router,
    shelters_router, matches_router, routes_router, admin_router,
)
from app.websocket import websocket_endpoint, manager
from app.redis_client import redis_client
from app.background import background_expiry_checker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 FoodBridge AI Backend starting...")

    # Start Redis pub/sub listener
    redis_task = asyncio.create_task(manager.start_redis_listener(redis_client))
    # Start background expiry checker
    bg_task = asyncio.create_task(background_expiry_checker())

    yield

    # Shutdown
    redis_task.cancel()
    bg_task.cancel()
    logger.info("🛑 FoodBridge AI Backend shutting down...")


app = FastAPI(
    title="FoodBridge AI",
    description="Real-time food rescue logistics platform powered by AI matching",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST API routes
app.include_router(auth_router)
app.include_router(donations_router)
app.include_router(drivers_router)
app.include_router(shelters_router)
app.include_router(matches_router)
app.include_router(routes_router)
app.include_router(admin_router)

# WebSocket endpoint
app.websocket("/ws/{user_id}")(websocket_endpoint)


@app.get("/")
async def root():
    return {
        "name": "FoodBridge AI",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
