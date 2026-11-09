import uuid
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Challenge
from app.core.normalize import normalize_identifier

router = APIRouter()

class ChallengeRequest(BaseModel):
    identifier_type: str
    identifier_value: str
    claimant_name: str
    contact_email: str
    proof_note: str

@router.post("/challenges", status_code=status.HTTP_201_CREATED)
def submit_challenge(req: ChallengeRequest, db: Session = Depends(get_db)):
    if req.identifier_type not in ("phone", "upi", "url", "sender_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": f"Invalid identifier_type: {req.identifier_type}"}
        )

    try:
        canonical_val = normalize_identifier(req.identifier_type, req.identifier_value)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": str(e)}
        )

    challenge_id = f"ch_{uuid.uuid4().hex[:12]}"
    challenge = Challenge(
        challenge_id=challenge_id,
        identifier_type=req.identifier_type,
        identifier_value=canonical_val,
        claimant_name=req.claimant_name,
        contact_email=req.contact_email,
        proof_note=req.proof_note,
        status="under_review"
    )
    db.add(challenge)
    db.commit()

    return {
        "challenge_id": challenge_id,
        "status": "under_review"
    }
