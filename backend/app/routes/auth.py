from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.driver import Driver
from app.models.shelter import Shelter
from app.auth.jwt import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)
from app.schemas import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, UserOut
from app.redis_client import redis_client
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "Email already registered", "code": "EMAIL_EXISTS", "detail": {}},
        )

    user = User(
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password),
        role=UserRole(req.role),
        lat=req.lat,
        lng=req.lng,
    )
    db.add(user)
    db.flush()

    # Create role-specific profile
    if req.role == "driver":
        driver = Driver(id=user.id, current_lat=req.lat, current_lng=req.lng)
        db.add(driver)
    elif req.role == "shelter":
        shelter = Shelter(id=user.id, lat=req.lat or 0, lng=req.lng or 0)
        db.add(shelter)

    db.commit()
    db.refresh(user)

    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role.value})

    # Store refresh token in Redis
    redis_client.setex(
        f"refresh_token:{user.id}",
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        refresh_token,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "lat": user.lat,
            "lng": user.lng,
        },
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid credentials", "code": "INVALID_CREDENTIALS", "detail": {}},
        )

    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role.value})

    redis_client.setex(
        f"refresh_token:{user.id}",
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        refresh_token,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "lat": user.lat,
            "lng": user.lng,
        },
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(req: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid refresh token", "code": "INVALID_REFRESH_TOKEN", "detail": {}},
        )

    user_id = int(payload["sub"])
    stored = redis_client.get(f"refresh_token:{user_id}")
    if stored != req.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Refresh token revoked", "code": "TOKEN_REVOKED", "detail": {}},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "User not found", "code": "USER_NOT_FOUND", "detail": {}},
        )

    new_access = create_access_token({"sub": str(user.id), "role": user.role.value})
    new_refresh = create_refresh_token({"sub": str(user.id), "role": user.role.value})

    redis_client.setex(
        f"refresh_token:{user.id}",
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        new_refresh,
    )

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "lat": user.lat,
            "lng": user.lng,
        },
    )
