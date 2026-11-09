import re
from urllib.parse import urlparse

# Regex for UPI: ^[a-z0-9][a-z0-9._-]+@[a-z][a-z0-9]+$
UPI_REGEX = re.compile(r"^[a-z0-9][a-z0-9._-]+@[a-z][a-z0-9]+$")

# Regex for sender_id: ^(?:[A-Z]{2}-?)?([A-Z0-9]{6})(?:-[A-Z])?$
SENDER_ID_REGEX = re.compile(r"^(?:[A-Z]{2}-?)?([A-Z0-9]{6})(?:-[A-Z])?$")

# Obvious junk sequences
SEQUENTIAL_JUNK = {"1234567890", "0123456789"}
OBVIOUS_4DIGIT_JUNK = {"1234", "1111", "0000"}

def normalize_phone(raw: str) -> str:
    """
    Normalizes phone input to canonical form.
    - Strips spaces, hyphens, dots, brackets.
    - Toll-free (1800/1860, 8-12 digits) -> digits only.
    - 4-digit code starting with 1 (1930, 1909) -> canonical as is.
    - 10-digit mobile/landline with optional +91, 0091, 91, 0 -> +91 followed by 10 digits (first digit 2-9).
    - Rejects letters, 5-digit junk, all-same-digits, sequential junk.
    """
    if not raw or not isinstance(raw, str):
        raise ValueError("Invalid phone number")

    cleaned = re.sub(r"[\s\-\.\(\)]", "", raw)
    if not cleaned:
        raise ValueError("Empty phone number")

    # Reject if contains any letters
    if re.search(r"[a-zA-Z]", cleaned):
        raise ValueError("Phone number cannot contain letters")

    # 4-digit short codes (e.g. 1930, 1909)
    if re.match(r"^1\d{3}$", cleaned):
        if cleaned in OBVIOUS_4DIGIT_JUNK or len(set(cleaned)) == 1:
            raise ValueError(f"Invalid short code: {cleaned}")
        return cleaned

    # Toll-free check: starts with 1800 or 1860, 8 to 12 digits
    if re.match(r"^(?:1800|1860)\d{4,8}$", cleaned):
        return cleaned

    # General phone number cleanup
    digits = cleaned
    if digits.startswith("+"):
        digits = digits[1:]
    if digits.startswith("0091"):
        digits = digits[4:]
    elif len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]

    # Check for exact 10 digits with first digit between 2 and 9
    if not re.match(r"^[2-9]\d{9}$", digits):
        raise ValueError(f"Invalid phone number digits: {cleaned}")

    # Check for all-same-digit junk (e.g. 0000000000, 9999999999)
    if len(set(digits)) == 1:
        raise ValueError(f"All-same-digit phone number: {digits}")

    # Check sequential junk
    if digits in SEQUENTIAL_JUNK:
        raise ValueError(f"Sequential junk phone number: {digits}")

    return f"+91{digits}"


def normalize_upi(raw: str) -> str:
    """
    Normalizes UPI ID:
    - trim, lowercase, remove all whitespace
    - matches ^[a-z0-9][a-z0-9._-]+@[a-z][a-z0-9]+$
    """
    if not raw or not isinstance(raw, str):
        raise ValueError("Invalid UPI ID")

    cleaned = re.sub(r"\s+", "", raw).lower()
    if not UPI_REGEX.match(cleaned):
        raise ValueError(f"Invalid UPI ID: {raw}")
    return cleaned


def normalize_url(raw: str) -> str:
    """
    Normalizes URL:
    - Add https:// if missing scheme
    - Lowercase host, force https
    - Strip leading www.
    - Host must contain a dot and valid domain characters
    - Drop query string and fragment
    - Drop trailing slash
    """
    if not raw or not isinstance(raw, str):
        raise ValueError("Invalid URL")

    cleaned = raw.strip()
    if not cleaned:
        raise ValueError("Empty URL")

    if not (cleaned.startswith("http://") or cleaned.startswith("https://")):
        cleaned = f"https://{cleaned}"

    parsed = urlparse(cleaned)
    host = (parsed.hostname or "").lower()

    if not host or "." not in host:
        raise ValueError(f"Invalid URL host: {raw}")

    # Valid domain characters check
    if not re.match(r"^[a-z0-9.-]+$", host):
        raise ValueError(f"Invalid characters in URL host: {host}")

    if host.startswith("www."):
        host = host[4:]

    # Reconstruct path without query or fragment
    path = parsed.path or ""
    if path.endswith("/"):
        path = path.rstrip("/")

    port_part = f":{parsed.port}" if parsed.port and parsed.port not in (80, 443) else ""
    return f"https://{host}{port_part}{path}"


def normalize_sender_id(raw: str) -> str:
    """
    Normalizes SMS sender ID:
    - uppercase
    - accept ^(?:[A-Z]{2}-?)?([A-Z0-9]{6})(?:-[A-Z])?$ and keep the 6-character group
    """
    if not raw or not isinstance(raw, str):
        raise ValueError("Invalid sender_id")

    cleaned = raw.strip().upper()
    match = SENDER_ID_REGEX.match(cleaned)
    if not match:
        raise ValueError(f"Invalid sender_id format: {raw}")
    return match.group(1)


def normalize_identifier(id_type: str, raw_value: str) -> str:
    """Dispatches to the correct normalizer by identifier_type."""
    if id_type == "phone":
        return normalize_phone(raw_value)
    elif id_type == "upi":
        return normalize_upi(raw_value)
    elif id_type == "url":
        return normalize_url(raw_value)
    elif id_type == "sender_id":
        return normalize_sender_id(raw_value)
    else:
        raise ValueError(f"Unknown identifier_type: {id_type}")


def mask_identifier(id_type: str, canonical_value: str) -> str:
    """
    Masks the identifier for privacy until distinct_reporters >= 3.
    - Phone: 98XXXXX210 (first 2 + XXXXX + last 3 of the 10 digits)
    - UPI: r***@okaxis
    - URL: sbi***.in/...
    - Sender: HD****
    """
    if id_type == "phone":
        # Toll-free or short helpline
        if canonical_value.startswith("+91"):
            digits = canonical_value[3:]
            if len(digits) == 10:
                return f"{digits[:2]}XXXXX{digits[-3:]}"
        elif len(canonical_value) >= 8: # toll free
            return f"{canonical_value[:2]}XXXXX{canonical_value[-3:]}"
        elif len(canonical_value) == 4:
            return f"{canonical_value[:2]}**"
        return f"{canonical_value[:2]}XXXXX"

    elif id_type == "upi":
        parts = canonical_value.split("@", 1)
        if len(parts) == 2:
            user, domain = parts
            return f"{user[:1]}***@{domain}"
        return "u***"

    elif id_type == "url":
        # First 3 chars of host + *** + last label of host + /...
        parsed = urlparse(canonical_value)
        host = parsed.hostname or ""
        labels = host.split(".")
        last_label = f".{labels[-1]}" if len(labels) > 1 else ""
        first3 = host[:3]
        return f"{first3}***{last_label}/..."

    elif id_type == "sender_id":
        if len(canonical_value) >= 2:
            return f"{canonical_value[:2]}****"
        return "******"

    return "******"
