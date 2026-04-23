"""
Seed script: Creates sample data for FoodBridge AI v2

Users:
  - admin@foodbridge.com / Admin@123
  - donor@test.com / Test@1234  (with approved restaurant)
  - shelter@test.com / Test@1234 (with approved shelter, lat/lng set)
  - driver@test.com / Test@1234  (with driver profile, is_available=True)

Food Listings:
  - 2 listings (one expiring in 2 hours, one in 5 hours)
"""
import os
import sys
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.restaurant import Restaurant, RestaurantStatus
from app.models.shelter import Shelter, ShelterStatus
from app.models.driver import Driver
from app.models.food_listing import FoodListing, FoodType, ListingStatus
from app.auth.jwt import hash_password


def seed():
    db = SessionLocal()

    # Check if already seeded
    if db.query(User).first():
        print("⚡ Database already seeded, skipping.")
        db.close()
        return

    print("🌱 Seeding database...")

    now = datetime.utcnow()

    # ── Admin ─────────────────────────────────────────
    admin = User(
        name="Admin FoodBridge",
        email="admin@foodbridge.com",
        hashed_password=hash_password("Admin@123"),
        role=UserRole.admin,
        is_approved=True,
        is_active=True,
    )
    db.add(admin)
    db.flush()
    print(f"  ✅ Admin: admin@foodbridge.com / Admin@123  (id={admin.id})")

    # ── Donor ─────────────────────────────────────────
    donor = User(
        name="Manohar Dairy",
        email="donor@test.com",
        hashed_password=hash_password("Test@1234"),
        role=UserRole.donor,
        is_approved=True,
        is_active=True,
        phone="+91-9876543210",
    )
    db.add(donor)
    db.flush()

    restaurant = Restaurant(
        owner_id=donor.id,
        name="Manohar Dairy Restaurant",
        address="6, Hamidia Road, Bhopal",
        city="Bhopal",
        lat=23.2332,
        lng=77.4345,
        phone="+91-9876543210",
        fssai_number="12345678901234",
        status=RestaurantStatus.approved,
    )
    db.add(restaurant)
    db.flush()
    print(f"  ✅ Donor: donor@test.com / Test@1234  (id={donor.id})")
    print(f"     Restaurant: {restaurant.name}  (id={restaurant.id}, status=approved)")

    # ── Shelter ───────────────────────────────────────
    shelter_user = User(
        name="Bhopal Children's Home",
        email="shelter@test.com",
        hashed_password=hash_password("Test@1234"),
        role=UserRole.shelter,
        is_approved=True,
        is_active=True,
        phone="+91-9876543211",
    )
    db.add(shelter_user)
    db.flush()

    shelter = Shelter(
        manager_id=shelter_user.id,
        name="Bhopal Children's Home",
        address="Near Habibganj, Bhopal",
        city="Bhopal",
        lat=23.2380,
        lng=77.4250,
        phone="+91-9876543211",
        capacity_kg=100.0,
        current_load_kg=0.0,
        shelter_type="Children's Home",
        status=ShelterStatus.approved,
    )
    db.add(shelter)
    db.flush()
    print(f"  ✅ Shelter: shelter@test.com / Test@1234  (id={shelter_user.id})")
    print(f"     Shelter: {shelter.name}  (id={shelter.id}, lat={shelter.lat}, lng={shelter.lng}, status=approved)")

    # ── Driver ────────────────────────────────────────
    driver_user = User(
        name="Rajesh Kumar",
        email="driver@test.com",
        hashed_password=hash_password("Test@1234"),
        role=UserRole.driver,
        is_approved=True,
        is_active=True,
        phone="+91-9876543212",
    )
    db.add(driver_user)
    db.flush()

    driver = Driver(
        user_id=driver_user.id,
        vehicle_type="Bike",
        vehicle_number="MP04-AB-1234",
        capacity_kg=20.0,
        is_available=True,
        current_lat=23.2500,
        current_lng=77.4200,
        last_location_update=now,
    )
    db.add(driver)
    db.flush()
    print(f"  ✅ Driver: driver@test.com / Test@1234  (id={driver_user.id})")
    print(f"     Driver profile: vehicle={driver.vehicle_type}, is_available=True")

    # ── Food Listings ─────────────────────────────────
    listing1 = FoodListing(
        restaurant_id=restaurant.id,
        donor_id=donor.id,
        food_name="Biryani",
        description="Fresh chicken biryani, serves 20 people",
        quantity_kg=12.0,
        food_type=FoodType.non_veg,
        expiry_time=now + timedelta(hours=2),
        pickup_lat=23.2332,
        pickup_lng=77.4345,
        pickup_address="6, Hamidia Road, Bhopal",
        status=ListingStatus.available,
    )
    db.add(listing1)

    listing2 = FoodListing(
        restaurant_id=restaurant.id,
        donor_id=donor.id,
        food_name="Dal Makhani & Rice",
        description="Vegetarian dal with steamed rice, serves 15 people",
        quantity_kg=8.0,
        food_type=FoodType.veg,
        expiry_time=now + timedelta(hours=5),
        pickup_lat=23.2332,
        pickup_lng=77.4345,
        pickup_address="6, Hamidia Road, Bhopal",
        status=ListingStatus.available,
    )
    db.add(listing2)

    db.commit()
    print(f"  ✅ 2 food listings created (expiring in 2h and 5h)")
    print()
    print("✅ Seeding complete!")
    print("   Admin:   admin@foodbridge.com / Admin@123")
    print("   Donor:   donor@test.com / Test@1234")
    print("   Shelter: shelter@test.com / Test@1234")
    print("   Driver:  driver@test.com / Test@1234")

    db.close()


if __name__ == "__main__":
    seed()
