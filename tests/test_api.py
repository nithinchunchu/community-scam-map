import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.models import Base
from app.db.session import get_db
from app.db.init_db import init_db

from sqlalchemy.pool import StaticPool

# Setup test in-memory SQLite database with StaticPool
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    init_db(session)
    session.close()

@pytest.fixture
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.pop(get_db, None)


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_root_index(client):
    response = client.get("/")
    assert response.status_code == 200
    # Checks that root serves the frontend HTML application or API ready status
    assert "Community Scam Map" in response.text or "status" in response.text


def test_reports_invalid_identifier(client):
    payload = {
        "report_id": "rep_invalid_1",
        "occurred_at": "2026-10-27T18:21:04+05:30",
        "reported_at": "2026-10-27T18:40:04+05:30",
        "identifier_type": "phone",
        "identifier_value": "12345",
        "pincode": "560102",
        "locality": "HSR Layout",
        "city": "Bengaluru"
    }
    response = client.post("/reports", json=payload)
    assert response.status_code == 400


def test_reports_invalid_pincode(client):
    payload = {
        "report_id": "rep_invalid_pincode",
        "occurred_at": "2026-10-27T18:21:04+05:30",
        "reported_at": "2026-10-27T18:40:04+05:30",
        "identifier_type": "phone",
        "identifier_value": "+91 98765 43210",
        "pincode": "999999",  # Not in 27 valid areas
        "locality": "Nowhere",
        "city": "Unknown"
    }
    response = client.post("/reports", json=payload)
    assert response.status_code == 400


def test_reports_future_timestamp(client):
    # More than 10 minutes in the future
    future_time = (datetime.now(timezone.utc) + timedelta(minutes=25)).isoformat()
    payload = {
        "report_id": "rep_future",
        "occurred_at": future_time,
        "reported_at": future_time,
        "identifier_type": "phone",
        "identifier_value": "+91 98765 43210",
        "pincode": "560102",
        "locality": "HSR Layout",
        "city": "Bengaluru"
    }
    response = client.post("/reports", json=payload)
    assert response.status_code == 400


def test_reports_submission_and_lookup_lifecycle(client):
    # 1. Lookup before any report -> NO_REPORTS, masked
    res = client.get("/lookup?type=phone&value=%2B919876543210")
    assert res.status_code == 200
    data = res.json()
    assert data["verdict"] == "NO_REPORTS"
    assert data["report_count"] == 0
    assert data["distinct_reporters"] == 0
    assert data["display_value"] == "98XXXXX210"

    # 2. First report
    rep1 = {
        "report_id": "rep_001",
        "occurred_at": "2026-10-27T10:00:00+05:30",
        "reported_at": "2026-10-27T10:05:00+05:30",
        "reporter_id": "reporter_alpha",
        "ip_prefix": "103.21.58",
        "channel": "Phone call",
        "scam_type": "digital-arrest",
        "identifier_type": "phone",
        "identifier_value": "+91 98765 43210",
        "pincode": "560102",
        "locality": "HSR Layout",
        "city": "Bengaluru",
        "note": "First report note claiming digital arrest scam",
        "has_screenshot": True,
        "amount_lost_inr": 50000
    }
    res = client.post("/reports", json=rep1)
    assert res.status_code == 201
    assert res.json()["merged"] is False

    # 3. Duplicate report_id (Idempotency)
    res_dup = client.post("/reports", json=rep1)
    assert res_dup.status_code == 201
    assert res_dup.json()["report_id"] == "rep_001"

    # 4. Lookup now shows SUSPICIOUS (only 1 reporter), masked
    res = client.get("/lookup?type=phone&value=09876543210")
    assert res.status_code == 200
    data = res.json()
    assert data["verdict"] == "SUSPICIOUS"
    assert data["distinct_reporters"] == 1
    assert data["display_value"] == "98XXXXX210"
    assert len(data["evidence"]) == 1

    # 5. Submit 2 more distinct reports to cross threshold (>= 3 distinct reporters)
    rep2 = {
        "report_id": "rep_002",
        "occurred_at": "2026-10-27T12:00:00+05:30",
        "reported_at": "2026-10-27T12:05:00+05:30",
        "reporter_id": "reporter_beta",
        "ip_prefix": "49.207.12",
        "channel": "Phone call",
        "scam_type": "digital-arrest",
        "identifier_type": "phone",
        "identifier_value": "98765-43210",
        "pincode": "560038",
        "locality": "Indiranagar",
        "city": "Bengaluru",
        "note": "Another user received the same threat about customs narcotics parcel",
        "has_screenshot": True,
        "amount_lost_inr": 15000
    }
    res = client.post("/reports", json=rep2)
    assert res.status_code == 201
    assert res.json()["merged"] is True

    rep3 = {
        "report_id": "rep_003",
        "occurred_at": "2026-10-27T14:00:00+05:30",
        "reported_at": "2026-10-27T14:05:00+05:30",
        "reporter_id": "reporter_gamma",
        "ip_prefix": "157.48.91",
        "channel": "Phone call",
        "scam_type": "digital-arrest",
        "identifier_type": "phone",
        "identifier_value": "919876543210",
        "pincode": "560034",
        "locality": "Koramangala",
        "city": "Bengaluru",
        "note": "Extortion attempt over Skype video with fake uniform",
        "has_screenshot": True,
        "amount_lost_inr": 20000
    }
    res = client.post("/reports", json=rep3)
    assert res.status_code == 201
    assert res.json()["merged"] is True

    # 6. Lookup now shows KNOWN_SCAM and unmasked full phone number!
    res = client.get("/lookup?type=phone&value=%2B919876543210")
    assert res.status_code == 200
    data = res.json()
    assert data["verdict"] == "KNOWN_SCAM"
    assert data["distinct_reporters"] == 3
    assert data["display_value"] == "+919876543210"


def test_verified_identifier_lookup(client):
    # Lookup for 1930 (Helpline)
    res = client.get("/lookup?type=phone&value=1930")
    assert res.status_code == 200
    data = res.json()
    assert data["verdict"] == "VERIFIED_BUSINESS"
    assert data["verified_name"] == "National Cybercrime Helpline"
    assert data["display_value"] == "1930"


def test_challenges_and_capping(client):
    challenge_payload = {
        "identifier_type": "phone",
        "identifier_value": "+91 98765 43210",
        "claimant_name": "Telecom Legal Dept",
        "contact_email": "legal@telecom.example",
        "proof_note": "Government telecom registry certificate attached"
    }
    res = client.post("/challenges", json=challenge_payload)
    assert res.status_code == 201
    assert res.json()["status"] == "under_review"

    # Now lookup on +919876543210 should have challenged: True and capped at SUSPICIOUS
    res = client.get("/lookup?type=phone&value=%2B919876543210")
    assert res.status_code == 200
    data = res.json()
    assert data["challenged"] is True
    assert data["verdict"] == "SUSPICIOUS"  # Capped from KNOWN_SCAM!


def test_admin_reset(client):
    res = client.post("/admin/reset")
    assert res.status_code == 200
    assert res.json() == {"ok": True}

    # All reports and challenges should be gone
    res = client.get("/lookup?type=phone&value=%2B919876543210")
    assert res.status_code == 200
    assert res.json()["verdict"] == "NO_REPORTS"
    assert res.json()["report_count"] == 0

    # Verified seed should still be preserved
    res_verified = client.get("/lookup?type=phone&value=1930")
    assert res_verified.status_code == 200
    assert res_verified.json()["verdict"] == "VERIFIED_BUSINESS"
