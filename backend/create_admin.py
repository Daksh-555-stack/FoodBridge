from app.auth.jwt import hash_password
from app.database import SessionLocal
from app.models.user import User, UserRole


def main():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "admin@foodbridge.com").first()
        if existing:
            existing.hashed_password = hash_password("Admin@123")
            existing.name = "Admin"
            existing.role = UserRole.admin
            existing.is_active = True
            existing.is_approved = True
            db.commit()
            print("Admin already exists")
            return

        admin = User(
            email="admin@foodbridge.com",
            hashed_password=hash_password("Admin@123"),
            name="Admin",
            role=UserRole.admin,
            is_active=True,
            is_approved=True,
        )
        db.add(admin)
        db.commit()
        print("Admin created")
    finally:
        db.close()


if __name__ == "__main__":
    main()
