#!/usr/bin/env python3
"""
tools/make_license.py
Creates a signed licence file using Ed25519 private key from ~/.scammap/scammap_ed25519.key.
Usage:
    python tools/make_license.py --licensee "Demo Bank" --minutes 5
    python tools/make_license.py --licensee "Demo Bank" --days 30
"""

import argparse
import base64
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta
from nacl.signing import SigningKey

KEY_FILE = Path.home() / ".scammap" / "scammap_ed25519.key"
IST = timezone(timedelta(hours=5, minutes=30))

def create_license(licensee: str, seconds: int | None = None, minutes: int | None = None, days: int | None = None) -> dict:
    if not KEY_FILE.exists():
        raise FileNotFoundError(f"Private key not found at {KEY_FILE}. Run tools/gen_keys.py first.")

    with open(KEY_FILE, "r", encoding="utf-8") as f:
        priv_b64 = f.read().strip()

    signing_key = SigningKey(base64.b64decode(priv_b64))

    now_ist = datetime.now(IST)
    if seconds is not None:
        expiry_dt = now_ist + timedelta(seconds=seconds)
    elif minutes is not None:
        expiry_dt = now_ist + timedelta(minutes=minutes)
    elif days is not None:
        expiry_dt = now_ist + timedelta(days=days)
    else:
        expiry_dt = now_ist + timedelta(days=30)

    # Format ISO with +05:30
    expires_at_str = expiry_dt.isoformat()

    # Canonical JSON (sorted keys, no spaces)
    payload_dict = {
        "expires_at": expires_at_str,
        "licensee": licensee
    }
    canonical_bytes = json.dumps(payload_dict, sort_keys=True, separators=(",", ":")).encode("utf-8")

    signed = signing_key.sign(canonical_bytes)
    sig_b64 = base64.b64encode(signed.signature).decode("utf-8")

    license_obj = {
        "licensee": licensee,
        "expires_at": expires_at_str,
        "signature": sig_b64
    }
    return license_obj

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a signed licence")
    parser.add_argument("--licensee", default="Demo Bank", help="Licensee name")
    parser.add_argument("--seconds", type=int, default=None, help="Seconds until expiry")
    parser.add_argument("--minutes", type=int, default=None, help="Minutes until expiry")
    parser.add_argument("--days", type=int, default=None, help="Days until expiry")
    parser.add_argument("--out", default=None, help="Output file path")
    parser.add_argument("--compact", action="store_true", help="Print single-line compact JSON for env var")

    args = parser.parse_args()
    lic = create_license(args.licensee, args.seconds, args.minutes, args.days)

    lic_dir = Path("licenses")
    lic_dir.mkdir(exist_ok=True)

    if args.out:
        out_path = Path(args.out)
    else:
        if args.seconds:
            suffix = f"{args.seconds}s"
        elif args.minutes:
            suffix = f"{args.minutes}m"
        else:
            suffix = f"{args.days or 30}d"
        out_path = lic_dir / f"license_{suffix}.json"

    lic_json = json.dumps(lic, indent=2)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(lic_json)

    print(f"[+] Licence written to {out_path}")
    if args.compact:
        print(json.dumps(lic, separators=(",", ":")))
    else:
        print(lic_json)
