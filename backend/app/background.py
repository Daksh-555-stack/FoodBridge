import json
import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.donation import Donation, DonationStatus
from app.redis_client import redis_client
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


async def background_expiry_checker():
    """Background task that runs every 5 minutes to check for expiring donations."""
    while True:
        try:
            db = SessionLocal()
            now = datetime.utcnow()
            expiry_threshold = now + timedelta(minutes=60)

            # Find pending donations expiring within 60 minutes
            expiring = (
                db.query(Donation)
                .filter(
                    Donation.status == DonationStatus.pending,
                    Donation.expiry_datetime <= expiry_threshold,
                    Donation.expiry_datetime > now,
                )
                .all()
            )

            for donation in expiring:
                remaining = (donation.expiry_datetime - now).total_seconds() / 60
                logger.warning(
                    f"Donation {donation.id} expiring in {remaining:.0f} min"
                )

                # Publish expiry alert
                redis_client.publish("expiry_alert", json.dumps({
                    "event": "expiry_alert",
                    "timestamp": now.isoformat() + "Z",
                    "payload": {
                        "donation_id": donation.id,
                        "food_type": donation.food_type,
                        "quantity_kg": donation.quantity_kg,
                        "remaining_minutes": round(remaining),
                        "expiry_datetime": donation.expiry_datetime.isoformat(),
                    },
                }))

                # Try re-matching
                try:
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        await client.post(
                            f"{settings.AI_ENGINE_URL}/match",
                            json={"donation_id": donation.id},
                        )
                except Exception as e:
                    logger.error(f"Re-match failed for donation {donation.id}: {e}")

            # Mark expired donations
            expired = (
                db.query(Donation)
                .filter(
                    Donation.status == DonationStatus.pending,
                    Donation.expiry_datetime <= now,
                )
                .all()
            )
            for donation in expired:
                donation.status = DonationStatus.expired
                logger.info(f"Donation {donation.id} marked as expired")

            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Background expiry checker error: {e}")

        await asyncio.sleep(300)  # Run every 5 minutes
