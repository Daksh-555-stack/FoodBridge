import json
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.donation import Donation, DonationStatus
from app.schemas import DonationCreate, DonationOut, DonationStatusUpdate
from app.redis_client import redis_client
import httpx
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/donations", tags=["Donations"])


async def trigger_ai_match(donation_id: int):
    """Call AI engine to find optimal match for this donation."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.AI_ENGINE_URL}/match",
                json={"donation_id": donation_id},
            )
            if resp.status_code == 200:
                result = resp.json()
                logger.info(f"AI match result for donation {donation_id}: {result}")
                # Publish WebSocket event
                redis_client.publish("new_match", json.dumps({
                    "event": "new_match",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "payload": result,
                }))
            else:
                logger.warning(f"AI match returned {resp.status_code} for donation {donation_id}")
    except Exception as e:
        logger.error(f"AI match failed for donation {donation_id}: {e}")


@router.post("", response_model=DonationOut)
async def create_donation(
    req: DonationCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Enforce expiry rule: must be > current time + 30 min
    min_expiry = datetime.utcnow() + timedelta(minutes=30)
    if req.expiry_datetime <= min_expiry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Expiry must be at least 30 minutes from now",
                "code": "EXPIRY_TOO_SOON",
                "detail": {"min_expiry": min_expiry.isoformat()},
            },
        )

    donation = Donation(
        donor_id=current_user.id,
        food_type=req.food_type,
        quantity_kg=req.quantity_kg,
        expiry_datetime=req.expiry_datetime,
        pickup_lat=req.pickup_lat,
        pickup_lng=req.pickup_lng,
        status=DonationStatus.pending,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    # Trigger AI matching in background
    background_tasks.add_task(trigger_ai_match, donation.id)

    return donation


@router.get("", response_model=list[DonationOut])
async def list_donations(
    status_filter: str = None,
    donor_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Donation)
    if status_filter:
        query = query.filter(Donation.status == status_filter)
    if donor_id:
        query = query.filter(Donation.donor_id == donor_id)
    return query.order_by(Donation.created_at.desc()).all()


@router.get("/{donation_id}", response_model=DonationOut)
async def get_donation(
    donation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Donation not found", "code": "NOT_FOUND", "detail": {}},
        )
    return donation


@router.patch("/{donation_id}/status", response_model=DonationOut)
async def update_donation_status(
    donation_id: int,
    req: DonationStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Donation not found", "code": "NOT_FOUND", "detail": {}},
        )
    donation.status = DonationStatus(req.status)
    db.commit()
    db.refresh(donation)
    return donation
