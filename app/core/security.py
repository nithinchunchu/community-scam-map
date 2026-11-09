import hmac
import hashlib
import uuid
from app.core.config import settings

def hash_reporter_id(reporter_id: str | None, client_ip: str | None = None) -> str:
    """
    Returns truncated HMAC-SHA256 hash for reporter_id.
    If reporter_id is missing, creates a deterministic anonymous reporter identifier based on client IP.
    """
    raw_id = reporter_id or f"anon_{uuid.uuid4().hex[:12]}"
    h = hmac.new(settings.SERVER_SECRET.encode("utf-8"), raw_id.encode("utf-8"), hashlib.sha256)
    return h.hexdigest()[:24]


def hash_ip_prefix(ip_prefix: str | None, client_ip: str | None = None) -> str:
    """
    Returns truncated HMAC-SHA256 hash for ip_prefix.
    If ip_prefix is missing, derives /24 subnet from client_ip.
    """
    prefix = ip_prefix
    if not prefix and client_ip:
        # e.g. 192.168.1.5 -> 192.168.1
        parts = client_ip.split(".")
        if len(parts) >= 3:
            prefix = ".".join(parts[:3])
        else:
            prefix = client_ip
    if not prefix:
        prefix = "unknown_prefix"

    h = hmac.new(settings.SERVER_SECRET.encode("utf-8"), prefix.encode("utf-8"), hashlib.sha256)
    return h.hexdigest()[:24]
