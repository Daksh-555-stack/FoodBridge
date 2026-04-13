from datetime import datetime
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    stops = Column(JSON, nullable=False, default=list)
    total_distance_km = Column(Float, nullable=True)
    total_duration_min = Column(Float, nullable=True)
    polyline_coords = Column(JSON, nullable=True)
    improvement_pct = Column(Float, nullable=True, default=0.0)
    optimized_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match", backref="route")
