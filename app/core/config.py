import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "Community Scam Map"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./scammap.db")
    SERVER_SECRET: str = os.getenv("SERVER_SECRET", "scam-map-hackathon-secret-key-32bytes-secure")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    STATIC_DIR: str = os.getenv("STATIC_DIR", "frontend/dist")

settings = Settings()
