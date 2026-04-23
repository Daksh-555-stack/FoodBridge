import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class RestaurantStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    address = Column(String(400), nullable=False)
    city = Column(String(100), nullable=False, default="Bhopal")
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    phone = Column(String(20), nullable=True)
    fssai_number = Column(String(100), nullable=True)
    status = Column(
        SAEnum(RestaurantStatus, name="restaurantstatus", create_constraint=True),
        default=RestaurantStatus.pending,
        nullable=False,
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", backref="restaurants")
    donations = relationship("FoodListing", back_populates="restaurant")
