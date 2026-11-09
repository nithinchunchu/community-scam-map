from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Report, Challenge, VerifiedIdentifier, Area
from app.db.init_db import reseed_verified_and_areas
from app.api.reports import RATE_LIMIT_TIMESTAMPS

router = APIRouter()

@router.get("/admin/db-inspect")
def inspect_database(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Live database inspector for judges and administrators.
    Returns live database counts and sanitized records.
    """
    total_reports = db.query(Report).count()
    total_challenges = db.query(Challenge).count()
    total_verified = db.query(VerifiedIdentifier).count()
    total_areas = db.query(Area).count()

    recent_reports = (
        db.query(Report)
        .order_by(Report.occurred_at.desc())
        .limit(limit)
        .all()
    )

    challenges = (
        db.query(Challenge)
        .order_by(Challenge.created_at.desc())
        .limit(limit)
        .all()
    )

    verified = (
        db.query(VerifiedIdentifier)
        .order_by(VerifiedIdentifier.owner_name.asc())
        .all()
    )

    return {
        "summary": {
            "total_reports": total_reports,
            "total_challenges": total_challenges,
            "total_verified": total_verified,
            "total_areas": total_areas,
        },
        "recent_reports": [
            {
                "report_id": r.report_id,
                "case_id": r.case_id,
                "identifier_type": r.identifier_type,
                "identifier_value": r.identifier_value,
                "scam_type": r.scam_type,
                "channel": r.channel,
                "pincode": r.pincode,
                "locality": r.locality,
                "city": r.city,
                "occurred_at": r.occurred_at.isoformat() if r.occurred_at else None,
                "reported_at": r.reported_at.isoformat() if r.reported_at else None,
                "has_screenshot": bool(r.has_screenshot),
                "amount_lost_inr": float(r.amount_lost_inr or 0.0),
            }
            for r in recent_reports
        ],
        "challenges": [
            {
                "challenge_id": c.challenge_id,
                "identifier_type": c.identifier_type,
                "identifier_value": c.identifier_value,
                "claimant_name": c.claimant_name,
                "status": c.status,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in challenges
        ],
        "verified_identifiers": [
            {
                "identifier_type": v.identifier_type,
                "identifier_value": v.identifier_value,
                "owner_name": v.owner_name,
            }
            for v in verified
        ],
    }

@router.post("/admin/reset")
def reset_database(db: Session = Depends(get_db)):
    """
    Deletes all reports and challenges.
    Clears in-memory caches.
    Re-seeds verified business and areas tables.
    Does NOT delete the licence.
    """
    # Delete reports and challenges
    db.query(Report).delete()
    db.query(Challenge).delete()
    db.commit()

    # Clear rate limiter cache
    RATE_LIMIT_TIMESTAMPS.clear()

    # Re-seed verified and areas
    reseed_verified_and_areas(db)

    return {"ok": True}
