import json
import logging
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.auth.dependencies import ensure_approved, get_current_user, require_role
from app.models.user import User
from app.models.food_listing import FoodListing, ListingStatus
from app.models.food_claim import FoodClaim, ClaimStatus
from app.models.shelter import Shelter, ShelterStatus
from app.schemas import FoodClaimCreate, FoodClaimOut
from app.redis_client import redis_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/claims", tags=["Claims"])


@router.post("", response_model=FoodClaimOut)
async def create_claim(
    req: FoodClaimCreate,
    current_user: User = Depends(require_role(["shelter", "admin"])),
    db: Session = Depends(get_db),
):
    """Shelter claims a food listing."""
    ensure_approved(current_user)

    # Validate delivery coordinates
    if not req.delivery_lat or not req.delivery_lng:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": True, "message": "delivery_lat and delivery_lng are required", "code": "LOCATION_REQUIRED"},
        )

    # Get the listing
    listing = db.query(FoodListing).filter(FoodListing.id == req.listing_id).first()
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "message": "Listing not found", "code": "NOT_FOUND"},
        )

    if listing.status != ListingStatus.available:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": True, "message": "This listing is already claimed or unavailable", "code": "LISTING_ALREADY_CLAIMED"},
        )

    if listing.expiry_time <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": True, "message": "This listing has expired", "code": "LISTING_EXPIRED"},
        )

    # Find shelter for this user
    shelter = db.query(Shelter).filter(Shelter.manager_id == current_user.id).first()
    if not shelter:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": True, "message": "You must register a shelter first", "code": "NOT_APPROVED"},
        )
    if shelter.status != ShelterStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": True, "message": "Your shelter is not yet approved", "code": "NOT_APPROVED"},
        )

    # Create claim
    claim = FoodClaim(
        listing_id=listing.id,
        shelter_id=shelter.id,
        claimed_by=current_user.id,
        delivery_lat=req.delivery_lat,
        delivery_lng=req.delivery_lng,
        delivery_address=req.delivery_address,
        status=ClaimStatus.pending,
    )
    db.add(claim)

    # Update listing status
    listing.status = ListingStatus.claimed
    db.commit()
    db.refresh(claim)

    # WebSocket broadcast to drivers
    try:
        redis_client.publish("foodbridge_events", json.dumps({
            "event": "new_claim",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "data": {
                "claim_id": str(claim.id),
                "listing_id": str(listing.id),
                "food_name": listing.food_name,
                "quantity_kg": listing.quantity_kg,
                "pickup_lat": listing.pickup_lat,
                "pickup_lng": listing.pickup_lng,
                "pickup_address": listing.pickup_address,
                "dropoff_lat": claim.delivery_lat,
                "dropoff_lng": claim.delivery_lng,
                "dropoff_address": claim.delivery_address,
            },
        }))
    except Exception as e:
        logger.warning(f"Failed to publish new_claim event: {e}")

    # Reload with relationships
    claim = (
        db.query(FoodClaim)
        .options(joinedload(FoodClaim.listing), joinedload(FoodClaim.shelter))
        .filter(FoodClaim.id == claim.id)
        .first()
    )
    return claim


@router.get("/available", response_model=list[FoodClaimOut])
async def available_claims(
    current_user: User = Depends(require_role(["driver", "admin"])),
    db: Session = Depends(get_db),
):
    """Driver sees all pending claims with unexpired listings."""
    claims = (
        db.query(FoodClaim)
        .options(joinedload(FoodClaim.listing), joinedload(FoodClaim.shelter))
        .filter(FoodClaim.status == ClaimStatus.pending)
        .join(FoodListing, FoodClaim.listing_id == FoodListing.id)
        .filter(FoodListing.expiry_time > datetime.utcnow())
        .order_by(FoodClaim.claimed_at.desc())
        .all()
    )
    return claims


@router.get("/mine", response_model=list[FoodClaimOut])
async def my_claims(
    current_user: User = Depends(require_role(["shelter", "admin"])),
    db: Session = Depends(get_db),
):
    """Shelter's own claims."""
    claims = (
        db.query(FoodClaim)
        .options(joinedload(FoodClaim.listing), joinedload(FoodClaim.shelter))
        .filter(FoodClaim.claimed_by == current_user.id)
        .order_by(FoodClaim.claimed_at.desc())
        .all()
    )
    return claims


@router.patch("/{claim_id}/cancel", response_model=FoodClaimOut)
async def cancel_claim(
    claim_id: UUID,
    current_user: User = Depends(require_role(["shelter", "admin"])),
    db: Session = Depends(get_db),
):
    """Shelter cancels a claim."""
    claim = (
        db.query(FoodClaim)
        .options(joinedload(FoodClaim.listing), joinedload(FoodClaim.shelter))
        .filter(FoodClaim.id == claim_id)
        .first()
    )
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "message": "Claim not found", "code": "NOT_FOUND"},
        )
    if claim.claimed_by != current_user.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": True, "message": "Not your claim", "code": "INSUFFICIENT_PERMISSION"},
        )
    if claim.status not in (ClaimStatus.pending, ClaimStatus.driver_assigned):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": True, "message": "Cannot cancel claim in current status", "code": "INVALID_STATE"},
        )

    claim.status = ClaimStatus.cancelled

    # Restore listing to available
    listing = db.query(FoodListing).filter(FoodListing.id == claim.listing_id).first()
    if listing:
        listing.status = ListingStatus.available

    db.commit()
    db.refresh(claim)
    return claim
