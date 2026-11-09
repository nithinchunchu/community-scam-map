#!/usr/bin/env python3
"""
scripts/licence_demo.py
Automated 4-Step Judge Demonstration for Ed25519 Licence & Rollback Enforcement
Usage:
    python scripts/licence_demo.py http://localhost:8000
    python scripts/licence_demo.py https://community-scam-map.onrender.com
"""

import sys
import time
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
from tools.make_license import create_license

def run_demo(base_url: str):
    base_url = base_url.rstrip("/")
    print("=" * 80)
    print("COMMUNITY SCAM MAP - LICENCE DEMONSTRATION")
    print(f"Target Base URL: {base_url}")
    print("=" * 80)

    client = httpx.Client(base_url=base_url, timeout=10.0)

    # Step 1: Initial licence check & seed a test report
    print("\n[STEP 1] Querying current licence status (GET /license)...")
    r = client.get("/license")
    print(f"Status Code: {r.status_code}, Response: {r.text}")

    print("\n[STEP 1b] Seeding a test report to verify data integrity across expiry...")
    rep_id = f"demo_probe_{int(time.time())}"
    r_rep = client.post(
        "/reports",
        json={
            "report_id": rep_id,
            "occurred_at": "2026-10-27T18:21:04+05:30",
            "reported_at": "2026-10-27T18:40:04+05:30",
            "reporter_id": "demo_reporter_1",
            "channel": "Phone call",
            "scam_type": "digital-arrest",
            "identifier_type": "phone",
            "identifier_value": "+919876543210",
            "pincode": "560102",
            "locality": "HSR Layout",
            "city": "Bengaluru",
            "note": "Judge demo test call"
        }
    )
    print(f"Report POST Status: {r_rep.status_code}, Merged: {r_rep.json().get('merged')}")

    # Step 2: Upload short 5-second licence
    print("\n[STEP 2] Generating and uploading short-duration licence (5 seconds)...")
    short_lic = create_license(licensee="Judge Demo Bank", seconds=5)
    r_up = client.post("/license", json=short_lic)
    print(f"Upload Status: {r_up.status_code}, Response: {r_up.text}")
    assert r_up.status_code == 200, "License upload failed"

    # Immediate check
    r_chk = client.get("/license")
    print(f"Immediate License Status: {r_chk.json()}")
    assert r_chk.json()["status"] == "valid"

    # Step 3: Wait for expiry and verify 403 LICENSE_EXPIRED
    print("\n[STEP 3] Waiting 6 seconds for licence expiry...")
    time.sleep(6)

    r_exp = client.get("/license")
    print(f"Expired License Status: {r_exp.json()}")
    assert r_exp.json()["status"] == "expired"

    print("\nAttempting protected lookup (GET /lookup) - Expecting HTTP 403 LICENSE_EXPIRED:")
    r_lookup_exp = client.get("/lookup?type=phone&value=%2B919876543210")
    print(f"Status: {r_lookup_exp.status_code}, Body: {r_lookup_exp.text}")
    assert r_lookup_exp.status_code == 403
    assert r_lookup_exp.json().get("error") == "LICENSE_EXPIRED"
    print("[OK] SUCCESS: Protected route properly refused service with 403 LICENSE_EXPIRED!")

    # Step 4: Upload long 30-day licence and verify data remains intact
    print("\n[STEP 4] Uploading renewed 30-day licence...")
    long_lic = create_license(licensee="Enterprise Scam Defense", days=30)
    r_up_long = client.post("/license", json=long_lic)
    print(f"Renewal Status: {r_up_long.status_code}, Response: {r_up_long.text}")
    assert r_up_long.status_code == 200

    r_chk_long = client.get("/license")
    print(f"Renewed License Status: {r_chk_long.json()}")
    assert r_chk_long.json()["status"] == "valid"

    print("\nVerifying service restored and previous data is 100% INTACT (GET /lookup):")
    r_lookup_restored = client.get("/lookup?type=phone&value=%2B919876543210")
    print(f"Status: {r_lookup_restored.status_code}, Body: {r_lookup_restored.text}")
    assert r_lookup_restored.status_code == 200
    assert r_lookup_restored.json()["report_count"] >= 1

    print("\n" + "=" * 80)
    print("[OK] ALL 4 LICENCE STAGES COMPLETED SUCCESSFULLY WITH ZERO DATA LOSS!")
    print("=" * 80)

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    run_demo(url)
