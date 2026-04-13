import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Load .env from project root
env_path = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://dakshtulaskar@localhost:5432/foodbridge"
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_SECRET: str = "foodbridge_super_secret_jwt_key_2024_xyz"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    OSRM_URL: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    AI_ENGINE_URL: str = "http://localhost:8001"

    class Config:
        env_file = str(env_path)
        extra = "allow"


settings = Settings()
