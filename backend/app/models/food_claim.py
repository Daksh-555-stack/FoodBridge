import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class ClaimStatus(str, enum.Enum):
    pending = "pending"
    driver_assigned = "driver_assigned"
    picked_up = "picked_up"
    delivered = "delivered"
    cancelled = "cancelled"


class FoodClaim(Base):
    __tablename__ = "food_claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("food_listings.id"), nullable=False)
    shelter_id = Column(UUID(as_uuid=True), ForeignKey("shelters.id"), nullable=False)
    claimed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    delivery_lat = Column(Float, nullable=False)
    delivery_lng = Column(Float, nullable=False)
    delivery_address = Column(String(400), nullable=False)
    status = Column(
        SAEnum(ClaimStatus, name="claimstatus", create_constraint=True),
        default=ClaimStatus.pending,
        nullable=False,
    )
    claimed_at = Column(DateTime, default=datetime.utcnow)

    listing = relationship("FoodListing", back_populates="claims")
    shelter = relationship("Shelter", back_populates="claims")
    claimed_user = relationship("User", backref="food_claims")
    delivery = relationship("Delivery", back_populates="claim", uselist=False)
