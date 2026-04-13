import json
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.match import Match
from app.models.donation import Donation, DonationStatus
from app.schemas import MatchOut
from app.redis_client import redis_client
import httpx
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/matches", tags=["Matches"])


async def trigger_matching_for_pending(db: Session):
    """Re-match all pending donations."""
    pending = db.query(Donation).filter(Donation.status == DonationStatus.pending).all()
    async with httpx.AsyncClient(timeout=30.0) as client:
        for donation in pending:
            try:
                resp = await client.post(
                    f"{settings.AI_ENGINE_URL}/match",
                    json={"donation_id": donation.id},
                )
                if resp.status_code == 200:
                    result = resp.json()
                    if result.get("driver_id"):
                        redis_client.publish("new_match", json.dumps({
                            "event": "new_match",
                            "timestamp": datetime.utcnow().isoformat() + "Z",
                            "payload": result,
                        }))
            except Exception as e:
                logger.error(f"Re-match failed for donation {donation.id}: {e}")


@router.post("/trigger")
async def trigger_matching(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.value not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Only admin can trigger matching", "code": "FORBIDDEN", "detail": {}},
        )
    background_tasks.add_task(trigger_matching_for_pending, db)
    return {"message": "Matching triggered for all pending donations"}


@router.get("", response_model=list[MatchOut])
async def list_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Match).order_by(Match.matched_at.desc()).all()


@router.get("/{match_id}", response_model=MatchOut)
async def get_match(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Match not found", "code": "NOT_FOUND", "detail": {}},
        )
    return match
