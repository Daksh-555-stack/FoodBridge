import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class ShelterStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Shelter(Base):
    __tablename__ = "shelters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    address = Column(String(400), nullable=False)
    city = Column(String(100), nullable=False, default="Bhopal")
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    phone = Column(String(20), nullable=True)
    capacity_kg = Column(Float, default=100.0, nullable=False)
    current_load_kg = Column(Float, default=0.0, nullable=False)
    shelter_type = Column(String(100), nullable=True)
    status = Column(
        SAEnum(ShelterStatus, name="shelterstatus", create_constraint=True),
        default=ShelterStatus.pending,
        nullable=False,
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    manager = relationship("User", backref="shelter_profile")
    claims = relationship("FoodClaim", back_populates="shelter")
