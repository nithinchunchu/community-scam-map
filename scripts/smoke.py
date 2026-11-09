#!/usr/bin/env python3
"""
scripts/smoke.py
Comprehensive Smoke Test for Community Scam Map
Hits all 7 core API endpoints plus /license and /admin/reset on the specified BASE_URL.

Usage:
    python scripts/smoke.py http://localhost:8000
    python scripts/smoke.py https://community-scam-map.onrender.com
"""

import sys
import time
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
from tools.make_license import create_license

def run_smoke_test(base_url: str):
    base_url = base_url.rstrip("/")
    print("=" * 80)
    print("COMMUNITY SCAM MAP - PRODUCTION SMOKE TEST")
    print(f"Target URL: {base_url}")
    print("=" * 80)

    results = []

    def check(endpoint_name: str, passed: bool, details: str = ""):
        status_str = "[PASS OK]" if passed else "[FAIL X]"
        print(f"[*] {endpoint_name:<25}: {status_str} {details}")
        results.append((endpoint_name, passed, details))

    client = httpx.Client(base_url=base_url, timeout=10.0)

    # 1. GET /health
    try:
        r = client.get("/health")
        passed = (r.status_code == 200 and r.json().get("ok") is True)
        check("GET /health", passed, f"Status: {r.status_code}, Body: {r.text}")
    except Exception as e:
        check("GET /health", False, f"Exception: {e}")

    # 2. GET /license
    try:
        r = client.get("/license")
        passed = (r.status_code == 200 and "status" in r.json())
        check("GET /license", passed, f"Status: {r.status_code}, Status: {r.json().get('status')}")
    except Exception as e:
        check("GET /license", False, f"Exception: {e}")

    # 3. POST /license (Ensure active 30-day licence is active)
    try:
        lic = create_license(licensee="Smoke Test Corp", days=30)
        r = client.post("/license", json=lic)
        passed = (r.status_code == 200 and r.json().get("ok") is True)
        check("POST /license", passed, f"Status: {r.status_code}")
    except Exception as e:
        check("POST /license", False, f"Exception: {e}")

    # 4. POST /reports
    rep_id = f"smoke_rep_{int(time.time())}"
    try:
        payload = {
            "report_id": rep_id,
            "occurred_at": "2026-10-27T18:21:04+05:30",
            "reported_at": "2026-10-27T18:40:04+05:30",
            "reporter_id": "smoke_user_01",
            "channel": "Phone call",
            "scam_type": "digital-arrest",
            "identifier_type": "phone",
            "identifier_value": "+919876543210",
            "pincode": "560102",
            "locality": "HSR Layout",
            "city": "Bengaluru",
            "note": "Smoke test call"
        }
        r = client.post("/reports", json=payload)
        passed = (r.status_code in (200, 201) and "report_id" in r.json())
        check("POST /reports", passed, f"Status: {r.status_code}, Case: {r.json().get('case_id')}")
    except Exception as e:
        check("POST /reports", False, f"Exception: {e}")

    # 5. GET /lookup
    try:
        r = client.get("/lookup?type=phone&value=%2B919876543210")
        passed = (r.status_code == 200 and "verdict" in r.json())
        check("GET /lookup", passed, f"Status: {r.status_code}, Verdict: {r.json().get('verdict')}")
    except Exception as e:
        check("GET /lookup", False, f"Exception: {e}")

    # 6. GET /map
    try:
        r = client.get("/map?days=7")
        passed = (r.status_code == 200 and ("clusters" in r.json() or isinstance(r.json(), list)))
        count = len(r.json()["clusters"]) if "clusters" in r.json() else len(r.json())
        check("GET /map", passed, f"Status: {r.status_code}, Clusters count: {count}")
    except Exception as e:
        check("GET /map", False, f"Exception: {e}")

    # 7. GET /alerts
    try:
        r = client.get("/alerts")
        passed = (r.status_code == 200 and ("alerts" in r.json() or isinstance(r.json(), list)))
        count = len(r.json()["alerts"]) if "alerts" in r.json() else len(r.json())
        check("GET /alerts", passed, f"Status: {r.status_code}, Alerts count: {count}")
    except Exception as e:
        check("GET /alerts", False, f"Exception: {e}")

    # 8. POST /challenges
    try:
        chall = {
            "identifier_type": "phone",
            "identifier_value": "+919876543210",
            "claimant_name": "Smoke Test Pharmacy",
            "contact_email": "contact@pharmacy.example",
            "proof_note": "Official registered shop and licence"
        }
        r = client.post("/challenges", json=chall)
        passed = (r.status_code in (200, 201) and "challenge_id" in r.json())
        check("POST /challenges", passed, f"Status: {r.status_code}, Challenge: {r.json().get('challenge_id')}")
    except Exception as e:
        check("POST /challenges", False, f"Exception: {e}")

    # 9. POST /admin/reset
    try:
        r = client.post("/admin/reset")
        passed = (r.status_code == 200 and r.json().get("ok") is True)
        check("POST /admin/reset", passed, f"Status: {r.status_code}")
    except Exception as e:
        check("POST /admin/reset", False, f"Exception: {e}")

    # Final summary
    total = len(results)
    successes = sum(1 for _, p, _ in results if p)
    print("\n" + "=" * 80)
    print(f"SMOKE TEST COMPLETE: {successes}/{total} ENDPOINTS FUNCTIONAL")
    print("=" * 80)

    if successes == total:
        print("[SUCCESS] PRODUCTION DEPLOYMENT IS FULLY OPERATIONAL!")
        return True
    else:
        print("[FAILURE] ERRORS DETECTED DURING SMOKE TEST.")
        return False

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    success = run_smoke_test(url)
    sys.exit(0 if success else 1)
