import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum as SAEnum
from app.database import Base


class UserRole(str, enum.Enum):
    donor = "donor"
    driver = "driver"
    shelter = "shelter"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
