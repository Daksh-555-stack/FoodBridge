from datetime import datetime
from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    vehicle_capacity_kg = Column(Float, nullable=False, default=50.0)
    is_available = Column(Boolean, default=True)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    last_seen_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="driver_profile")
