from datetime import datetime, timezone, timedelta
import time
from typing import Optional, Dict, List
from collections import defaultdict

from fastapi import APIRouter, Request, HTTPException, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Report, Area
from app.core.normalize import normalize_identifier
from app.core.security import hash_reporter_id, hash_ip_prefix
from app.trust.shingles import extract_note_features

router = APIRouter()

# Valid scam types & channels
VALID_SCAM_TYPES = {
    "digital-arrest", "fake-kyc-link", "upi-refund-qr", "investment-group",
    "courier-customs", "job-offer", "lottery-prize", "loan-app-harassment",
    "electricity-disconnection", "fake-customer-care", "otp-call", "sextortion", "other"
}

VALID_CHANNELS = {
    "Phone call", "SMS or WhatsApp", "QR code", "Fake website", "UPI request", "Something else"
}

# In-memory rate limiting: reporter_key -> list of unix timestamps
RATE_LIMIT_TIMESTAMPS: Dict[str, List[float]] = defaultdict(list)
MAX_REPORTS_PER_MINUTE = 30

class ReportRequest(BaseModel):
    report_id: str
    occurred_at: str
    reported_at: str
    reporter_id: Optional[str] = None
    ip_prefix: Optional[str] = None
    channel: str = "Something else"
    scam_type: str = "other"
    identifier_type: str
    identifier_value: str
    pincode: str
    locality: str
    city: str
    note: Optional[str] = ""
    has_screenshot: bool = False
    amount_lost_inr: float = 0.0

def parse_iso_datetime(dt_str: str) -> datetime:
    try:
        # Normalize trailing Z if present
        if dt_str.endswith("Z"):
            dt_str = dt_str[:-1] + "+00:00"
        return datetime.fromisoformat(dt_str)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": f"Unparseable datetime string: {dt_str}"}
        )

@router.post("/reports", status_code=status.HTTP_201_CREATED)
def submit_report(
    req: ReportRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    # 1. Validate identifier_type
    if req.identifier_type not in ("phone", "upi", "url", "sender_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": f"Invalid identifier_type: {req.identifier_type}"}
        )

    # 2. Normalize identifier_value
    try:
        canonical_val = normalize_identifier(req.identifier_type, req.identifier_value)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": str(e)}
        )

    # 3. Validate pincode against Area table
    area = db.query(Area).filter(Area.pincode == req.pincode.strip()).first()
    if not area:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": f"Pincode {req.pincode} not in area database"}
        )

    # 4. Parse timestamps
    occurred_dt = parse_iso_datetime(req.occurred_at)
    reported_dt = parse_iso_datetime(req.reported_at)

    # Convert to UTC or ensure timezone awareness
    now_utc = datetime.now(timezone.utc)
    occurred_utc = occurred_dt.astimezone(timezone.utc) if occurred_dt.tzinfo else occurred_dt.replace(tzinfo=timezone.utc)

    # Check future threshold: occurred_at > now + 10 minutes
    if occurred_utc > (now_utc + timedelta(minutes=10)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "occurred_at cannot be more than 10 minutes in the future"}
        )

    # 5. Sanitize scam_type and channel
    scam_type = req.scam_type if req.scam_type in VALID_SCAM_TYPES else "other"
    channel = req.channel if req.channel in VALID_CHANNELS else "Something else"

    case_id = f"{req.identifier_type}:{canonical_val}"

    # 6. Idempotency check: if report_id already exists, return existing
    existing_rep = db.query(Report).filter(Report.report_id == req.report_id).first()
    if existing_rep:
        # Check if there were earlier reports for this case
        earlier_count = db.query(Report).filter(
            Report.case_id == existing_rep.case_id,
            Report.report_id != existing_rep.report_id
        ).count()
        return {
            "report_id": existing_rep.report_id,
            "case_id": existing_rep.case_id,
            "merged": earlier_count > 0
        }

    # 7. Privacy-preserving identity keys
    client_ip = request.client.host if request.client else None
    reporter_key = hash_reporter_id(req.reporter_id, client_ip)
    ip_key = hash_ip_prefix(req.ip_prefix, client_ip)

    # 8. Rate limiting (extreme abuse > 30 per min per reporter_key)
    current_ts = time.time()
    ts_list = RATE_LIMIT_TIMESTAMPS[reporter_key]
    # Prune timestamps older than 60s
    valid_ts = [ts for ts in ts_list if current_ts - ts < 60.0]
    if len(valid_ts) >= MAX_REPORTS_PER_MINUTE:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"error": "Rate limit exceeded (more than 30 reports/minute)"}
        )
    valid_ts.append(current_ts)
    RATE_LIMIT_TIMESTAMPS[reporter_key] = valid_ts

    # 9. Check merged status (was there an earlier report for the same case?)
    earlier_exists = db.query(Report).filter(Report.case_id == case_id).first() is not None

    # 10. Extract note features
    note_feat = extract_note_features(req.note)

    # 11. Save report to DB (never store raw note, raw reporter_id, or raw IP!)
    new_report = Report(
        report_id=req.report_id,
        case_id=case_id,
        identifier_type=req.identifier_type,
        identifier_value=canonical_val,
        occurred_at=occurred_utc,
        reported_at=reported_dt.astimezone(timezone.utc) if reported_dt.tzinfo else reported_dt.replace(tzinfo=timezone.utc),
        received_at=now_utc,
        channel=channel,
        scam_type=scam_type,
        pincode=req.pincode.strip(),
        locality=req.locality.strip() or area.locality,
        city=req.city.strip() or area.city,
        reporter_key=reporter_key,
        ip_key=ip_key,
        note_length=note_feat["length"],
        note_is_empty=note_feat["is_empty"],
        has_screenshot=req.has_screenshot,
        amount_lost_inr=float(req.amount_lost_inr or 0.0)
    )
    new_report.note_shingles = note_feat["shingles"]

    db.add(new_report)
    db.commit()

    return {
        "report_id": req.report_id,
        "case_id": case_id,
        "merged": earlier_exists
    }
