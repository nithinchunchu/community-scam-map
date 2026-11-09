from typing import Optional
from fastapi import APIRouter, Query, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.normalize import normalize_identifier
from app.trust.engine import evaluate_identifier

router = APIRouter()

@router.get("/lookup")
def lookup_identifier(
    type: Optional[str] = Query(None, description="Identifier type: phone, upi, url, sender_id"),
    value: Optional[str] = Query(None, description="Identifier value (URL encoded)"),
    db: Session = Depends(get_db)
):
    # 1. Validate type
    if not type or type not in ("phone", "upi", "url", "sender_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": f"Invalid or missing type: '{type}'. Must be one of phone, upi, url, sender_id"}
        )

    # 2. Validate value
    if not value or not value.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Missing or empty value"}
        )

    # 3. Canonicalize value
    try:
        canonical_val = normalize_identifier(type, value)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": str(e)}
        )

    # 4. Evaluate identifier using the trust engine
    result = evaluate_identifier(type, canonical_val, db)

    # Format response (strip internal helper field effective_reports)
    response = {
        "verdict": result["verdict"],
        "report_count": result["report_count"],
        "distinct_reporters": result["distinct_reporters"],
        "first_seen": result["first_seen"],
        "last_seen": result["last_seen"],
        "scam_type": result["scam_type"],
        "display_value": result["display_value"],
        "evidence": result["evidence"],
        "challenged": result["challenged"]
    }
    if "verified_name" in result:
        response["verified_name"] = result["verified_name"]

    return response
