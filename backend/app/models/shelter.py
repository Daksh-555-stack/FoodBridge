from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Shelter(Base):
    __tablename__ = "shelters"

    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    capacity_kg = Column(Float, nullable=False, default=100.0)
    current_load_kg = Column(Float, nullable=False, default=0.0)
    address = Column(String(500), nullable=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)

    user = relationship("User", backref="shelter_profile")
