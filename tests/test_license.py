import json
import base64
import time
from datetime import datetime, timezone, timedelta
from nacl.signing import SigningKey
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.models import Base, LicenseRecord, ServerState
from app.db.session import get_db
from app.db.init_db import init_db
from app.core.license import (
    verify_license_signature,
    activate_license,
    get_current_license_status,
    reset_license_cache,
    PUBLIC_KEY_B64,
    check_clock_tampering
)
from tools.make_license import create_license

import pytest

IST = timezone(timedelta(hours=5, minutes=30))

# In-memory test db setup
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_license_test():
    Base.metadata.create_all(bind=test_engine)
    session = TestingSession()
    init_db(session)
    session.query(LicenseRecord).delete()
    session.query(ServerState).delete()
    session.commit()
    session.close()

    app.dependency_overrides[get_db] = override_get_db
    reset_license_cache()
    yield
    app.dependency_overrides.pop(get_db, None)
    reset_license_cache()


def test_license_valid():
    """Valid signature and future expiration -> valid status with remaining seconds."""
    lic = create_license(licensee="Valid Bank", days=30)
    is_valid, msg = verify_license_signature(lic)
    assert is_valid is True, msg

    session = TestingSession()
    success, act_msg = activate_license(lic, session)
    assert success is True, act_msg

    status = get_current_license_status(session)
    session.close()

    assert status["status"] == "valid"
    assert status["licensee"] == "Valid Bank"
    assert status["seconds_remaining"] > 25 * 86400


def test_license_expired():
    """An already expired timestamp cannot be activated and evaluates to expired."""
    session = TestingSession()
    # Create manually an expired license using the same key
    from tools.make_license import KEY_FILE
    with open(KEY_FILE, "r") as f:
        priv_b64 = f.read().strip()
    sk = SigningKey(base64.b64decode(priv_b64))

    expired_dt = (datetime.now(IST) - timedelta(days=2)).isoformat()
    payload = {"expires_at": expired_dt, "licensee": "Expired Corp"}
    raw_bytes = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    sig = base64.b64encode(sk.sign(raw_bytes).signature).decode("utf-8")
    expired_lic = {"licensee": "Expired Corp", "expires_at": expired_dt, "signature": sig}

    success, msg = activate_license(expired_lic, session)
    assert success is False
    assert "already expired" in msg.lower()
    session.close()


def test_license_tampered_date():
    """Tampering with expires_at breaks signature verification."""
    lic = create_license(licensee="Legit Bank", days=5)
    # Alter the expiration timestamp by adding 10 days without resigning
    dt = datetime.fromisoformat(lic["expires_at"]) + timedelta(days=10)
    tampered_lic = {
        "licensee": lic["licensee"],
        "expires_at": dt.isoformat(),
        "signature": lic["signature"]
    }
    is_valid, msg = verify_license_signature(tampered_lic)
    assert is_valid is False
    assert "Bad signature" in msg


def test_license_wrong_signature():
    """A forged or corrupted signature fails verification."""
    lic = create_license(licensee="Legit Bank", days=5)
    lic["signature"] = "a" * len(lic["signature"])
    is_valid, msg = verify_license_signature(lic)
    assert is_valid is False


def test_upload_renews_without_restart():
    """POST /license persists to DB and immediately activates in memory without restart."""
    lic = create_license(licensee="Instant Renewal Bank", minutes=60)
    res = client.post("/license", json=lic)
    assert res.status_code == 200
    assert res.json()["ok"] is True

    # Immediate GET /license reflects new licensee and status
    res_status = client.get("/license")
    assert res_status.status_code == 200
    data = res_status.json()
    assert data["status"] == "valid"
    assert data["licensee"] == "Instant Renewal Bank"
    assert data["seconds_remaining"] > 3500


def test_only_health_and_license_reachable_when_expired():
    """When license is expired, only GET /health, /license and POST /license work; other routes return 403."""
    # Ensure no valid license
    reset_license_cache()
    session = TestingSession()
    session.query(LicenseRecord).delete()
    session.commit()
    session.close()

    # GET /health reachable
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json() == {"ok": True}

    # GET /license reachable
    res_lic = client.get("/license")
    assert res_lic.status_code == 200
    assert res_lic.json()["status"] == "expired"

    # POST /license reachable
    res_post_lic = client.post("/license", json={"licensee": "x", "expires_at": "x", "signature": "x"})
    assert res_post_lic.status_code == 400  # rejected payload, not blocked by 403!

    # Protected routes return 403 LICENSE_EXPIRED
    assert client.get("/lookup?type=phone&value=9876543210").status_code == 403
    assert client.get("/lookup?type=phone&value=9876543210").json() == {"error": "LICENSE_EXPIRED"}

    assert client.post("/reports", json={}).status_code == 403
    assert client.get("/map?days=7").status_code == 403
    assert client.get("/alerts").status_code == 403
    assert client.post("/challenges", json={}).status_code == 403


def test_data_intact_after_expiry():
    """Existing reports remain intact in DB across license expiration and renewal."""
    # 1. Activate valid license
    lic1 = create_license(licensee="Data Persistence Bank", minutes=10)
    client.post("/license", json=lic1)

    # 2. Add a report
    rep = {
        "report_id": "rep_persist_test_1",
        "occurred_at": "2026-10-27T18:21:04+05:30",
        "reported_at": "2026-10-27T18:40:04+05:30",
        "reporter_id": "rep_user_persist",
        "channel": "Phone call",
        "scam_type": "digital-arrest",
        "identifier_type": "phone",
        "identifier_value": "+919876543210",
        "pincode": "560102",
        "locality": "HSR Layout",
        "city": "Bengaluru",
        "note": "Threatened police arrest over video call"
    }
    res_rep = client.post("/reports", json=rep)
    assert res_rep.status_code == 201

    # 3. Simulate licence expiry
    reset_license_cache()
    session = TestingSession()
    session.query(LicenseRecord).delete()
    session.commit()
    session.close()

    # Route is blocked
    assert client.get("/lookup?type=phone&value=%2B919876543210").status_code == 403

    # 4. Upload renewed license
    lic2 = create_license(licensee="Data Persistence Bank Renewed", days=10)
    res_upload = client.post("/license", json=lic2)
    assert res_upload.status_code == 200

    # 5. Verify lookup now succeeds and the report is still there!
    res_lookup = client.get("/lookup?type=phone&value=%2B919876543210")
    assert res_lookup.status_code == 200
    data = res_lookup.json()
    assert data["report_count"] >= 1
    assert data["scam_type"] == "digital-arrest"


def test_clock_moved_back_makes_server_refuse():
    """If server clock is moved back (>120s prior to max_seen_time), server treats license as expired."""
    lic = create_license(licensee="Anti Tamper Bank", days=30)
    client.post("/license", json=lic)

    # Simulate that server recorded time in future (e.g. 1000 seconds ahead), then clock was rolled back
    session = TestingSession()
    now_ts = time.time()
    future_time = now_ts + 600.0  # 10 minutes in the future

    state = session.query(ServerState).filter(ServerState.key == "max_seen_time").first()
    if not state:
        state = ServerState(key="max_seen_time", value=str(future_time))
        session.add(state)
    else:
        state.value = str(future_time)
    session.commit()

    # Clock tampering detected!
    assert check_clock_tampering(session) is True

    status = get_current_license_status(session)
    session.close()

    assert status["status"] == "expired"
    assert status["reason"] == "clock_tampered"

    # API call returns 403 LICENSE_EXPIRED
    res = client.get("/lookup?type=phone&value=%2B919876543210")
    assert res.status_code == 403
    assert res.json() == {"error": "LICENSE_EXPIRED"}
