"""
FoodBridge AI — AI Engine Service
Internal FastAPI service exposing matcher + router as REST endpoints.
"""
import os
import sys
import json
import logging
from dataclasses import asdict
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import redis as redis_lib

# Add paths so we can import backend models
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load from .env
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://dakshtulaskar@localhost:5432/foodbridge")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Import models from backend
from app.database import Base
from app.models import *  # noqa

redis_client = redis_lib.Redis.from_url(REDIS_URL, decode_responses=True)

app = FastAPI(title="FoodBridge AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class MatchRequest(BaseModel):
    donation_id: int


class RouteRequest(BaseModel):
    driver_id: int
    donation_ids: List[int]


@app.post("/match")
async def match_endpoint(req: MatchRequest):
    """Trigger AI matching for a donation."""
    from matcher import match_donation

    db = SessionLocal()
    try:
        result = match_donation(req.donation_id, db, redis_client)
        result_dict = asdict(result)
        logger.info(f"Match result for donation {req.donation_id}: {result_dict}")
        return result_dict
    except Exception as e:
        logger.error(f"Match error: {e}", exc_info=True)
        return {"error": str(e), "donation_id": req.donation_id}
    finally:
        db.close()


@app.post("/route")
async def route_endpoint(req: RouteRequest):
    """Optimize route for a driver with multiple donations."""
    from router import optimize_route

    db = SessionLocal()
    try:
        result = optimize_route(req.driver_id, req.donation_ids, db)
        result_dict = {
            "ordered_stops": [asdict(s) for s in result.ordered_stops],
            "total_distance_km": result.total_distance_km,
            "total_duration_min": result.total_duration_min,
            "polyline_coords": result.polyline_coords,
            "improvement_pct": result.improvement_pct,
        }

        redis_client.publish("route_updated", json.dumps({
            "event": "route_updated",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "payload": {
                "driver_id": req.driver_id,
                "polyline_coords": result.polyline_coords,
                "total_distance_km": result.total_distance_km,
                "total_duration_min": result.total_duration_min,
            },
        }))

        return result_dict
    except Exception as e:
        logger.error(f"Route error: {e}", exc_info=True)
        return {"error": str(e)}
    finally:
        db.close()


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai_engine"}
