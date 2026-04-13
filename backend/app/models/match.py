from datetime import datetime
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    donation_id = Column(Integer, ForeignKey("donations.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    shelter_id = Column(Integer, ForeignKey("shelters.id"), nullable=False)
    confidence_score = Column(Float, nullable=False)
    matched_at = Column(DateTime, default=datetime.utcnow)
    estimated_delivery_at = Column(DateTime, nullable=True)

    donation = relationship("Donation", backref="matches")
    driver = relationship("Driver", backref="matches")
    shelter = relationship("Shelter", backref="matches")
