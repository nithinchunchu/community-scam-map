import json
from pathlib import Path
from sqlalchemy.orm import Session
from app.db.models import Base, Area, VerifiedIdentifier, LicenseRecord
from app.db.session import engine, SessionLocal

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

DEFAULT_LICENSE = {
    "licensee": "Demo Bank",
    "expires_at": "2026-12-06T01:19:20.781211+05:30",
    "signature": "4hWm5DCX8PtsEHhsZ96WJGdYuUYoUnFk8pitjKrNQNByoyBzRawtgNsmWayIg0l8/VI7RNkuDWWFyeAV2Cw2Ag=="
}

def init_db(db: Session | None = None):
    # Create all tables
    target_engine = db.get_bind() if db else engine
    Base.metadata.create_all(bind=target_engine)
    
    session = db if db else SessionLocal()
    try:
        # Seed Areas
        areas_file = DATA_DIR / "areas.json"
        if areas_file.exists():
            with open(areas_file, "r", encoding="utf-8") as f:
                areas_data = json.load(f)
            for item in areas_data:
                existing = session.query(Area).filter(Area.pincode == item["pincode"]).first()
                if not existing:
                    session.add(Area(
                        pincode=item["pincode"],
                        locality=item["locality"],
                        city=item["city"],
                        lat=float(item["lat"]),
                        lng=float(item["lng"])
                    ))
        
        # Seed Verified Identifiers
        seed_file = DATA_DIR / "verified_seed.json"
        if seed_file.exists():
            with open(seed_file, "r", encoding="utf-8") as f:
                seed_data = json.load(f)
            for item in seed_data:
                existing = session.query(VerifiedIdentifier).filter(
                    VerifiedIdentifier.identifier_type == item["identifier_type"],
                    VerifiedIdentifier.identifier_value == item["identifier_value"]
                ).first()
                if not existing:
                    session.add(VerifiedIdentifier(
                        identifier_type=item["identifier_type"],
                        identifier_value=item["identifier_value"],
                        owner_name=item["owner_name"]
                    ))

        # Seed initial Licence if none exists
        existing_lic = session.query(LicenseRecord).first()
        if not existing_lic:
            session.add(LicenseRecord(
                licensee=DEFAULT_LICENSE["licensee"],
                expires_at=DEFAULT_LICENSE["expires_at"],
                signature=DEFAULT_LICENSE["signature"]
            ))

        session.commit()
    finally:
        if not db:
            session.close()

def reseed_verified_and_areas(db: Session):
    """Used by /admin/reset to re-seed tables."""
    init_db(db)
