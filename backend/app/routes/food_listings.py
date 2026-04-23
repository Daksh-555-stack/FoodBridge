import json
import logging
import traceback
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.auth.dependencies import require_role
from app.models.user import User
from app.models.food_listing import FoodListing, ListingStatus, FoodType
from app.models.restaurant import Restaurant, RestaurantStatus
from app.schemas import FoodListingCreate, FoodListingOut
from app.redis_client import redis_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/listings", tags=["Food Listings"])


def _enum_value(value):
    return value.value if hasattr(value, "value") else value


def _as_utc_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _listing_with_time(listing: FoodListing) -> dict:
    """Convert a listing to dict with time_remaining_minutes."""
    now = datetime.now(timezone.utc)
    expiry = _as_utc_aware(listing.expiry_time)
    remaining = (expiry - now).total_seconds() / 60 if expiry > now else 0
    return {
        "id": listing.id,
        "restaurant_id": listing.restaurant_id,
        "donor_id": listing.donor_id,
        "food_name": listing.food_name,
        "description": listing.description,
        "quantity_kg": listing.quantity_kg,
        "food_type": _enum_value(listing.food_type),
        "expiry_time": listing.expiry_time,
        "pickup_lat": listing.pickup_lat,
        "pickup_lng": listing.pickup_lng,
        "pickup_address": listing.pickup_address,
        "status": _enum_value(listing.status),
        "created_at": listing.created_at,
        "time_remaining_minutes": round(remaining, 1),
        "restaurant": listing.restaurant,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_food_listing(
    req: FoodListingCreate,
    current_user: User = Depends(require_role(["donor", "admin"])),
    db: Session = Depends(get_db),
):
    """Donor creates a food listing."""
    try:
        if not current_user.is_approved:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is pending admin approval",
            )

        restaurant = db.query(Restaurant).filter(Restaurant.id == req.restaurant_id).first()

        if not restaurant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Restaurant not found: {req.restaurant_id}",
            )

        if str(restaurant.owner_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This restaurant does not belong to you",
            )

        restaurant_status = _enum_value(restaurant.status)
        if restaurant_status != RestaurantStatus.approved.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Restaurant status is '{restaurant_status}'. Must be approved.",
            )

        now = datetime.now(timezone.utc)
        expiry = _as_utc_aware(req.expiry_time)
        diff_minutes = (expiry - now).total_seconds() / 60
        if diff_minutes < 30:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Expiry must be at least 30 minutes from now. Got {int(diff_minutes)} minutes.",
            )

        new_listing = FoodListing(
            donor_id=current_user.id,
            restaurant_id=req.restaurant_id,
            food_name=req.food_name,
            description=req.description or "",
            quantity_kg=req.quantity_kg,
            food_type=req.food_type,
            expiry_time=expiry,
            pickup_lat=req.pickup_lat,
            pickup_lng=req.pickup_lng,
            pickup_address=req.pickup_address or "",
            status=ListingStatus.available.value,
        )
        db.add(new_listing)
        db.commit()
        db.refresh(new_listing)

        try:
            redis_client.publish("foodbridge_events", json.dumps({
                "event": "new_listing",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "data": {
                    "listing_id": str(new_listing.id),
                    "food_name": new_listing.food_name,
                    "quantity_kg": new_listing.quantity_kg,
                    "pickup_lat": new_listing.pickup_lat,
                    "pickup_lng": new_listing.pickup_lng,
                },
            }))
        except Exception as e:
            logger.warning(f"Failed to publish new_listing event: {e}")

        return {
            "id": str(new_listing.id),
            "food_name": new_listing.food_name,
            "quantity_kg": new_listing.quantity_kg,
            "status": _enum_value(new_listing.status),
            "message": "Food listed successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.get("", response_model=list[FoodListingOut])
async def list_listings(
    status_filter: str = "available",
    city: str = None,
    db: Session = Depends(get_db),
):
    """Public list of available food listings."""
    query = db.query(FoodListing).options(joinedload(FoodListing.restaurant))

    if status_filter:
        try:
            st = ListingStatus(status_filter)
            query = query.filter(FoodListing.status == st)
        except ValueError:
            pass

    if city:
        query = query.join(Restaurant).filter(Restaurant.city == city)

    # Only show non-expired
    query = query.filter(FoodListing.expiry_time > datetime.utcnow())
    listings = query.order_by(FoodListing.created_at.desc()).all()
    return [_listing_with_time(l) for l in listings]


@router.get("/mine", response_model=list[FoodListingOut])
async def my_listings(
    current_user: User = Depends(require_role(["donor", "admin"])),
    db: Session = Depends(get_db),
):
    """Donor's own listings."""
    listings = (
        db.query(FoodListing)
        .options(joinedload(FoodListing.restaurant))
        .filter(FoodListing.donor_id == current_user.id)
        .order_by(FoodListing.created_at.desc())
        .all()
    )
    return [_listing_with_time(l) for l in listings]


@router.get("/{listing_id}", response_model=FoodListingOut)
async def get_listing(
    listing_id: UUID,
    db: Session = Depends(get_db),
):
    """Get a single listing."""
    listing = (
        db.query(FoodListing)
        .options(joinedload(FoodListing.restaurant))
        .filter(FoodListing.id == listing_id)
        .first()
    )
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "message": "Listing not found", "code": "NOT_FOUND"},
        )
    return _listing_with_time(listing)


@router.delete("/{listing_id}")
async def delete_listing(
    listing_id: UUID,
    current_user: User = Depends(require_role(["donor", "admin"])),
    db: Session = Depends(get_db),
):
    """Donor removes own listing."""
    listing = db.query(FoodListing).filter(FoodListing.id == listing_id).first()
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "message": "Listing not found", "code": "NOT_FOUND"},
        )
    if listing.donor_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": True, "message": "Not your listing", "code": "INSUFFICIENT_PERMISSION"},
        )
    db.delete(listing)
    db.commit()
    return {"message": "Listing deleted"}
