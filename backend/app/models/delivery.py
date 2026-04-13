from datetime import datetime
from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    actual_delivered_at = Column(DateTime, nullable=True)
    quantity_received_kg = Column(Float, nullable=True)
    shelter_confirmed = Column(Boolean, default=False)

    route = relationship("Route", backref="delivery")
