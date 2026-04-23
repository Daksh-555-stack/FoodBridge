from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, validator


# ── Auth ──────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str  # donor, driver, shelter, admin
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


# ── User ──────────────────────────────────────────────
class UserOut(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    is_active: bool = True
    is_approved: bool = False
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Restaurant ────────────────────────────────────────
class RestaurantCreate(BaseModel):
    name: str
    address: str
    city: str = "Bhopal"
    lat: float
    lng: float
    phone: Optional[str] = None
    fssai_number: Optional[str] = None


class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone: Optional[str] = None
    fssai_number: Optional[str] = None


class RestaurantOut(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    address: str
    city: str
    lat: float
    lng: float
    phone: Optional[str] = None
    fssai_number: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    owner: Optional[UserOut] = None

    class Config:
        from_attributes = True


# ── Shelter ───────────────────────────────────────────
class ShelterCreate(BaseModel):
    name: str
    address: str
    city: str = "Bhopal"
    lat: float
    lng: float
    phone: Optional[str] = None
    capacity_kg: float = 100.0
    shelter_type: Optional[str] = None


class ShelterUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone: Optional[str] = None
    capacity_kg: Optional[float] = None
    shelter_type: Optional[str] = None


class ShelterOut(BaseModel):
    id: UUID
    manager_id: UUID
    name: str
    address: str
    city: str
    lat: float
    lng: float
    phone: Optional[str] = None
    capacity_kg: float
    current_load_kg: float
    shelter_type: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    manager: Optional[UserOut] = None

    class Config:
        from_attributes = True


# ── Driver ────────────────────────────────────────────
class DriverCreate(BaseModel):
    vehicle_type: str = "motorcycle"
    vehicle_number: Optional[str] = None
    capacity_kg: float = 20.0
    license_number: Optional[str] = None
    service_radius_km: float = 15.0


class DriverAvailabilityUpdate(BaseModel):
    is_available: bool


class DriverOut(BaseModel):
    id: UUID
    user_id: UUID
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    capacity_kg: float
    is_available: bool
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    last_location_update: Optional[datetime] = None
    created_at: Optional[datetime] = None
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True


class LocationUpdate(BaseModel):
    lat: float
    lng: float


# ── Food Listing ─────────────────────────────────────
class FoodListingCreate(BaseModel):
    food_name: str
    description: Optional[str] = ""
    quantity_kg: float
    food_type: str = "veg"
    expiry_time: datetime
    pickup_lat: float
    pickup_lng: float
    pickup_address: Optional[str] = ""
    restaurant_id: UUID

    @validator("food_type")
    def validate_food_type(cls, v):
        allowed = ["veg", "non_veg", "vegan"]
        if v not in allowed:
            raise ValueError(f"food_type must be one of {allowed}")
        return v

    @validator("quantity_kg")
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError("quantity_kg must be greater than 0")
        return v

    class Config:
        from_attributes = True


class FoodListingOut(BaseModel):
    id: UUID
    restaurant_id: UUID
    donor_id: UUID
    food_name: str
    description: Optional[str] = None
    quantity_kg: float
    food_type: str
    expiry_time: datetime
    pickup_lat: float
    pickup_lng: float
    pickup_address: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    time_remaining_minutes: Optional[float] = None
    restaurant: Optional[RestaurantOut] = None

    class Config:
        from_attributes = True


# ── Food Claim ────────────────────────────────────────
class FoodClaimCreate(BaseModel):
    listing_id: UUID
    delivery_lat: float
    delivery_lng: float
    delivery_address: str


class FoodClaimOut(BaseModel):
    id: UUID
    listing_id: UUID
    shelter_id: UUID
    claimed_by: UUID
    delivery_lat: float
    delivery_lng: float
    delivery_address: str
    status: str
    claimed_at: Optional[datetime] = None
    listing: Optional[FoodListingOut] = None
    shelter: Optional[ShelterOut] = None

    class Config:
        from_attributes = True


# ── Delivery ─────────────────────────────────────────
class DeliveryCreate(BaseModel):
    claim_id: UUID


class DeliveryOut(BaseModel):
    id: UUID
    claim_id: UUID
    driver_id: UUID
    pickup_lat: float
    pickup_lng: float
    dropoff_lat: float
    dropoff_lng: float
    pickup_address: Optional[str] = None
    dropoff_address: Optional[str] = None
    status: str
    osrm_route: Optional[Any] = None
    distance_km: Optional[float] = None
    duration_min: Optional[float] = None
    assigned_at: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    claim: Optional[FoodClaimOut] = None
    driver: Optional[DriverOut] = None

    class Config:
        from_attributes = True


# ── Admin ─────────────────────────────────────────────
class AdminOverview(BaseModel):
    total_users: int
    total_donors: int
    total_drivers: int
    total_shelters: int
    total_listings: int
    active_listings: int
    total_claims: int
    total_deliveries: int
    completed_deliveries: int
    total_food_rescued_kg: float


# ── Error ─────────────────────────────────────────────
class ErrorResponse(BaseModel):
    error: bool = True
    message: str
    code: str
    field: Optional[str] = None
