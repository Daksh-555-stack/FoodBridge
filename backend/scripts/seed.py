"""
Seed script: Creates sample data for FoodBridge AI
- 5 Donors (restaurants in Bhopal)
- 3 Drivers with varied vehicle capacities
- 2 Shelters at known Bhopal locations
- 1 Admin user
- Sample donations with various statuses

All seeded users have password: foodbridge123
"""
import os
import sys
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.driver import Driver
from app.models.shelter import Shelter
from app.models.donation import Donation, DonationStatus
from app.auth.jwt import hash_password


def seed():
    db = SessionLocal()

    # Check if already seeded
    if db.query(User).first():
        print("⚡ Database already seeded, skipping.")
        db.close()
        return

    print("🌱 Seeding database...")

    hashed = hash_password("foodbridge123")
    now = datetime.utcnow()

    # ── Admin ─────────────────────────────────────────
    admin = User(
        name="Admin FoodBridge",
        email="admin@foodbridge.ai",
        hashed_password=hashed,
        role=UserRole.admin,
        lat=23.2599,
        lng=77.4126,
    )
    db.add(admin)

    # ── Donors (5 restaurants in Bhopal) ──────────────
    donors_data = [
        ("Manohar Dairy", "manohar@foodbridge.ai", 23.2332, 77.4345),
        ("Under the Mango Tree", "mango@foodbridge.ai", 23.2554, 77.4009),
        ("Bapu Ki Kutia", "bapu@foodbridge.ai", 23.2437, 77.4142),
        ("Indian Coffee House", "coffee@foodbridge.ai", 23.2645, 77.4085),
        ("Jyoti Restaurant", "jyoti@foodbridge.ai", 23.2710, 77.4233),
    ]
    donors = []
    for name, email, lat, lng in donors_data:
        user = User(name=name, email=email, hashed_password=hashed, role=UserRole.donor, lat=lat, lng=lng)
        db.add(user)
        donors.append(user)

    # ── Drivers (3) ───────────────────────────────────
    drivers_data = [
        ("Rajesh Kumar", "rajesh@foodbridge.ai", 23.2500, 77.4200, 50.0),
        ("Priya Sharma", "priya@foodbridge.ai", 23.2400, 77.4100, 30.0),
        ("Amit Patel", "amit@foodbridge.ai", 23.2600, 77.4000, 75.0),
    ]
    drivers = []
    for name, email, lat, lng, capacity in drivers_data:
        user = User(name=name, email=email, hashed_password=hashed, role=UserRole.driver, lat=lat, lng=lng)
        db.add(user)
        db.flush()
        driver = Driver(
            id=user.id,
            vehicle_capacity_kg=capacity,
            is_available=True,
            current_lat=lat,
            current_lng=lng,
        )
        db.add(driver)
        drivers.append(user)

    # ── Shelters (2) ──────────────────────────────────
    shelters_data = [
        ("Bhopal Children's Home", "children@foodbridge.ai", 23.2380, 77.4250, "Near Habibganj, Bhopal", 100.0),
        ("Annapurna Shelter", "annapurna@foodbridge.ai", 23.2700, 77.3950, "Arera Colony, Bhopal", 150.0),
    ]
    shelters = []
    for name, email, lat, lng, address, capacity in shelters_data:
        user = User(name=name, email=email, hashed_password=hashed, role=UserRole.shelter, lat=lat, lng=lng)
        db.add(user)
        db.flush()
        shelter = Shelter(
            id=user.id,
            capacity_kg=capacity,
            current_load_kg=0.0,
            address=address,
            lat=lat,
            lng=lng,
        )
        db.add(shelter)
        shelters.append(user)

    db.flush()

    # ── Sample Donations ──────────────────────────────
    donations_data = [
        (donors[0], "Biryani", 12.0, now + timedelta(hours=6), DonationStatus.pending),
        (donors[1], "Dal Makhani & Rice", 8.0, now + timedelta(hours=4), DonationStatus.pending),
        (donors[2], "Chapati & Sabzi", 15.0, now + timedelta(hours=8), DonationStatus.pending),
        (donors[3], "Sandwiches", 5.0, now + timedelta(hours=3), DonationStatus.pending),
        (donors[4], "Poha & Jalebi", 10.0, now + timedelta(hours=5), DonationStatus.pending),
    ]
    for donor, food, qty, expiry, st in donations_data:
        donation = Donation(
            donor_id=donor.id,
            food_type=food,
            quantity_kg=qty,
            expiry_datetime=expiry,
            status=st,
            pickup_lat=donor.lat,
            pickup_lng=donor.lng,
        )
        db.add(donation)

    db.commit()
    db.close()

    print("✅ Seeded: 1 admin, 5 donors, 3 drivers, 2 shelters, 5 donations")
    print("   All passwords: foodbridge123")


if __name__ == "__main__":
    seed()
else:
    seed()
