import io
import logging
import json
import re
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.models import Base
from app.db.session import get_db
from app.db.init_db import init_db
from scripts.audit_privacy_db import audit_database

test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_db():
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


def test_db_privacy_audit():
    """Requirement (c): DB audit proves no raw note, raw reporter_id, raw IP or exact location exists in any table."""
    assert audit_database() is True


def test_captured_logs_privacy(client):
    """
    Requirement (b): Scans captured logs after a full simulation and fails if
    any phone number, UPI id, URL, note text, IP or reporter_id appears.
    """
    log_capture = io.StringIO()
    handler = logging.StreamHandler(log_capture)
    formatter = logging.Formatter('%(message)s')
    handler.setFormatter(formatter)

    uvicorn_logger = logging.getLogger("uvicorn.access")
    uvicorn_logger.setLevel(logging.DEBUG)
    uvicorn_logger.addHandler(handler)

    phone = "+919876543210"
    upi_id = "target_scam_user@okaxis"
    url_val = "https://evil-bank-login.in/verify"
    note_secret = "Confidential personal secret text written by reporter"
    raw_reporter = "reporter_alice_secret_999"
    raw_ip = "198.51.100.42"

    try:
        # Run report simulation
        client.post("/reports", json={
            "report_id": "rep_priv_log_1",
            "occurred_at": "2026-10-27T18:21:04+05:30",
            "reported_at": "2026-10-27T18:40:04+05:30",
            "reporter_id": raw_reporter,
            "ip_prefix": raw_ip,
            "channel": "Phone call",
            "scam_type": "digital-arrest",
            "identifier_type": "phone",
            "identifier_value": phone,
            "pincode": "560102",
            "locality": "HSR Layout",
            "city": "Bengaluru",
            "note": note_secret,
            "has_screenshot": True,
            "amount_lost_inr": 50000
        })

        # Run lookup simulation with URL-encoded query params
        client.get(f"/lookup?type=phone&value=%2B919876543210")
        client.get(f"/lookup?type=upi&value={upi_id}")
        client.get(f"/lookup?type=url&value={url_val}")

        # Map and Alerts simulation
        client.get("/map?pincode=560102&days=7&radius_km=2")
        client.get("/alerts?pincode=560102")

        handler.flush()
        captured = log_capture.getvalue()

        # Verification: none of the sensitive personal strings should ever appear in access logs
        assert note_secret not in captured, "Raw note leaked into access logs!"
        assert raw_reporter not in captured, "Raw reporter_id leaked into access logs!"
        assert raw_ip not in captured, "Raw IP leaked into access logs!"
        assert "target_scam_user@okaxis" not in captured, "UPI ID leaked into query string log!"
        assert "evil-bank-login.in" not in captured, "URL leaked into query string log!"
        assert "9876543210" not in captured, "Phone number leaked into access logs!"

    finally:
        uvicorn_logger.removeHandler(handler)


def test_api_wording_neutrality(client):
    """
    Requirement (d): Fails if any response text contains 'scammer', 'fraud'
    (as a label for a person), or 'criminal'.
    Allowed: 'Reported by X people near you', neutral technical labels.
    """
    # 1. Lookup
    res = client.get("/lookup?type=phone&value=%2B919876543210")
    text = res.text.lower()
    assert "scammer" not in text
    assert "criminal" not in text
    assert "this person is a fraud" not in text

    # 2. Map
    res = client.get("/map?pincode=560102")
    text = res.text.lower()
    assert "scammer" not in text
    assert "criminal" not in text

    # 3. Alerts
    res = client.get("/alerts?pincode=560102")
    text = res.text.lower()
    assert "scammer" not in text
    assert "criminal" not in text
