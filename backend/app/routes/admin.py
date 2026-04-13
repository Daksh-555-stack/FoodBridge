from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User, UserRole
from app.models.donation import Donation, DonationStatus
from app.models.driver import Driver
from app.models.shelter import Shelter
from app.models.match import Match
from app.models.delivery import Delivery
from app.schemas import MetricsOut

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/metrics", response_model=MetricsOut)
async def get_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total_delivered = (
        db.query(func.coalesce(func.sum(Delivery.quantity_received_kg), 0.0))
        .scalar()
    )
    active_donors = db.query(User).filter(User.role == UserRole.donor).count()
    drivers_on_road = db.query(Driver).filter(Driver.is_available == False).count()
    shelters_served = (
        db.query(Shelter)
        .filter(Shelter.current_load_kg > 0)
        .count()
    )
    pending_donations = (
        db.query(Donation).filter(Donation.status == DonationStatus.pending).count()
    )
    active_matches = (
        db.query(Match)
        .join(Donation, Match.donation_id == Donation.id)
        .filter(Donation.status.in_([DonationStatus.matched, DonationStatus.in_transit]))
        .count()
    )

    return MetricsOut(
        total_food_rescued_kg=float(total_delivered),
        active_donors=active_donors,
        drivers_on_road=drivers_on_road,
        shelters_served=shelters_served,
        pending_donations=pending_donations,
        active_matches=active_matches,
    )
