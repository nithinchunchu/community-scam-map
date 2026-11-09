import base64
import json
import time
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError
from sqlalchemy.orm import Session

from app.db.models import LicenseRecord, ServerState
from app.db.session import SessionLocal

PUBLIC_KEY_B64 = os.getenv("LICENSE_PUBLIC_KEY", "R3eD8eYRgqVCUzAK6RIB53iJ9OwfiDMcbfPwPYMjml4=")
IST = timezone(timedelta(hours=5, minutes=30))

# In-memory cached licence state
CACHED_LICENSE: Optional[Dict[str, Any]] = None
LAST_MAX_SEEN_FLUSH: float = 0.0

def verify_license_signature(license_obj: dict) -> Tuple[bool, str]:
    """Verifies the Ed25519 signature of a licence payload."""
    try:
        licensee = license_obj.get("licensee")
        expires_at = license_obj.get("expires_at")
        sig_b64 = license_obj.get("signature")

        if not licensee or not expires_at or not sig_b64:
            return False, "Missing required fields"

        canonical_bytes = json.dumps(
            {"expires_at": expires_at, "licensee": licensee},
            sort_keys=True,
            separators=(",", ":")
        ).encode("utf-8")

        verify_key = VerifyKey(base64.b64decode(PUBLIC_KEY_B64))
        signature_bytes = base64.b64decode(sig_b64)
        verify_key.verify(canonical_bytes, signature_bytes)
        return True, "Valid signature"
    except BadSignatureError:
        return False, "Bad signature"
    except Exception as e:
        return False, f"Verification failed: {str(e)}"


def check_clock_tampering(db: Session) -> bool:
    """Clock rollback guard: checks if now < max_seen_time - 120 seconds."""
    global LAST_MAX_SEEN_FLUSH
    now_ts = time.time()

    state = db.query(ServerState).filter(ServerState.key == "max_seen_time").first()
    if state:
        try:
            max_seen = float(state.value)
            if now_ts < (max_seen - 120.0):
                return True  # Clock was rolled back!
        except ValueError:
            pass

    # Flush max_seen_time
    if not state:
        state = ServerState(key="max_seen_time", value=str(now_ts))
        db.add(state)
        try:
            db.commit()
            LAST_MAX_SEEN_FLUSH = now_ts
        except Exception:
            db.rollback()
    elif now_ts > float(state.value):
        if now_ts - LAST_MAX_SEEN_FLUSH > 10.0:
            state.value = str(now_ts)
            try:
                db.commit()
                LAST_MAX_SEEN_FLUSH = now_ts
            except Exception:
                db.rollback()

    return False


def reset_license_cache():
    """Resets cached license in memory (for testing and reloading)."""
    global CACHED_LICENSE, LAST_MAX_SEEN_FLUSH
    CACHED_LICENSE = None
    LAST_MAX_SEEN_FLUSH = 0.0


def get_effective_session(db: Session | None = None) -> Tuple[Session, bool]:
    """Retrieves db session, respecting test dependency overrides if active."""
    if db is not None:
        return db, False
    from app.db.session import get_db
    try:
        from app.main import app
        if get_db in app.dependency_overrides:
            gen = app.dependency_overrides[get_db]()
            return next(gen), True
    except Exception:
        pass
    return SessionLocal(), True


def get_current_license_status(db: Session | None = None) -> Dict[str, Any]:
    """Calculates status, seconds_remaining, and licensee information."""
    global CACHED_LICENSE
    session, should_close = get_effective_session(db)
    try:
        # Load from DB or env on boot if not cached
        if CACHED_LICENSE is None:
            lic_rec = session.query(LicenseRecord).order_by(LicenseRecord.id.desc()).first()
            if lic_rec:
                CACHED_LICENSE = {
                    "licensee": lic_rec.licensee,
                    "expires_at": lic_rec.expires_at,
                    "signature": lic_rec.signature
                }
            elif "LICENSE_JSON" in os.environ:
                try:
                    lic_data = json.loads(os.environ["LICENSE_JSON"])
                    is_valid, _ = verify_license_signature(lic_data)
                    if is_valid:
                        CACHED_LICENSE = lic_data
                except Exception:
                    pass

        if not CACHED_LICENSE:
            return {
                "licensee": None,
                "expires_at": None,
                "status": "expired",
                "seconds_remaining": 0,
                "reason": "no_license"
            }

        # Check clock rollback
        if check_clock_tampering(session):
            return {
                "licensee": CACHED_LICENSE.get("licensee"),
                "expires_at": CACHED_LICENSE.get("expires_at"),
                "status": "expired",
                "seconds_remaining": 0,
                "reason": "clock_tampered"
            }

        # Check expiration timestamp
        expires_at_str = CACHED_LICENSE.get("expires_at", "")
        try:
            exp_dt = datetime.fromisoformat(expires_at_str)
            now_dt = datetime.now(timezone.utc)
            exp_utc = exp_dt.astimezone(timezone.utc) if exp_dt.tzinfo else exp_dt.replace(tzinfo=timezone.utc)
            diff = (exp_utc - now_dt).total_seconds()
            if diff <= 0:
                return {
                    "licensee": CACHED_LICENSE.get("licensee"),
                    "expires_at": expires_at_str,
                    "status": "expired",
                    "seconds_remaining": 0
                }
            return {
                "licensee": CACHED_LICENSE.get("licensee"),
                "expires_at": expires_at_str,
                "status": "valid",
                "seconds_remaining": int(diff)
            }
        except Exception:
            return {
                "licensee": CACHED_LICENSE.get("licensee"),
                "expires_at": expires_at_str,
                "status": "expired",
                "seconds_remaining": 0
            }
    finally:
        if should_close:
            session.close()


def activate_license(license_obj: dict, db: Session) -> Tuple[bool, str]:
    """Verifies, persists, and activates a new licence immediately."""
    global CACHED_LICENSE
    is_valid, msg = verify_license_signature(license_obj)
    if not is_valid:
        return False, f"Signature verification failed: {msg}"

    # Check if already expired
    expires_at_str = license_obj.get("expires_at", "")
    try:
        exp_dt = datetime.fromisoformat(expires_at_str)
        now_dt = datetime.now(timezone.utc)
        exp_utc = exp_dt.astimezone(timezone.utc) if exp_dt.tzinfo else exp_dt.replace(tzinfo=timezone.utc)
        if (exp_utc - now_dt).total_seconds() <= 0:
            return False, "Licence is already expired"
    except Exception as e:
        return False, f"Invalid expires_at format: {str(e)}"

    # Persist in DB
    rec = LicenseRecord(
        licensee=license_obj["licensee"],
        expires_at=license_obj["expires_at"],
        signature=license_obj["signature"]
    )
    db.add(rec)
    db.commit()

    # Update in-memory cache immediately
    CACHED_LICENSE = {
        "licensee": license_obj["licensee"],
        "expires_at": license_obj["expires_at"],
        "signature": license_obj["signature"]
    }
    return True, "Licence activated successfully"
