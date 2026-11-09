import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import Base, Report, VerifiedIdentifier, Challenge, Area
from app.trust.engine import evaluate_identifier
from app.trust.shingles import extract_note_features
from app.core.security import hash_reporter_id, hash_ip_prefix
from app.core.normalize import normalize_identifier

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed verified business
    session.add(VerifiedIdentifier(
        identifier_type="phone",
        identifier_value="+918041002233",
        owner_name="Fresh Bakes, Indiranagar"
    ))
    session.commit()

    yield session
    session.close()


def create_dummy_report(
    session,
    id_type: str,
    id_val: str,
    report_id: str,
    reporter_id: str,
    ip_prefix: str,
    note: str,
    occurred_at: datetime,
    has_screenshot: bool = False,
    amount_lost_inr: float = 0.0
):
    canonical = normalize_identifier(id_type, id_val)
    case_id = f"{id_type}:{canonical}"
    feat = extract_note_features(note)
    rep = Report(
        report_id=report_id,
        case_id=case_id,
        identifier_type=id_type,
        identifier_value=canonical,
        occurred_at=occurred_at,
        reported_at=occurred_at,
        received_at=occurred_at,
        channel="Phone call",
        scam_type="digital-arrest",
        pincode="560102",
        locality="HSR Layout",
        city="Bengaluru",
        reporter_key=hash_reporter_id(reporter_id),
        ip_key=hash_ip_prefix(ip_prefix),
        note_length=feat["length"],
        note_is_empty=feat["is_empty"],
        has_screenshot=has_screenshot,
        amount_lost_inr=amount_lost_inr
    )
    rep.note_shingles = feat["shingles"]
    session.add(rep)
    session.commit()
    return rep


def test_single_person_spamming(db_session):
    """Trick 1: One person reporting 6 times must collapse to 1 person -> SUSPICIOUS, never KNOWN_SCAM."""
    phone = "+919999988888"
    base_time = datetime(2026, 10, 27, 10, 0, 0, tzinfo=timezone.utc)

    for i in range(6):
        create_dummy_report(
            db_session,
            id_type="phone",
            id_val=phone,
            report_id=f"rep_spam_{i}",
            reporter_id="same_reporter_123",
            ip_prefix="103.21.58",
            note=f"Different note attempt number {i} to look real",
            occurred_at=base_time + timedelta(minutes=i * 5)
        )

    res = evaluate_identifier("phone", "+919999988888", db_session)
    assert res["report_count"] == 6
    assert res["distinct_reporters"] == 1
    assert res["verdict"] == "SUSPICIOUS"
    # Should be masked because distinct_reporters < 3
    assert res["display_value"] == "99XXXXX888"


def test_fake_accounts_same_wifi(db_session):
    """Trick 2: 22 fake accounts from same Wi-Fi (same IP) within 60 minutes collapse to 1 person."""
    phone = "+919888877777"
    base_time = datetime(2026, 10, 27, 12, 0, 0, tzinfo=timezone.utc)

    for i in range(22):
        create_dummy_report(
            db_session,
            id_type="phone",
            id_val=phone,
            report_id=f"rep_wifi_{i}",
            reporter_id=f"fake_account_{i}",
            ip_prefix="192.168.1",  # Same Wi-Fi
            note=f"Unique account story {i} from identical connection",
            occurred_at=base_time + timedelta(minutes=i)  # All within 22 mins
        )

    res = evaluate_identifier("phone", "+919888877777", db_session)
    assert res["report_count"] == 22
    assert res["distinct_reporters"] == 1
    assert res["verdict"] == "SUSPICIOUS"


def test_copy_paste_report_bombing(db_session):
    """Trick 3: 40 friends reporting with identical copy-pasted text collapse via Jaccard >= 0.7."""
    phone = "+919777766666"
    base_time = datetime(2026, 10, 27, 14, 0, 0, tzinfo=timezone.utc)
    shared_text = "FRAUD ALERT: Do not buy from this store they stole money from my card and ran away!"

    for i in range(40):
        create_dummy_report(
            db_session,
            id_type="phone",
            id_val=phone,
            report_id=f"rep_copypaste_{i}",
            reporter_id=f"friend_{i}",
            ip_prefix=f"10.{i}.0",  # Different IPs
            note=shared_text,
            occurred_at=base_time + timedelta(minutes=i * 2)
        )

    res = evaluate_identifier("phone", "+919777766666", db_session)
    assert res["report_count"] == 40
    assert res["distinct_reporters"] == 1
    assert res["verdict"] == "SUSPICIOUS"


def test_coordination_burst_gate(db_session):
    """Trick 4: Coordination gate stops bursts with low IP entropy."""
    phone = "+919666655555"
    base_time = datetime(2026, 10, 27, 15, 0, 0, tzinfo=timezone.utc)

    # 10 accounts from only 2 distinct IPs arriving within 20 minutes with varied text
    for i in range(10):
        ip = "10.0.0" if i % 2 == 0 else "10.0.1"
        create_dummy_report(
            db_session,
            id_type="phone",
            id_val=phone,
            report_id=f"rep_coord_{i}",
            reporter_id=f"bot_{i}",
            ip_prefix=ip,
            note=f"Different text describing a strange issue number {i*17}",
            occurred_at=base_time + timedelta(minutes=i * 2)
        )

    res = evaluate_identifier("phone", "+919666655555", db_session)
    # Burst has 2 IPs / 10 persons < 0.5 -> collapses to 1 coordinated person!
    assert res["distinct_reporters"] == 1
    assert res["verdict"] == "SUSPICIOUS"


def test_real_campaign_passes_to_known_scam(db_session):
    """Real campaign: 4 independent citizens, different IPs, varied notes, distinct reporters >= 3, score >= 2.5."""
    phone = "+919876543210"
    base_time = datetime(2026, 10, 27, 9, 0, 0, tzinfo=timezone.utc)

    reporters_data = [
        ("r_alice", "103.21.58", "Received digital arrest video call from someone claiming to be CBI police officer.", True, 25000),
        ("r_bob", "49.207.12", "Fake courier call saying customs parcel held drugs in Mumbai airport.", False, 0),
        ("r_charlie", "157.48.91", "Demanded immediate money transfer to avoid police coming to house.", True, 5000),
        ("r_david", "117.211.3", "Threatening calls impersonating cyber police department.", False, 0),
    ]

    for idx, (rep_id, ip, note, scr, amt) in enumerate(reporters_data):
        create_dummy_report(
            db_session,
            id_type="phone",
            id_val=phone,
            report_id=f"rep_real_{idx}",
            reporter_id=rep_id,
            ip_prefix=ip,
            note=note,
            occurred_at=base_time + timedelta(hours=idx * 3),
            has_screenshot=scr,
            amount_lost_inr=amt
        )

    res = evaluate_identifier("phone", "+919876543210", db_session)
    assert res["distinct_reporters"] == 4
    assert res["verdict"] == "KNOWN_SCAM"
    # Unmasked because distinct_reporters >= 3
    assert res["display_value"] == "+919876543210"


def test_verified_business_immune(db_session):
    """Verified business always returns VERIFIED_BUSINESS even if malicious reports are submitted."""
    phone = "+918041002233"  # Fresh Bakes, Indiranagar in seed table
    base_time = datetime(2026, 10, 27, 11, 0, 0, tzinfo=timezone.utc)

    for i in range(5):
        create_dummy_report(
            db_session,
            id_type="phone",
            id_val=phone,
            report_id=f"rep_attack_bakery_{i}",
            reporter_id=f"competitor_{i}",
            ip_prefix=f"172.16.{i}",
            note=f"Competitor claim {i}",
            occurred_at=base_time + timedelta(hours=i)
        )

    res = evaluate_identifier("phone", "+918041002233", db_session)
    assert res["verdict"] == "VERIFIED_BUSINESS"
    assert res["verified_name"] == "Fresh Bakes, Indiranagar"
    assert res["display_value"] == "+918041002233"


def test_dispute_caps_verdict(db_session):
    """Under review challenge caps verdict at SUSPICIOUS instead of KNOWN_SCAM."""
    phone = "+919555544444"
    base_time = datetime(2026, 10, 27, 10, 0, 0, tzinfo=timezone.utc)

    # 4 distinct reports that would normally trigger KNOWN_SCAM
    for i in range(4):
        create_dummy_report(
            db_session,
            id_type="phone",
            id_val=phone,
            report_id=f"rep_disp_{i}",
            reporter_id=f"person_{i}",
            ip_prefix=f"200.1.{i}",
            note=f"Detailed report number {i} with high quality description here",
            occurred_at=base_time + timedelta(hours=i),
            has_screenshot=True,
            amount_lost_inr=1000
        )

    # File challenge
    db_session.add(Challenge(
        challenge_id="ch_12345",
        identifier_type="phone",
        identifier_value=phone,
        claimant_name="Legit Business Owner",
        contact_email="owner@legit.com",
        proof_note="GST certificate attached",
        status="under_review"
    ))
    db_session.commit()

    res = evaluate_identifier("phone", phone, db_session)
    assert res["challenged"] is True
    # Verdict must be capped at SUSPICIOUS, never KNOWN_SCAM!
    assert res["verdict"] == "SUSPICIOUS"
