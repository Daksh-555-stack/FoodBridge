import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum as SAEnum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class DeliveryStatus(str, enum.Enum):
    assigned = "assigned"
    picked_up = "picked_up"
    delivered = "delivered"


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("food_claims.id"), unique=True, nullable=False)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False)
    pickup_lat = Column(Float, nullable=False)
    pickup_lng = Column(Float, nullable=False)
    dropoff_lat = Column(Float, nullable=False)
    dropoff_lng = Column(Float, nullable=False)
    pickup_address = Column(String(400), nullable=True)
    dropoff_address = Column(String(400), nullable=True)
    status = Column(
        SAEnum(DeliveryStatus, name="deliverystatus", create_constraint=True),
        default=DeliveryStatus.assigned,
        nullable=False,
    )
    osrm_route = Column(JSON, nullable=True)
    distance_km = Column(Float, nullable=True)
    duration_min = Column(Float, nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    picked_up_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)

    claim = relationship("FoodClaim", back_populates="delivery")
    driver = relationship("Driver", back_populates="deliveries")
