from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.auth.dependencies import require_role
from app.models.user import User, UserRole
from app.models.restaurant import Restaurant, RestaurantStatus
from app.models.shelter import Shelter, ShelterStatus
from app.models.driver import Driver
from app.models.food_listing import FoodListing, ListingStatus
from app.models.food_claim import FoodClaim
from app.models.delivery import Delivery, DeliveryStatus
from app.schemas import AdminOverview, DeliveryOut, FoodListingOut, RestaurantOut, UserOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


class ApprovalRequest(BaseModel):
    approved: bool


def _enum_value(value):
    return value.value if hasattr(value, "value") else value


def _user_summary(user: User) -> dict:
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": _enum_value(user.role),
        "created_at": user.created_at,
        "phone": user.phone,
    }


def _registration_details(user: User, db: Session) -> dict:
    role = _enum_value(user.role)

    if role == UserRole.donor.value:
        restaurant = (
            db.query(Restaurant)
            .filter(Restaurant.owner_id == user.id)
            .order_by(Restaurant.created_at.desc())
            .first()
        )
        return {
            "restaurant": {
                "name": restaurant.name,
                "address": restaurant.address,
                "status": _enum_value(restaurant.status),
            } if restaurant else None
        }

    if role == UserRole.shelter.value:
        shelter = db.query(Shelter).filter(Shelter.manager_id == user.id).first()
        return {
            "shelter": {
                "name": shelter.name,
                "address": shelter.address,
                "status": _enum_value(shelter.status),
            } if shelter else None
        }

    if role == UserRole.driver.value:
        driver = db.query(Driver).filter(Driver.user_id == user.id).first()
        return {
            "driver": {
                "vehicle_type": driver.vehicle_type,
                "vehicle_number": driver.vehicle_number,
            } if driver else None
        }

    return {}


def _set_owned_approval_status(user: User, approved: bool, db: Session) -> None:
    role = _enum_value(user.role)

    if role == UserRole.donor.value:
        restaurants = db.query(Restaurant).filter(Restaurant.owner_id == user.id).all()
        for restaurant in restaurants:
            restaurant.status = (
                RestaurantStatus.approved if approved else RestaurantStatus.rejected
            )

    if role == UserRole.shelter.value:
        shelters = db.query(Shelter).filter(Shelter.manager_id == user.id).all()
        for shelter in shelters:
            shelter.status = ShelterStatus.approved if approved else ShelterStatus.rejected


@router.get("/pending-users")
async def pending_users(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    users = (
        db.query(User)
        .filter(User.is_approved.is_(False))
        .order_by(User.created_at.desc())
        .all()
    )
    return [
        {
            **_user_summary(user),
            **_registration_details(user, db),
        }
        for user in users
    ]


@router.patch("/approve-user/{user_id}")
async def approve_user(
    user_id: UUID,
    req: ApprovalRequest,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    role = _enum_value(user.role)
    user.is_approved = req.approved

    _set_owned_approval_status(user, req.approved, db)

    if role == UserRole.driver.value:
        driver = db.query(Driver).filter(Driver.user_id == user.id).first()
        if driver and hasattr(driver, "is_approved"):
            driver.is_approved = req.approved

    db.commit()
    return {"message": "User approved" if req.approved else "User rejected"}


@router.get("/all-users")
async def all_users(
    role: Optional[str] = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if role:
        try:
            query = query.filter(User.role == UserRole(role))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid role",
            )

    users = query.order_by(User.created_at.desc()).all()
    return [
        {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": _enum_value(user.role),
            "is_approved": user.is_approved,
            "is_active": user.is_active,
            "created_at": user.created_at,
        }
        for user in users
    ]


@router.get("/stats")
async def admin_stats(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    return {
        "total_users": db.query(User).count(),
        "pending_approvals": db.query(User).filter(User.is_approved.is_(False)).count(),
        "total_donors": db.query(User).filter(User.role == UserRole.donor).count(),
        "total_shelters": db.query(User).filter(User.role == UserRole.shelter).count(),
        "total_drivers": db.query(User).filter(User.role == UserRole.driver).count(),
        "total_listings": db.query(FoodListing).count(),
        "total_deliveries": db.query(Delivery).count(),
    }


@router.get("/overview", response_model=AdminOverview)
async def admin_overview(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    total_food = (
        db.query(func.coalesce(func.sum(FoodListing.quantity_kg), 0.0))
        .filter(FoodListing.status == ListingStatus.delivered)
        .scalar()
    )

    return AdminOverview(
        total_users=db.query(User).count(),
        total_donors=db.query(User).filter(User.role == UserRole.donor).count(),
        total_drivers=db.query(User).filter(User.role == UserRole.driver).count(),
        total_shelters=db.query(User).filter(User.role == UserRole.shelter).count(),
        total_listings=db.query(FoodListing).count(),
        active_listings=db.query(FoodListing).filter(FoodListing.status == ListingStatus.available).count(),
        total_claims=db.query(FoodClaim).count(),
        total_deliveries=db.query(Delivery).count(),
        completed_deliveries=db.query(Delivery).filter(Delivery.status == DeliveryStatus.delivered).count(),
        total_food_rescued_kg=float(total_food),
    )


@router.get("/users", response_model=list[UserOut])
async def legacy_list_users(
    role: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if role:
        try:
            query = query.filter(User.role == UserRole(role))
        except ValueError:
            pass
    return query.offset((page - 1) * limit).limit(limit).all()


@router.patch("/users/{user_id}/approve", response_model=UserOut)
async def legacy_approve_user(
    user_id: UUID,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_approved = True
    _set_owned_approval_status(user, True, db)
    db.commit()
    db.refresh(user)
    return user


@router.get("/restaurants")
async def list_all_restaurants(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    query = db.query(Restaurant).options(joinedload(Restaurant.owner))
    if status_filter:
        try:
            query = query.filter(Restaurant.status == RestaurantStatus(status_filter))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid restaurant status",
            )

    restaurants = query.order_by(Restaurant.created_at.desc()).all()
    return [
        {
            "id": str(restaurant.id),
            "name": restaurant.name,
            "address": restaurant.address,
            "city": restaurant.city,
            "status": _enum_value(restaurant.status),
            "created_at": restaurant.created_at,
            "owner": {
                "name": restaurant.owner.name,
                "email": restaurant.owner.email,
            } if restaurant.owner else None,
            "owner_name": restaurant.owner.name if restaurant.owner else None,
            "owner_email": restaurant.owner.email if restaurant.owner else None,
        }
        for restaurant in restaurants
    ]


@router.patch("/restaurants/{restaurant_id}/approve")
async def approve_restaurant(
    restaurant_id: UUID,
    req: ApprovalRequest,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")
    restaurant.status = RestaurantStatus.approved if req.approved else RestaurantStatus.rejected
    db.commit()
    return {"message": "Restaurant updated"}


@router.patch("/shelters/{shelter_id}/approve")
async def approve_shelter(
    shelter_id: UUID,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    shelter = db.query(Shelter).filter(Shelter.id == shelter_id).first()
    if not shelter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelter not found")
    shelter.status = ShelterStatus.approved
    db.commit()
    return {"message": "Shelter approved", "id": str(shelter.id)}


@router.get("/listings", response_model=list[FoodListingOut])
async def list_all_listings(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    return db.query(FoodListing).order_by(FoodListing.created_at.desc()).all()


@router.get("/deliveries", response_model=list[DeliveryOut])
async def list_all_deliveries(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    return db.query(Delivery).order_by(Delivery.assigned_at.desc()).all()


@router.patch("/suspend-user/{user_id}")
async def suspend_user(
    user_id: UUID,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.is_active = False
    db.commit()
    return {"message": "User suspended"}
