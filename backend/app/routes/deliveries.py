import json
import logging
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
import httpx
from app.database import get_db
from app.auth.dependencies import ensure_approved, get_current_user, require_role
from app.models.user import User
from app.models.driver import Driver
from app.models.delivery import Delivery, DeliveryStatus
from app.models.food_claim import FoodClaim, ClaimStatus
from app.models.food_listing import FoodListing, ListingStatus
from app.schemas import DeliveryCreate, DeliveryOut, LocationUpdate, DriverOut
from app.redis_client import redis_client
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/deliveries", tags=["Deliveries"])


@router.post("", response_model=DeliveryOut)
async def accept_delivery(
    req: DeliveryCreate,
    current_user: User = Depends(require_role(["driver", "admin"])),
    db: Session = Depends(get_db),
):
    """Driver accepts a claim for delivery."""
    ensure_approved(current_user)

    # Find driver profile
    driver = db.query(Driver).filter(Driver.user_id == current_user.id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": True, "message": "Driver profile not found", "code": "NOT_FOUND"},
        )

    # Redis distributed lock to prevent double booking
    lock_key = f"claim_lock:{req.claim_id}"
    acquired = redis_client.set(lock_key, str(driver.id), nx=True, ex=30)
    if not acquired:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": True, "message": "This delivery is already being accepted by another driver", "code": "DELIVERY_CONFLICT"},
        )

    try:
        # Load claim with listing
        claim = (
            db.query(FoodClaim)
            .options(joinedload(FoodClaim.listing))
            .filter(FoodClaim.id == req.claim_id)
            .first()
        )
        if not claim:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": True, "message": "Claim not found", "code": "NOT_FOUND"},
            )
        if claim.status != ClaimStatus.pending:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": True, "message": "Claim is no longer pending", "code": "DELIVERY_CONFLICT"},
            )

        listing = claim.listing
        if not listing or listing.expiry_time <= datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": True, "message": "Listing has expired", "code": "LISTING_EXPIRED"},
            )

        # Create delivery record
        delivery = Delivery(
            claim_id=claim.id,
            driver_id=driver.id,
            pickup_lat=listing.pickup_lat,
            pickup_lng=listing.pickup_lng,
            pickup_address=listing.pickup_address,
            dropoff_lat=claim.delivery_lat,
            dropoff_lng=claim.delivery_lng,
            dropoff_address=claim.delivery_address,
            status=DeliveryStatus.assigned,
        )

        # Fetch OSRM route
        try:
            osrm_url = (
                f"{settings.OSRM_URL}/route/v1/driving/"
                f"{listing.pickup_lng},{listing.pickup_lat};"
                f"{claim.delivery_lng},{claim.delivery_lat}"
                f"?overview=full&geometries=geojson&steps=true"
            )
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(osrm_url)
                if resp.status_code == 200:
                    route_data = resp.json()
                    if route_data.get("routes"):
                        route = route_data["routes"][0]
                        delivery.osrm_route = route.get("geometry")
                        delivery.distance_km = round(route.get("distance", 0) / 1000, 2)
                        delivery.duration_min = round(route.get("duration", 0) / 60, 1)
        except Exception as e:
            logger.warning(f"OSRM route fetch failed: {e}")

        db.add(delivery)

        # Update claim and driver status
        claim.status = ClaimStatus.driver_assigned
        driver.is_available = False

        db.commit()
        db.refresh(delivery)

        # WebSocket broadcast
        try:
            redis_client.publish("foodbridge_events", json.dumps({
                "event": "delivery_assigned",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "data": {
                    "delivery_id": str(delivery.id),
                    "claim_id": str(claim.id),
                    "driver_id": str(driver.id),
                    "shelter_user_id": str(claim.claimed_by),
                },
            }))
        except Exception as e:
            logger.warning(f"Failed to publish delivery_assigned event: {e}")

        # Reload with full relationships
        delivery = (
            db.query(Delivery)
            .options(
                joinedload(Delivery.claim).joinedload(FoodClaim.listing),
                joinedload(Delivery.claim).joinedload(FoodClaim.shelter),
                joinedload(Delivery.driver),
            )
            .filter(Delivery.id == delivery.id)
            .first()
        )
        return delivery

    finally:
        # Release Redis lock
        try:
            redis_client.delete(lock_key)
        except Exception:
            pass


@router.get("/mine", response_model=list[DeliveryOut])
async def my_deliveries(
    current_user: User = Depends(require_role(["driver", "admin"])),
    db: Session = Depends(get_db),
):
    """Driver's deliveries (active and recent)."""
    driver = db.query(Driver).filter(Driver.user_id == current_user.id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "message": "Driver profile not found", "code": "NOT_FOUND"},
        )
    deliveries = (
        db.query(Delivery)
        .options(
            joinedload(Delivery.claim).joinedload(FoodClaim.listing),
            joinedload(Delivery.claim).joinedload(FoodClaim.shelter),
            joinedload(Delivery.driver),
        )
        .filter(Delivery.driver_id == driver.id)
        .order_by(Delivery.assigned_at.desc())
        .all()
    )
    return deliveries


@router.patch("/{delivery_id}/pickup", response_model=DeliveryOut)
async def mark_picked_up(
    delivery_id: UUID,
    current_user: User = Depends(require_role(["driver", "admin"])),
    db: Session = Depends(get_db),
):
    """Driver marks food as picked up."""
    driver = db.query(Driver).filter(Driver.user_id == current_user.id).first()
    delivery = (
        db.query(Delivery)
        .options(
            joinedload(Delivery.claim).joinedload(FoodClaim.listing),
            joinedload(Delivery.driver),
        )
        .filter(Delivery.id == delivery_id)
        .first()
    )
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "message": "Delivery not found", "code": "NOT_FOUND"},
        )
    if driver and delivery.driver_id != driver.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": True, "message": "Not your delivery", "code": "INSUFFICIENT_PERMISSION"},
        )

    delivery.status = DeliveryStatus.picked_up
    delivery.picked_up_at = datetime.utcnow()

    # Update listing status
    if delivery.claim and delivery.claim.listing:
        delivery.claim.listing.status = ListingStatus.in_transit

    db.commit()
    db.refresh(delivery)

    # WebSocket broadcast
    try:
        redis_client.publish("foodbridge_events", json.dumps({
            "event": "food_picked_up",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "data": {
                "delivery_id": str(delivery.id),
                "claim_id": str(delivery.claim_id),
                "shelter_user_id": str(delivery.claim.claimed_by) if delivery.claim else None,
            },
        }))
    except Exception as e:
        logger.warning(f"Failed to publish food_picked_up event: {e}")

    return delivery


@router.patch("/{delivery_id}/deliver", response_model=DeliveryOut)
async def mark_delivered(
    delivery_id: UUID,
    current_user: User = Depends(require_role(["driver", "admin"])),
    db: Session = Depends(get_db),
):
    """Driver marks food as delivered."""
    driver = db.query(Driver).filter(Driver.user_id == current_user.id).first()
    delivery = (
        db.query(Delivery)
        .options(
            joinedload(Delivery.claim).joinedload(FoodClaim.listing),
            joinedload(Delivery.claim).joinedload(FoodClaim.shelter),
            joinedload(Delivery.driver),
        )
        .filter(Delivery.id == delivery_id)
        .first()
    )
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "message": "Delivery not found", "code": "NOT_FOUND"},
        )
    if driver and delivery.driver_id != driver.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": True, "message": "Not your delivery", "code": "INSUFFICIENT_PERMISSION"},
        )

    delivery.status = DeliveryStatus.delivered
    delivery.delivered_at = datetime.utcnow()

    # Update listing and claim
    if delivery.claim:
        delivery.claim.status = ClaimStatus.delivered
        if delivery.claim.listing:
            delivery.claim.listing.status = ListingStatus.delivered

    # Set driver available again
    if delivery.driver:
        delivery.driver.is_available = True

    db.commit()
    db.refresh(delivery)

    # WebSocket broadcast
    try:
        donor_id = str(delivery.claim.listing.donor_id) if delivery.claim and delivery.claim.listing else None
        shelter_user_id = str(delivery.claim.claimed_by) if delivery.claim else None
        redis_client.publish("foodbridge_events", json.dumps({
            "event": "food_delivered",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "data": {
                "delivery_id": str(delivery.id),
                "claim_id": str(delivery.claim_id),
                "donor_user_id": donor_id,
                "shelter_user_id": shelter_user_id,
            },
        }))
    except Exception as e:
        logger.warning(f"Failed to publish food_delivered event: {e}")

    return delivery


# ── Driver location update (mounted under /api/deliveries but is driver-specific) ──

@router.patch("/drivers/location", response_model=DriverOut)
async def update_driver_location(
    req: LocationUpdate,
    current_user: User = Depends(require_role(["driver", "admin"])),
    db: Session = Depends(get_db),
):
    """Driver updates GPS position."""
    driver = db.query(Driver).filter(Driver.user_id == current_user.id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "message": "Driver profile not found", "code": "NOT_FOUND"},
        )
    driver.current_lat = req.lat
    driver.current_lng = req.lng
    driver.last_location_update = datetime.utcnow()
    db.commit()
    db.refresh(driver)

    # WebSocket broadcast
    try:
        redis_client.publish("foodbridge_events", json.dumps({
            "event": "driver_location",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "data": {
                "driver_id": str(driver.id),
                "user_id": str(current_user.id),
                "lat": req.lat,
                "lng": req.lng,
                "name": current_user.name,
            },
        }))
    except Exception as e:
        logger.warning(f"Failed to publish driver_location event: {e}")

    return driver
