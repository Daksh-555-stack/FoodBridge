import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Boolean, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class UserRole(str, enum.Enum):
    donor = "donor"
    driver = "driver"
    shelter = "shelter"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(300), nullable=True)  # nullable for Google auth
    role = Column(SAEnum(UserRole, name="userrole", create_constraint=True), nullable=False)
    google_id = Column(String(200), unique=True, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_approved = Column(Boolean, default=False, nullable=False)  # driver/shelter need admin approval
    phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
