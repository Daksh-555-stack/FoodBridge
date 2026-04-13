from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str  # donor, driver, shelter, admin
    lat: Optional[float] = None
    lng: Optional[float] = None


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


# ── User ──────────────────────────────────────────────
class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Donation ──────────────────────────────────────────
class DonationCreate(BaseModel):
    food_type: str
    quantity_kg: float
    expiry_datetime: datetime
    pickup_lat: float
    pickup_lng: float


class DonationOut(BaseModel):
    id: int
    donor_id: int
    food_type: str
    quantity_kg: float
    expiry_datetime: datetime
    status: str
    pickup_lat: float
    pickup_lng: float
    created_at: Optional[datetime] = None
    donor: Optional[UserOut] = None

    class Config:
        from_attributes = True


class DonationStatusUpdate(BaseModel):
    status: str


# ── Driver ────────────────────────────────────────────
class DriverOut(BaseModel):
    id: int
    vehicle_capacity_kg: float
    is_available: bool
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    last_seen_at: Optional[datetime] = None
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True


class LocationUpdate(BaseModel):
    lat: float
    lng: float


class AvailabilityUpdate(BaseModel):
    is_available: bool


# ── Shelter ───────────────────────────────────────────
class ShelterOut(BaseModel):
    id: int
    capacity_kg: float
    current_load_kg: float
    address: Optional[str] = None
    lat: float
    lng: float
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True


# ── Match ─────────────────────────────────────────────
class MatchOut(BaseModel):
    id: int
    donation_id: int
    driver_id: int
    shelter_id: int
    confidence_score: float
    matched_at: Optional[datetime] = None
    estimated_delivery_at: Optional[datetime] = None
    donation: Optional[DonationOut] = None
    driver: Optional[DriverOut] = None
    shelter: Optional[ShelterOut] = None

    class Config:
        from_attributes = True


# ── Route ─────────────────────────────────────────────
class StopOut(BaseModel):
    type: str
    donation_id: int
    lat: float
    lng: float
    eta_utc: Optional[str] = None
    food_summary: Optional[str] = None


class RouteOut(BaseModel):
    id: int
    match_id: int
    stops: list
    total_distance_km: Optional[float] = None
    total_duration_min: Optional[float] = None
    polyline_coords: Optional[list] = None
    improvement_pct: Optional[float] = None
    optimized_at: Optional[datetime] = None
    match: Optional[MatchOut] = None

    class Config:
        from_attributes = True


# ── Delivery ──────────────────────────────────────────
class DeliveryOut(BaseModel):
    id: int
    route_id: int
    actual_delivered_at: Optional[datetime] = None
    quantity_received_kg: Optional[float] = None
    shelter_confirmed: bool = False

    class Config:
        from_attributes = True


# ── Admin Metrics ─────────────────────────────────────
class MetricsOut(BaseModel):
    total_food_rescued_kg: float
    active_donors: int
    drivers_on_road: int
    shelters_served: int
    pending_donations: int
    active_matches: int


# ── Error ─────────────────────────────────────────────
class ErrorResponse(BaseModel):
    error: str
    code: str
    detail: dict = {}
