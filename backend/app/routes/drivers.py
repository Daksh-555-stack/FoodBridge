import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.driver import Driver
from app.schemas import DriverOut, LocationUpdate, AvailabilityUpdate
from app.redis_client import redis_client

router = APIRouter(prefix="/drivers", tags=["Drivers"])


@router.get("/available", response_model=list[DriverOut])
async def get_available_drivers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    drivers = db.query(Driver).filter(Driver.is_available == True).all()
    return drivers


@router.patch("/me/location", response_model=DriverOut)
async def update_location(
    req: LocationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    driver = db.query(Driver).filter(Driver.id == current_user.id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Driver profile not found", "code": "NOT_FOUND", "detail": {}},
        )
    driver.current_lat = req.lat
    driver.current_lng = req.lng
    driver.last_seen_at = datetime.utcnow()
    db.commit()
    db.refresh(driver)

    # Publish location update via Redis
    redis_client.publish("driver_location", json.dumps({
        "event": "driver_location",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "payload": {
            "driver_id": driver.id,
            "lat": req.lat,
            "lng": req.lng,
            "name": current_user.name,
        },
    }))

    return driver


@router.patch("/me/availability", response_model=DriverOut)
async def update_availability(
    req: AvailabilityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    driver = db.query(Driver).filter(Driver.id == current_user.id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Driver profile not found", "code": "NOT_FOUND", "detail": {}},
        )
    driver.is_available = req.is_available
    db.commit()
    db.refresh(driver)
    return driver
