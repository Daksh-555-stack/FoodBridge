import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class DonationStatus(str, enum.Enum):
    pending = "pending"
    matched = "matched"
    in_transit = "in_transit"
    delivered = "delivered"
    expired = "expired"


class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    donor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    food_type = Column(String(255), nullable=False)
    quantity_kg = Column(Float, nullable=False)
    expiry_datetime = Column(DateTime, nullable=False)
    status = Column(SAEnum(DonationStatus), default=DonationStatus.pending, nullable=False)
    pickup_lat = Column(Float, nullable=False)
    pickup_lng = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    donor = relationship("User", backref="donations")
