from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    Text,
    Index,
)
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class VerifiedIdentifier(Base):
    __tablename__ = "verified_identifiers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    identifier_type = Column(String(32), nullable=False)
    identifier_value = Column(String(255), nullable=False)
    owner_name = Column(String(255), nullable=False)

    __table_args__ = (
        Index("ix_verified_type_val", "identifier_type", "identifier_value", unique=True),
    )


class Area(Base):
    __tablename__ = "areas"

    pincode = Column(String(10), primary_key=True)
    locality = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)


class Report(Base):
    __tablename__ = "reports"

    report_id = Column(String(64), primary_key=True)
    case_id = Column(String(255), nullable=False, index=True)
    identifier_type = Column(String(32), nullable=False)
    identifier_value = Column(String(255), nullable=False)
    occurred_at = Column(DateTime(timezone=True), nullable=False, index=True)
    reported_at = Column(DateTime(timezone=True), nullable=False)
    received_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    channel = Column(String(64), nullable=False)
    scam_type = Column(String(64), nullable=False)
    pincode = Column(String(10), nullable=False, index=True)
    locality = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    
    # Privacy-preserving hashed keys
    reporter_key = Column(String(64), nullable=False, index=True)
    ip_key = Column(String(64), nullable=False)
    
    # Note features only (raw notes are never stored!)
    note_length = Column(Integer, nullable=False, default=0)
    note_is_empty = Column(Boolean, nullable=False, default=True)
    note_shingles_json = Column(Text, nullable=False, default="[]")
    
    has_screenshot = Column(Boolean, nullable=False, default=False)
    amount_lost_inr = Column(Float, nullable=False, default=0.0)

    __table_args__ = (
        Index("ix_reports_type_val", "identifier_type", "identifier_value"),
        Index("ix_reports_case_occurred", "case_id", "occurred_at"),
        Index("ix_reports_pincode_occurred", "pincode", "occurred_at"),
    )

    @property
    def note_shingles(self) -> list:
        try:
            return json.loads(self.note_shingles_json)
        except Exception:
            return []

    @note_shingles.setter
    def note_shingles(self, val: list):
        self.note_shingles_json = json.dumps(val)


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    challenge_id = Column(String(64), unique=True, nullable=False, index=True)
    identifier_type = Column(String(32), nullable=False)
    identifier_value = Column(String(255), nullable=False)
    claimant_name = Column(String(255), nullable=False)
    contact_email = Column(String(255), nullable=False)
    proof_note = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default="under_review")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_challenges_type_val", "identifier_type", "identifier_value"),
    )


class LicenseRecord(Base):
    __tablename__ = "licenses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    licensee = Column(String(255), nullable=False)
    expires_at = Column(String(64), nullable=False)
    signature = Column(String(255), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class ServerState(Base):
    __tablename__ = "server_state"

    key = Column(String(64), primary_key=True)
    value = Column(Text, nullable=False)
