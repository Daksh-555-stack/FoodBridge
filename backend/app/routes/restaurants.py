import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.restaurant import Restaurant, RestaurantStatus
from app.schemas import RestaurantCreate, RestaurantUpdate, RestaurantOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/restaurants", tags=["Restaurants"])


@router.post("", response_model=RestaurantOut)
async def create_restaurant(
    req: RestaurantCreate,
    current_user: User = Depends(require_role(["donor", "admin"])),
    db: Session = Depends(get_db),
):
    """Donor registers a new restaurant."""
    restaurant = Restaurant(
        owner_id=current_user.id,
        name=req.name,
        address=req.address,
        city=req.city,
        lat=req.lat,
        lng=req.lng,
        phone=req.phone,
        fssai_number=req.fssai_number,
        status=RestaurantStatus.pending,
    )
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    return restaurant


@router.get("/mine", response_model=list[RestaurantOut])
async def my_restaurants(
    current_user: User = Depends(require_role(["donor", "admin"])),
    db: Session = Depends(get_db),
):
    """Get donor's own restaurants."""
    return (
        db.query(Restaurant)
        .filter(Restaurant.owner_id == current_user.id)
        .order_by(Restaurant.created_at.desc())
        .all()
    )


@router.get("", response_model=list[RestaurantOut])
async def list_restaurants(
    db: Session = Depends(get_db),
):
    """Public list of approved restaurants."""
    return (
        db.query(Restaurant)
        .filter(Restaurant.status == RestaurantStatus.approved)
        .order_by(Restaurant.name)
        .all()
    )


@router.patch("/{restaurant_id}", response_model=RestaurantOut)
async def update_restaurant(
    restaurant_id: UUID,
    req: RestaurantUpdate,
    current_user: User = Depends(require_role(["donor", "admin"])),
    db: Session = Depends(get_db),
):
    """Edit own restaurant."""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": True, "message": "Restaurant not found", "code": "NOT_FOUND"},
        )
    if restaurant.owner_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": True, "message": "Not your restaurant", "code": "INSUFFICIENT_PERMISSION"},
        )

    for field in ["name", "address", "city", "lat", "lng", "phone", "fssai_number"]:
        val = getattr(req, field, None)
        if val is not None:
            setattr(restaurant, field, val)

    db.commit()
    db.refresh(restaurant)
    return restaurant
