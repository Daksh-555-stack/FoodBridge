import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.route import Route
from app.models.match import Match
from app.models.delivery import Delivery
from app.models.driver import Driver
from app.models.shelter import Shelter
from app.models.donation import Donation, DonationStatus
from app.schemas import RouteOut, DeliveryOut
from app.redis_client import redis_client

router = APIRouter(prefix="/routes", tags=["Routes"])


@router.get("/{route_id}", response_model=RouteOut)
async def get_route(
    route_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Route not found", "code": "NOT_FOUND", "detail": {}},
        )
    return route


@router.post("/{route_id}/complete", response_model=DeliveryOut)
async def complete_route(
    route_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.value not in ["driver", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Only drivers can complete routes", "code": "FORBIDDEN", "detail": {}},
        )

    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Route not found", "code": "NOT_FOUND", "detail": {}},
        )

    match = db.query(Match).filter(Match.id == route.match_id).first()
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Match not found", "code": "NOT_FOUND", "detail": {}},
        )

    donation = db.query(Donation).filter(Donation.id == match.donation_id).first()

    # Set driver available again
    driver = db.query(Driver).filter(Driver.id == match.driver_id).first()
    if driver:
        driver.is_available = True

    # Update shelter load
    shelter = db.query(Shelter).filter(Shelter.id == match.shelter_id).first()
    if shelter and donation:
        shelter.current_load_kg += donation.quantity_kg

    # Update donation status
    if donation:
        donation.status = DonationStatus.delivered

    # Create delivery record
    delivery = Delivery(
        route_id=route_id,
        actual_delivered_at=datetime.utcnow(),
        quantity_received_kg=donation.quantity_kg if donation else 0,
        shelter_confirmed=True,
    )
    db.add(delivery)
    db.commit()
    db.refresh(delivery)

    # Publish delivery event
    redis_client.publish("delivery_done", json.dumps({
        "event": "delivery_done",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "payload": {
            "route_id": route_id,
            "match_id": match.id,
            "donation_id": match.donation_id,
            "driver_id": match.driver_id,
            "shelter_id": match.shelter_id,
            "quantity_kg": donation.quantity_kg if donation else 0,
        },
    }))

    return delivery
