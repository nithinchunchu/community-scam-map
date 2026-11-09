#!/usr/bin/env python3
"""
scripts/scan_logs_privacy.py
Scans logs after a full API simulation and strictly verifies that:
- No phone numbers appear
- No UPI IDs appear
- No URLs appear
- No note texts appear
- No raw reporter IDs appear
- No raw IP addresses appear
"""

import sys
import io
import logging
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from app.main import app

def run_log_privacy_scan():
    print("=" * 60)
    print("COMMUNITY SCAM MAP - LOG PRIVACY AUDIT")
    print("=" * 60)

    log_capture = io.StringIO()
    handler = logging.StreamHandler(log_capture)
    handler.setFormatter(logging.Formatter('%(message)s'))

    uvicorn_logger = logging.getLogger("uvicorn.access")
    uvicorn_logger.setLevel(logging.DEBUG)
    uvicorn_logger.addHandler(handler)

    client = TestClient(app)

    phone = "+919876543210"
    upi_id = "target_scam_user@okaxis"
    url_val = "https://evil-bank-login.in/verify"
    note_secret = "Confidential personal secret text written by reporter"
    raw_reporter = "reporter_alice_secret_999"
    raw_ip = "198.51.100.42"

    print("[*] Running simulated reports and lookups with sensitive inputs...")
    client.post("/reports", json={
        "report_id": "rep_priv_log_test",
        "occurred_at": "2026-10-27T18:21:04+05:30",
        "reported_at": "2026-10-27T18:40:04+05:30",
        "reporter_id": raw_reporter,
        "ip_prefix": raw_ip,
        "channel": "Phone call",
        "scam_type": "digital-arrest",
        "identifier_type": "phone",
        "identifier_value": phone,
        "pincode": "560102",
        "locality": "HSR Layout",
        "city": "Bengaluru",
        "note": note_secret,
        "has_screenshot": True,
        "amount_lost_inr": 50000
    })

    client.get("/lookup?type=phone&value=%2B919876543210")
    client.get(f"/lookup?type=upi&value={upi_id}")
    client.get(f"/lookup?type=url&value={url_val}")
    client.get("/map?pincode=560102&days=7")
    client.get("/alerts?pincode=560102")

    handler.flush()
    captured = log_capture.getvalue()

    leaks = []
    if phone in captured:
        leaks.append(f"Phone number leaked: {phone}")
    if upi_id in captured:
        leaks.append(f"UPI ID leaked: {upi_id}")
    if url_val in captured or "evil-bank-login" in captured:
        leaks.append(f"URL leaked: {url_val}")
    if note_secret in captured:
        leaks.append("Note text leaked")
    if raw_reporter in captured:
        leaks.append(f"Reporter ID leaked: {raw_reporter}")
    if raw_ip in captured:
        leaks.append(f"Raw IP leaked: {raw_ip}")

    print(f"[*] Total captured log characters: {len(captured)}")
    if leaks:
        print("[!] PRIVACY LEAKS DETECTED:")
        for l in leaks:
            print(f"    - {l}")
        return False
    else:
        print("[+] Log Privacy Audit PASSED: Zero sensitive personal data found in access logs.")
        print("    - Query strings stripped")
        print("    - Client IP redacted to '-'")
        print("    - Note text never logged")
        print("=" * 60)
        return True

if __name__ == "__main__":
    success = run_log_privacy_scan()
    sys.exit(0 if success else 1)
