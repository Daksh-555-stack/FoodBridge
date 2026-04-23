import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.driver import Driver
from app.schemas import DriverCreate, DriverOut, DriverAvailabilityUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/drivers", tags=["Drivers"])


@router.post("/register", response_model=DriverOut)
async def register_driver(
    req: DriverCreate,
    current_user: User = Depends(require_role(["driver", "admin"])),
    db: Session = Depends(get_db),
):
    """Register a driver profile."""
    existing = db.query(Driver).filter(Driver.user_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": True, "message": "Driver profile already exists", "code": "ALREADY_EXISTS"},
        )

    driver = Driver(
        user_id=current_user.id,
        vehicle_type=req.vehicle_type,
        vehicle_number=req.vehicle_number,
        capacity_kg=req.capacity_kg,
        is_available=False,
    )
    db.add(driver)
    db.commit()
    db.refresh(driver)

    driver = (
        db.query(Driver)
        .options(joinedload(Driver.user))
        .filter(Driver.id == driver.id)
        .first()
    )
    return driver


@router.get("/me", response_model=DriverOut)
async def get_my_driver_profile(
    current_user: User = Depends(require_role(["driver", "admin"])),
    db: Session = Depends(get_db),
):
    """Get current driver's profile."""
    driver = (
        db.query(Driver)
        .options(joinedload(Driver.user))
        .filter(Driver.user_id == current_user.id)
        .first()
    )
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "message": "Driver profile not found. Please register first.", "code": "NOT_FOUND"},
        )
    return driver


@router.patch("/availability", response_model=DriverOut)
async def update_availability(
    req: DriverAvailabilityUpdate,
    current_user: User = Depends(require_role(["driver", "admin"])),
    db: Session = Depends(get_db),
):
    """Toggle driver availability on/off."""
    driver = db.query(Driver).filter(Driver.user_id == current_user.id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "message": "Driver profile not found", "code": "NOT_FOUND"},
        )
    driver.is_available = req.is_available
    db.commit()
    db.refresh(driver)
    return driver
