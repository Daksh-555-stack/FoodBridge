from app.database import SessionLocal
from app.models.restaurant import Restaurant, RestaurantStatus
from app.models.user import User, UserRole


def main():
    db = SessionLocal()
    fixed_count = 0
    try:
        approved_donors = (
            db.query(User)
            .filter(
                User.role == UserRole.donor,
                User.is_approved.is_(True),
            )
            .all()
        )

        for donor in approved_donors:
            restaurants = (
                db.query(Restaurant)
                .filter(
                    Restaurant.owner_id == donor.id,
                    Restaurant.status == RestaurantStatus.pending,
                )
                .all()
            )
            for restaurant in restaurants:
                restaurant.status = RestaurantStatus.approved
                fixed_count += 1

        db.commit()
        print(f"Approved {fixed_count} pending restaurants for already-approved donors.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
