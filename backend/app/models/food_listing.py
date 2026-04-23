import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class FoodType(str, enum.Enum):
    veg = "veg"
    non_veg = "non_veg"
    vegan = "vegan"


class ListingStatus(str, enum.Enum):
    available = "available"
    claimed = "claimed"
    in_transit = "in_transit"
    delivered = "delivered"
    expired = "expired"


class FoodListing(Base):
    __tablename__ = "food_listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    restaurant_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id"), nullable=False)
    donor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    food_name = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    quantity_kg = Column(Float, nullable=False)
    food_type = Column(String(50), default=FoodType.veg.value, nullable=False)
    expiry_time = Column(DateTime(timezone=True), nullable=False)
    pickup_lat = Column(Float, nullable=False)
    pickup_lng = Column(Float, nullable=False)
    pickup_address = Column(String(400), nullable=True)
    status = Column(String(50), default=ListingStatus.available.value, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="donations")
    donor = relationship("User", backref="food_listings")
    claims = relationship("FoodClaim", back_populates="listing")
