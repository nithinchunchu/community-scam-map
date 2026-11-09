from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.license import get_current_license_status, activate_license

router = APIRouter()

class LicensePayload(BaseModel):
    licensee: str
    expires_at: str
    signature: str

@router.get("/license")
def get_license(db: Session = Depends(get_db)):
    return get_current_license_status(db)

@router.post("/license")
def upload_license(payload: LicensePayload, db: Session = Depends(get_db)):
    success, msg = activate_license(payload.model_dump(), db)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": msg}
        )
    return {"ok": True, "message": msg}
