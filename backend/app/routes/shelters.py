import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.shelter import Shelter, ShelterStatus
from app.schemas import ShelterCreate, ShelterUpdate, ShelterOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/shelters", tags=["Shelters"])


@router.post("/register", response_model=ShelterOut)
async def register_shelter(
    req: ShelterCreate,
    current_user: User = Depends(require_role(["shelter", "admin"])),
    db: Session = Depends(get_db),
):
    """Shelter manager registers their shelter."""
    if not req.lat or not req.lng:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": True, "message": "lat and lng are required", "code": "LOCATION_REQUIRED"},
        )

    # Check if already registered
    existing = db.query(Shelter).filter(Shelter.manager_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": True, "message": "You already have a shelter registered", "code": "EMAIL_EXISTS"},
        )

    shelter = Shelter(
        manager_id=current_user.id,
        name=req.name,
        address=req.address,
        city=req.city,
        lat=req.lat,
        lng=req.lng,
        phone=req.phone,
        capacity_kg=req.capacity_kg,
        shelter_type=req.shelter_type,
        status=ShelterStatus.pending,
    )
    db.add(shelter)
    db.commit()
    db.refresh(shelter)
    return shelter


@router.get("/mine", response_model=ShelterOut)
async def my_shelter(
    current_user: User = Depends(require_role(["shelter", "admin"])),
    db: Session = Depends(get_db),
):
    """Get shelter manager's own shelter."""
    shelter = db.query(Shelter).filter(Shelter.manager_id == current_user.id).first()
    if not shelter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "message": "No shelter registered", "code": "NOT_FOUND"},
        )
    return shelter


@router.patch("/{shelter_id}", response_model=ShelterOut)
async def update_shelter(
    shelter_id: UUID,
    req: ShelterUpdate,
    current_user: User = Depends(require_role(["shelter", "admin"])),
    db: Session = Depends(get_db),
):
    """Update shelter details."""
    shelter = db.query(Shelter).filter(Shelter.id == shelter_id).first()
    if not shelter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "message": "Shelter not found", "code": "NOT_FOUND"},
        )
    if shelter.manager_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": True, "message": "Not your shelter", "code": "INSUFFICIENT_PERMISSION"},
        )

    for field in ["name", "address", "city", "lat", "lng", "phone", "capacity_kg", "shelter_type"]:
        val = getattr(req, field, None)
        if val is not None:
            setattr(shelter, field, val)

    db.commit()
    db.refresh(shelter)
    return shelter
