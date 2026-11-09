import base64
import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import get_db
from app.db.init_db import init_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.models import Base

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

def _create_test_image_b64() -> str:
    img = Image.new("RGB", (120, 120), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def test_scan_screenshot_digital_arrest(client):
    b64 = _create_test_image_b64()
    res = client.post(
        "/scan-screenshot",
        json={
            "image_base64": b64,
            "filename": "cbi_police_digital_arrest_notice_warrant.jpg"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["scam_type"] == "digital-arrest"
    assert data["urgency_level"] in ("CRITICAL", "HIGH")
    assert data["risk_score"] >= 80
    assert len(data["artifacts_detected"]) > 0

def test_scan_screenshot_verified_seed_immunity(client):
    b64 = _create_test_image_b64()
    res = client.post(
        "/scan-screenshot",
        json={
            "image_base64": b64,
            "filename": "official_receipt_freshbakes@okaxis.jpg"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["verdict"] == "VERIFIED_BUSINESS"
    assert data["risk_score"] == 0
    assert data["urgency_level"] == "LOW"

def test_scan_screenshot_corrupt_data(client):
    res = client.post(
        "/scan-screenshot",
        json={"image_base64": "not_a_valid_base64_image"}
    )
    assert res.status_code == 400

def test_scan_screenshot_missing_image(client):
    res = client.post(
        "/scan-screenshot",
        json={}
    )
    assert res.status_code == 400

def test_scan_screenshot_status_endpoint(client):
    res = client.get("/scan-screenshot/status")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "active_engine" in data
    assert "hint" in data
