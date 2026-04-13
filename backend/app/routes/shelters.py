from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.shelter import Shelter
from app.models.match import Match
from app.models.donation import Donation, DonationStatus
from app.schemas import ShelterOut, MatchOut

router = APIRouter(prefix="/shelters", tags=["Shelters"])


@router.get("", response_model=list[ShelterOut])
async def list_shelters(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Shelter).all()


@router.get("/{shelter_id}/incoming", response_model=list[MatchOut])
async def get_incoming_deliveries(
    shelter_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shelter = db.query(Shelter).filter(Shelter.id == shelter_id).first()
    if not shelter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Shelter not found", "code": "NOT_FOUND", "detail": {}},
        )
    matches = (
        db.query(Match)
        .filter(Match.shelter_id == shelter_id)
        .join(Donation, Match.donation_id == Donation.id)
        .filter(Donation.status.in_([DonationStatus.matched, DonationStatus.in_transit]))
        .all()
    )
    return matches
