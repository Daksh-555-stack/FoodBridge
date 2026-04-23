import json
import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.food_listing import FoodListing, ListingStatus
from app.redis_client import redis_client

logger = logging.getLogger(__name__)


async def background_expiry_checker():
    """Background task that runs every 5 minutes to check for expiring food listings."""
    while True:
        try:
            db = SessionLocal()
            now = datetime.utcnow()
            expiry_threshold = now + timedelta(minutes=60)

            # Find available listings expiring within 60 minutes
            expiring = (
                db.query(FoodListing)
                .filter(
                    FoodListing.status == ListingStatus.available,
                    FoodListing.expiry_time <= expiry_threshold,
                    FoodListing.expiry_time > now,
                )
                .all()
            )

            for listing in expiring:
                remaining = (listing.expiry_time - now).total_seconds() / 60
                logger.warning(
                    f"Listing {listing.id} ({listing.food_name}) expiring in {remaining:.0f} min"
                )

                # Publish expiry alert
                try:
                    redis_client.publish("foodbridge_events", json.dumps({
                        "event": "expiry_alert",
                        "timestamp": now.isoformat() + "Z",
                        "data": {
                            "listing_id": str(listing.id),
                            "food_name": listing.food_name,
                            "quantity_kg": listing.quantity_kg,
                            "remaining_minutes": round(remaining),
                            "expiry_time": listing.expiry_time.isoformat(),
                        },
                    }))
                except Exception as e:
                    logger.error(f"Failed to publish expiry alert: {e}")

            # Mark expired listings
            expired = (
                db.query(FoodListing)
                .filter(
                    FoodListing.status == ListingStatus.available,
                    FoodListing.expiry_time <= now,
                )
                .all()
            )
            for listing in expired:
                listing.status = ListingStatus.expired
                logger.info(f"Listing {listing.id} ({listing.food_name}) marked as expired")

            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Background expiry checker error: {e}")

        await asyncio.sleep(300)  # Run every 5 minutes
