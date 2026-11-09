#!/usr/bin/env python3
"""
tests/adversarial/run_adversarial.py
Adversarial Test Suite Runner against BASE_URL

Tests all attack scenarios, spamming, coordination bursts, copy-paste rings,
normalisation, privacy masking, dispute capping, alerts (SPIKE & NEW_TYPE),
and verified business immunity.

Prints a clean pass/fail table.
"""

import os
import sys
import time
import random
from pathlib import Path
from datetime import datetime, timezone, timedelta
import httpx

# Ensure repo root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.main import app

def get_client():
    base_url = os.getenv("BASE_URL", "").rstrip("/")
    if base_url:
        print(f"[*] Running against live server: {base_url}")
        return httpx.Client(base_url=base_url, timeout=10.0)
    else:
        print("[*] Running against in-process FastAPI TestClient (no BASE_URL supplied)")
        from fastapi.testclient import TestClient
        return TestClient(app)

class TestResult:
    def __init__(self, name: str, passed: bool, details: str = ""):
        self.name = name
        self.passed = passed
        self.details = details

def run_adversarial_suite():
    client = get_client()
    results = []

    print("\n" + "=" * 80)
    print("COMMUNITY SCAM MAP - ADVERSARIAL ATTACK TEST SUITE")
    print("=" * 80)

    # Ensure tables exist and reset server before starting
    try:
        from app.db.init_db import init_db
        init_db()
        res = client.post("/admin/reset")
        assert res.status_code == 200, f"Reset failed: {res.text}"
    except Exception as e:
        print(f"[!] Warning: /admin/reset error: {e}")

    now = datetime.now(timezone.utc)

    # -------------------------------------------------------------------------
    # Scenario 1: 40 different reporters with templated notes in 10-min burst
    # Expected: never KNOWN_SCAM, and no SPIKE alert
    # -------------------------------------------------------------------------
    s1_target = "+919100000001"
    for i in range(40):
        t = (now - timedelta(minutes=10)) + timedelta(seconds=i * 12)
        client.post("/reports", json={
            "report_id": f"s1_rep_{i}",
            "occurred_at": t.isoformat(),
            "reported_at": t.isoformat(),
            "reporter_id": f"s1_attacker_{i}",
            "ip_prefix": f"182.70.{i % 10}",
            "channel": "Phone call",
            "scam_type": "job-offer",
            "identifier_type": "phone",
            "identifier_value": s1_target,
            "pincode": "560102",
            "locality": "HSR Layout",
            "city": "Bengaluru",
            "note": "Fraud warning: this company stole deposit money for fake work from home",
            "has_screenshot": False,
            "amount_lost_inr": 0
        })

    lookup1 = client.get(f"/lookup?type=phone&value=%2B919100000001").json()
    alert1 = client.get("/alerts?pincode=560102").json()

    # Fake reports must never set off ANY alert (SPIKE or NEW_TYPE)
    s1_no_known_scam = (lookup1.get("verdict") != "KNOWN_SCAM")
    s1_no_alerts = (len(alert1.get("alerts", [])) == 0)
    s1_pass = s1_no_known_scam and s1_no_alerts
    results.append(TestResult(
        "1. 40-reporter 10-min burst with templated note",
        s1_pass,
        f"Verdict: {lookup1.get('verdict')}, Alerts: {[a['type'] for a in alert1.get('alerts', [])]}"
    ))

    # -------------------------------------------------------------------------
    # Scenario 2: 40 reports with 40 different IPs and IDENTICAL note
    # Expected: never KNOWN_SCAM, and NEVER set off ANY alert
    # -------------------------------------------------------------------------
    s2_target = "+919200000002"
    identical_text = "FRAUD ALERT INDIRANAGAR STORE: DO NOT PAY ON THIS NUMBER!"
    for i in range(40):
        t = (now - timedelta(minutes=15)) + timedelta(seconds=i * 20)
        client.post("/reports", json={
            "report_id": f"s2_rep_{i}",
            "occurred_at": t.isoformat(),
            "reported_at": t.isoformat(),
            "reporter_id": f"s2_attacker_{i}",
            "ip_prefix": f"10.{i}.1", # 40 distinct IPs
            "channel": "Phone call",
            "scam_type": "fake-customer-care",
            "identifier_type": "phone",
            "identifier_value": s2_target,
            "pincode": "560038",
            "locality": "Indiranagar",
            "city": "Bengaluru",
            "note": identical_text,
            "has_screenshot": False,
            "amount_lost_inr": 0
        })

    lookup2 = client.get(f"/lookup?type=phone&value=%2B919200000002").json()
    alert2 = client.get("/alerts?pincode=560038").json()

    s2_no_known_scam = (lookup2.get("verdict") != "KNOWN_SCAM")
    s2_no_alerts = (len(alert2.get("alerts", [])) == 0)
    s2_pass = s2_no_known_scam and s2_no_alerts
    results.append(TestResult(
        "2. 40 different IPs with identical note",
        s2_pass,
        f"Verdict: {lookup2.get('verdict')}, Alerts: {[a['type'] for a in alert2.get('alerts', [])]}"
    ))

    # -------------------------------------------------------------------------
    # Scenario 3: 22 accounts from same ip_prefix reporting one number
    # Expected: never KNOWN_SCAM (collapses via IP window)
    # -------------------------------------------------------------------------
    s3_target = "+919300000003"
    for i in range(22):
        t = (now - timedelta(minutes=25)) + timedelta(seconds=i * 30)
        client.post("/reports", json={
            "report_id": f"s3_rep_{i}",
            "occurred_at": t.isoformat(),
            "reported_at": t.isoformat(),
            "reporter_id": f"s3_acc_{i}",
            "ip_prefix": "192.168.1", # Same Wi-Fi
            "channel": "Phone call",
            "scam_type": "digital-arrest",
            "identifier_type": "phone",
            "identifier_value": s3_target,
            "pincode": "560034",
            "locality": "Koramangala",
            "city": "Bengaluru",
            "note": f"Unique variation story from wifi user {i}",
            "has_screenshot": False,
            "amount_lost_inr": 0
        })

    lookup3 = client.get(f"/lookup?type=phone&value=%2B919300000003").json()
    s3_pass = (lookup3.get("verdict") != "KNOWN_SCAM")
    results.append(TestResult(
        "3. 22 accounts from same IP prefix",
        s3_pass,
        f"Verdict: {lookup3.get('verdict')}, distinct_reporters: {lookup3.get('distinct_reporters')}"
    ))

    # -------------------------------------------------------------------------
    # Scenario 4: One reporter reporting one number 6 times in an hour
    # Expected: distinct_reporters == 1, never KNOWN_SCAM
    # -------------------------------------------------------------------------
    s4_target = "+919400000004"
    for i in range(6):
        t = (now - timedelta(minutes=40)) + timedelta(minutes=i * 5)
        client.post("/reports", json={
            "report_id": f"s4_rep_{i}",
            "occurred_at": t.isoformat(),
            "reported_at": t.isoformat(),
            "reporter_id": "s4_single_spammer",
            "ip_prefix": "49.207.12",
            "channel": "Phone call",
            "scam_type": "electricity-disconnection",
            "identifier_type": "phone",
            "identifier_value": s4_target,
            "pincode": "560076",
            "locality": "BTM Layout",
            "city": "Bengaluru",
            "note": f"Power cut warning received message number {i}",
            "has_screenshot": False,
            "amount_lost_inr": 0
        })

    lookup4 = client.get(f"/lookup?type=phone&value=%2B919400000004").json()
    s4_pass = (lookup4.get("distinct_reporters") == 1 and lookup4.get("verdict") != "KNOWN_SCAM")
    results.append(TestResult(
        "4. One reporter reporting 6 times in an hour",
        s4_pass,
        f"distinct_reporters: {lookup4.get('distinct_reporters')}, verdict: {lookup4.get('verdict')}"
    ))

    # -------------------------------------------------------------------------
    # Scenario 5: Junk inputs give 400
    # Expected: 400 Bad Request
    # -------------------------------------------------------------------------
    j1 = client.post("/reports", json={
        "report_id": "j_1", "occurred_at": now.isoformat(), "reported_at": now.isoformat(),
        "identifier_type": "phone", "identifier_value": "12345", "pincode": "560102", "locality": "HSR", "city": "BLR"
    }).status_code == 400

    j2 = client.post("/reports", json={
        "report_id": "j_2", "occurred_at": now.isoformat(), "reported_at": now.isoformat(),
        "identifier_type": "upi", "identifier_value": "test", "pincode": "560102", "locality": "HSR", "city": "BLR"
    }).status_code == 400

    j3 = client.post("/reports", json={
        "report_id": "j_3", "occurred_at": now.isoformat(), "reported_at": now.isoformat(),
        "identifier_type": "phone", "identifier_value": "0000000000", "pincode": "560102", "locality": "HSR", "city": "BLR"
    }).status_code == 400

    s5_pass = j1 and j2 and j3
    results.append(TestResult(
        "5. Junk values ('12345', 'test', '0000000000') give 400",
        s5_pass,
        f"Codes: {400 if j1 else 'err'}, {400 if j2 else 'err'}, {400 if j3 else 'err'}"
    ))

    # -------------------------------------------------------------------------
    # Scenario 6 & 7: Real campaigns (7 unrelated & 4 unrelated)
    # Expected: KNOWN_SCAM
    # -------------------------------------------------------------------------
    s6_target = "+919876543210"
    real_notes = [
        "Received a digital arrest video call from a person in police uniform claiming CBI warrant.",
        "मुझे फोन करके कहा गया कि पार्सल में ड्रग्स पकड़े गए हैं और तुरंत पैसे भेजने होंगे",
        "Police officer ban kar video call kiya aur darakar 50000 transfer karne ko bola",
        "Threatened to arrest my daughter unless bail penalty paid immediately through UPI.",
        "Custody threat impersonating cyber cell department in Mumbai airport customs.",
        "कूरियर में अवैध सामान मिलने की झूठी बात बोलकर डराया और पैसे मांगे",
        "Scam call demanding OTP to clear fake drug trafficking case against me."
    ]

    for i in range(7):
        t = (now - timedelta(hours=8)) + timedelta(hours=i)
        client.post("/reports", json={
            "report_id": f"s6_rep_{i}",
            "occurred_at": t.isoformat(),
            "reported_at": t.isoformat(),
            "reporter_id": f"citizen_real_{i}",
            "ip_prefix": f"103.{i * 17 % 200}.{i * 19 % 200}",
            "channel": "Phone call",
            "scam_type": "digital-arrest",
            "identifier_type": "phone",
            "identifier_value": s6_target,
            "pincode": "560102",
            "locality": "HSR Layout",
            "city": "Bengaluru",
            "note": real_notes[i],
            "has_screenshot": (i % 2 == 0),
            "amount_lost_inr": (20000 if i % 2 == 0 else 0)
        })

    lookup6 = client.get(f"/lookup?type=phone&value=%2B919876543210").json()
    s6_pass = (lookup6.get("verdict") == "KNOWN_SCAM")
    results.append(TestResult(
        "6. Real campaign (7 unrelated, multi-lingual English/Hindi/Hinglish)",
        s6_pass,
        f"Verdict: {lookup6.get('verdict')}, distinct: {lookup6.get('distinct_reporters')}"
    ))

    # Smaller real campaign (4 people)
    s7_target = "+919777700007"
    for i in range(4):
        t = (now - timedelta(hours=6)) + timedelta(hours=i)
        client.post("/reports", json={
            "report_id": f"s7_rep_{i}",
            "occurred_at": t.isoformat(),
            "reported_at": t.isoformat(),
            "reporter_id": f"citizen_small_{i}",
            "ip_prefix": f"115.{i * 23 % 200}.{i * 11 % 200}",
            "channel": "Phone call",
            "scam_type": "courier-customs",
            "identifier_type": "phone",
            "identifier_value": s7_target,
            "pincode": "560011",
            "locality": "Jayanagar",
            "city": "Bengaluru",
            "note": real_notes[i],
            "has_screenshot": True,
            "amount_lost_inr": 10000
        })

    lookup7 = client.get(f"/lookup?type=phone&value=%2B919777700007").json()
    s7_pass = (lookup7.get("verdict") == "KNOWN_SCAM")
    results.append(TestResult(
        "7. Smaller real campaign (4 people)",
        s7_pass,
        f"Verdict: {lookup7.get('verdict')}, distinct: {lookup7.get('distinct_reporters')}"
    ))

    # -------------------------------------------------------------------------
    # Scenario 8: Normalisation (all spellings match)
    # -------------------------------------------------------------------------
    p1 = client.get("/lookup?type=phone&value=%2B91%2098765%2043210").json().get("verdict")
    p2 = client.get("/lookup?type=phone&value=09876543210").json().get("verdict")
    p3 = client.get("/lookup?type=phone&value=98765-43210").json().get("verdict")
    p4 = client.get("/lookup?type=phone&value=919876543210").json().get("verdict")
    s8_pass = (p1 == p2 == p3 == p4 == "KNOWN_SCAM")
    results.append(TestResult(
        "8. Normalisation consistency across formats",
        s8_pass,
        f"Verdicts: {p1}, {p2}, {p3}, {p4}"
    ))

    # -------------------------------------------------------------------------
    # Scenario 9: Verified numbers immune to false reports
    # -------------------------------------------------------------------------
    v_phone = "1800 1600" # HDFC care
    for i in range(10):
        client.post("/reports", json={
            "report_id": f"s9_attack_{i}",
            "occurred_at": (now - timedelta(hours=i)).isoformat(),
            "reported_at": (now - timedelta(hours=i)).isoformat(),
            "reporter_id": f"s9_attacker_{i}",
            "ip_prefix": f"172.16.{i}",
            "channel": "Phone call",
            "scam_type": "fake-customer-care",
            "identifier_type": "phone",
            "identifier_value": v_phone,
            "pincode": "560102",
            "locality": "HSR Layout",
            "city": "Bengaluru",
            "note": "Attacking bank helpline with fake complaints",
            "has_screenshot": True,
            "amount_lost_inr": 50000
        })

    lookup9 = client.get("/lookup?type=phone&value=18001600").json()
    s9_pass = (lookup9.get("verdict") == "VERIFIED_BUSINESS")
    results.append(TestResult(
        "9. Verified numbers return VERIFIED_BUSINESS after 10 attack reports",
        s9_pass,
        f"Verdict: {lookup9.get('verdict')}, Owner: {lookup9.get('verified_name')}"
    ))

    # -------------------------------------------------------------------------
    # Scenario 10: Challenge flips KNOWN_SCAM to challenged: true & not KNOWN_SCAM
    # -------------------------------------------------------------------------
    # Number s7_target was KNOWN_SCAM
    ch_res = client.post("/challenges", json={
        "identifier_type": "phone",
        "identifier_value": s7_target,
        "claimant_name": "Regional Merchant",
        "contact_email": "merchant@example.com",
        "proof_note": "Filing GST certificate and telephone ownership deed"
    })
    lookup10 = client.get(f"/lookup?type=phone&value=%2B919777700007").json()
    s10_pass = (
        ch_res.status_code == 201
        and lookup10.get("challenged") is True
        and lookup10.get("verdict") != "KNOWN_SCAM"
    )
    results.append(TestResult(
        "10. Dispute/Challenge caps KNOWN_SCAM number",
        s10_pass,
        f"Challenged: {lookup10.get('challenged')}, New verdict: {lookup10.get('verdict')}"
    ))

    # -------------------------------------------------------------------------
    # Scenario 11: Spike & New Type Alerts & Map Expiry
    # -------------------------------------------------------------------------
    # Create baseline in 560066 (Whitefield): 14 reports in previous 7 days (baseline 2/day)
    # Plus 10 trusted reports in last 24h -> SPIKE!
    # Plus a brand new scam_type: 'sextortion' (not in previous 30 days) -> NEW_TYPE!
    pin_alert = "560066"
    for d in range(1, 8):
        # 2 reports per day in [now - 8d, now - 1d]
        for k in range(2):
            t_base = now - timedelta(days=d, hours=k*4)
            client.post("/reports", json={
                "report_id": f"base_{d}_{k}",
                "occurred_at": t_base.isoformat(),
                "reported_at": t_base.isoformat(),
                "reporter_id": f"base_rep_{d}_{k}",
                "ip_prefix": f"100.{d}.{k}",
                "channel": "Phone call",
                "scam_type": "digital-arrest",
                "identifier_type": "phone",
                "identifier_value": f"+919800{d:02d}00{k:02d}",
                "pincode": pin_alert,
                "locality": "Whitefield",
                "city": "Bengaluru",
                "note": f"Historic background report from previous week {d}",
                "has_screenshot": True,
                "amount_lost_inr": 1000
            })

    # Now 10 trusted reports in last 24h
    for m in range(10):
        t_recent = now - timedelta(hours=m + 1)
        st = "sextortion" if m == 0 else "digital-arrest"
        client.post("/reports", json={
            "report_id": f"recent_{m}",
            "occurred_at": t_recent.isoformat(),
            "reported_at": t_recent.isoformat(),
            "reporter_id": f"recent_rep_{m}",
            "ip_prefix": f"101.{m}.1",
            "channel": "Phone call",
            "scam_type": st,
            "identifier_type": "phone",
            "identifier_value": f"+9198110000{m:02d}",
            "pincode": pin_alert,
            "locality": "Whitefield",
            "city": "Bengaluru",
            "note": f"Urgent recent scam incident number {m}",
            "has_screenshot": True,
            "amount_lost_inr": 5000
        })

    # Add a month-old report (35 days old) in Whitefield
    t_old = now - timedelta(days=35)
    client.post("/reports", json={
        "report_id": "month_old_rep",
        "occurred_at": t_old.isoformat(),
        "reported_at": t_old.isoformat(),
        "reporter_id": "old_rep_id",
        "ip_prefix": "99.99.99",
        "channel": "Phone call",
        "scam_type": "lottery-prize",
        "identifier_type": "phone",
        "identifier_value": "+919899999999",
        "pincode": "500081", # Madhapur
        "locality": "Madhapur",
        "city": "Hyderabad",
        "note": "Month old report from last month",
        "has_screenshot": False,
        "amount_lost_inr": 0
    })

    alerts_res = client.get(f"/alerts?pincode={pin_alert}").json().get("alerts", [])
    has_spike = any(a["type"] == "SPIKE" for a in alerts_res)
    has_new_type = any(a["type"] == "NEW_TYPE" and a.get("scam_type") == "sextortion" for a in alerts_res)

    # Normal area check (506001 Hanamkonda): should have NO alerts
    normal_alerts = client.get("/alerts?pincode=506001").json().get("alerts", [])
    normal_clean = (len(normal_alerts) == 0)

    # Map check: month-old report in 500081 must NOT appear in default 7-day map
    map_res = client.get("/map?pincode=500081&days=7").json()
    map_clean = len(map_res.get("clusters", [])) == 0

    s11_pass = has_spike and has_new_type and normal_clean and map_clean
    results.append(TestResult(
        "11. Alerts: SPIKE, NEW_TYPE, clean normal area, and map month-old filter",
        s11_pass,
        f"SPIKE: {has_spike}, NEW_TYPE: {has_new_type}, normal_clean: {normal_clean}, map_clean: {map_clean}"
    ))

    # -------------------------------------------------------------------------
    # Scenario 12: Privacy masking (< 3 persons masked, >= 3 unmasked)
    # -------------------------------------------------------------------------
    # Number with 0 reports -> masked
    unrep = client.get("/lookup?type=phone&value=%2B919900000000").json().get("display_value")
    # Number with 1 person (s4_target) -> masked
    one_rep = client.get(f"/lookup?type=phone&value=%2B919400000004").json().get("display_value")
    # Number with 7 persons (s6_target) -> unmasked
    many_rep = client.get(f"/lookup?type=phone&value=%2B919876543210").json().get("display_value")

    s12_pass = (
        "XXXXX" in unrep
        and "XXXXX" in one_rep
        and "+919876543210" == many_rep
    )
    results.append(TestResult(
        "12. Privacy masking rules (< 3 masked, >= 3 unmasked)",
        s12_pass,
        f"0 rep: {unrep}, 1 rep: {one_rep}, 7 rep: {many_rep}"
    ))

    # -------------------------------------------------------------------------
    # Scenario 13: Timestamp validations (future > 10m rejects, unparseable rejects)
    # -------------------------------------------------------------------------
    future_15m = (now + timedelta(minutes=15)).isoformat()
    future_5m = (now + timedelta(minutes=5)).isoformat()
    
    res_fut_15 = client.post("/reports", json={
        "report_id": "rep_fut_15",
        "occurred_at": future_15m,
        "reported_at": now.isoformat(),
        "channel": "Phone call",
        "scam_type": "job-offer",
        "identifier_type": "phone",
        "identifier_value": "+919811223344",
        "pincode": "560102",
        "locality": "HSR Layout",
        "city": "Bengaluru"
    })
    
    res_unparseable = client.post("/reports", json={
        "report_id": "rep_unparseable",
        "occurred_at": "yesterday-afternoon",
        "reported_at": now.isoformat(),
        "channel": "Phone call",
        "scam_type": "job-offer",
        "identifier_type": "phone",
        "identifier_value": "+919811223344",
        "pincode": "560102",
        "locality": "HSR Layout",
        "city": "Bengaluru"
    })

    res_fut_5 = client.post("/reports", json={
        "report_id": "rep_fut_5",
        "occurred_at": future_5m,
        "reported_at": now.isoformat(),
        "channel": "Phone call",
        "scam_type": "job-offer",
        "identifier_type": "phone",
        "identifier_value": "+919811223344",
        "pincode": "560102",
        "locality": "HSR Layout",
        "city": "Bengaluru"
    })

    s13_pass = (
        res_fut_15.status_code == 400
        and res_unparseable.status_code == 400
        and res_fut_5.status_code == 201
    )
    results.append(TestResult(
        "13. Timestamp guard (>10m future 400, bad format 400, <=10m 201)",
        s13_pass,
        f">15m: {res_fut_15.status_code}, bad: {res_unparseable.status_code}, <5m: {res_fut_5.status_code}"
    ))

    # -------------------------------------------------------------------------
    # Scenario 14: 30+ day old report accepted (201) but excluded from 7-day map
    # -------------------------------------------------------------------------
    t_35d = (now - timedelta(days=35)).isoformat()
    old_target = "+919833445566"
    res_old = client.post("/reports", json={
        "report_id": "rep_old_35d",
        "occurred_at": t_35d,
        "reported_at": t_35d,
        "channel": "SMS or WhatsApp",
        "scam_type": "electricity-disconnection",
        "identifier_type": "phone",
        "identifier_value": old_target,
        "pincode": "600020", # Adyar
        "locality": "Adyar",
        "city": "Chennai",
        "note": "Power cut alert from last month"
    })
    
    # Old report lookup is still retrievable
    lookup_old = client.get(f"/lookup?type=phone&value=%2B919833445566").json()
    # 7-day map does NOT count 35-day-old report in Adyar
    map_7d = client.get("/map?pincode=600020&days=7").json()
    adyar_7d_count = sum(c["count"] for c in map_7d.get("clusters", []) if c["pincode"] == "600020")

    s14_pass = (
        res_old.status_code == 201
        and lookup_old.get("report_count") >= 1
        and adyar_7d_count == 0
    )
    results.append(TestResult(
        "14. Old reports (30+ days accepted, excluded from 7-day map)",
        s14_pass,
        f"Status: {res_old.status_code}, Lookups: {lookup_old.get('report_count')}, 7d Map count: {adyar_7d_count}"
    ))

    # -------------------------------------------------------------------------
    # Scenario 15: Edge normalization cases (case, spacing, bare sender, URLs)
    # -------------------------------------------------------------------------
    # 1. Mixed-case UPI with dots & hyphens
    client.post("/reports", json={
        "report_id": "rep_norm_upi",
        "occurred_at": now.isoformat(),
        "reported_at": now.isoformat(),
        "channel": "UPI request",
        "scam_type": "upi-refund-qr",
        "identifier_type": "upi",
        "identifier_value": "Ravi.Kumar-12@OkAxis",
        "pincode": "560102",
        "locality": "HSR Layout",
        "city": "Bengaluru"
    })
    upi_lookup = client.get("/lookup?type=upi&value=ravi.kumar-12@okaxis").json()

    # 2. Bare sender ID in lowercase
    client.post("/reports", json={
        "report_id": "rep_norm_sender",
        "occurred_at": now.isoformat(),
        "reported_at": now.isoformat(),
        "channel": "SMS or WhatsApp",
        "scam_type": "fake-kyc-link",
        "identifier_type": "sender_id",
        "identifier_value": "hdfcbk",
        "pincode": "560102",
        "locality": "HSR Layout",
        "city": "Bengaluru"
    })
    sender_lookup = client.get("/lookup?type=sender_id&value=HDFCBK").json()

    # 3. URL with query params, port, and trailing slash
    client.post("/reports", json={
        "report_id": "rep_norm_url",
        "occurred_at": now.isoformat(),
        "reported_at": now.isoformat(),
        "channel": "Fake website",
        "scam_type": "fake-kyc-link",
        "identifier_type": "url",
        "identifier_value": "http://www.sbi-kyc.in:443/pay/?utm=sms&id=123",
        "pincode": "560102",
        "locality": "HSR Layout",
        "city": "Bengaluru"
    })
    url_lookup = client.get("/lookup?type=url&value=https://sbi-kyc.in/pay").json()

    # 4. Odd spacing phone numbers (1 9 3 0 and 1800 160 0)
    p1930 = client.get("/lookup?type=phone&value=1%209%203%200").json()
    p1800 = client.get("/lookup?type=phone&value=1800%20160%200").json()

    s15_pass = (
        upi_lookup.get("report_count") >= 1
        and sender_lookup.get("verdict") == "VERIFIED_BUSINESS" # HDFCBK is verified SMS sender
        and url_lookup.get("report_count") >= 1
        and p1930.get("verdict") == "VERIFIED_BUSINESS"
        and p1800.get("verdict") == "VERIFIED_BUSINESS"
    )
    results.append(TestResult(
        "15. Advanced normalisation (mixed UPI, bare sender, URL ?utm/, odd phone spacing)",
        s15_pass,
        f"UPI: {upi_lookup.get('report_count')}, Sender: {sender_lookup.get('verdict')}, URL: {url_lookup.get('report_count')}, 1930: {p1930.get('verdict')}, 1800: {p1800.get('verdict')}"
    ))

    # -------------------------------------------------------------------------
    # Scenario 16: Concurrent Load Check (50 lookups, p50 and p95 latency)
    # -------------------------------------------------------------------------
    import concurrent.futures
    latencies = []
    
    def single_lookup():
        t0 = time.perf_counter()
        r = client.get("/lookup?type=phone&value=18001600")
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0) # in ms
        return r.status_code == 200

    base_url = os.getenv("BASE_URL")
    if base_url:
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futs = [executor.submit(single_lookup) for _ in range(50)]
            all_ok = all(f.result() for f in concurrent.futures.as_completed(futs))
    else:
        # In-process test client: run 50 requests
        all_ok = all(single_lookup() for _ in range(50))

    latencies.sort()
    p50 = latencies[int(len(latencies) * 0.50)]
    p95 = latencies[int(len(latencies) * 0.95)]
    s16_pass = all_ok and p95 < 500.0
    results.append(TestResult(
        "16. Concurrent Load Check (50 lookups, p95 < 500ms)",
        s16_pass,
        f"p50: {p50:.2f}ms, p95: {p95:.2f}ms, 100% 200 OK: {all_ok}"
    ))

    # -------------------------------------------------------------------------
    # Scenario 17: Genuine single report produces NEW_TYPE alert
    # -------------------------------------------------------------------------
    pin_clean = "506002" # Warangal (clean area with 0 prior reports)
    res_gen = client.post("/reports", json={
        "report_id": "rep_genuine_single_new_type",
        "occurred_at": now.isoformat(),
        "reported_at": now.isoformat(),
        "reporter_id": "genuine_citizen_warangal",
        "ip_prefix": "115.240.10",
        "channel": "SMS or WhatsApp",
        "scam_type": "electricity-disconnection",
        "identifier_type": "phone",
        "identifier_value": "+919700000099",
        "pincode": pin_clean,
        "locality": "Warangal",
        "city": "Warangal",
        "note": "SMS warning: electricity supply will be disconnected at 9:30 PM due to unpaid bill",
        "has_screenshot": True,
        "amount_lost_inr": 0
    })

    alert_clean = client.get(f"/alerts?pincode={pin_clean}").json()
    clean_alerts = alert_clean.get("alerts", [])
    has_genuine_new_type = any(
        a.get("type") == "NEW_TYPE" and a.get("scam_type") == "electricity-disconnection"
        for a in clean_alerts
    )
    s17_pass = (res_gen.status_code == 201) and has_genuine_new_type
    results.append(TestResult(
        "17. Genuine single report of new scam type produces NEW_TYPE alert",
        s17_pass,
        f"Status: {res_gen.status_code}, Found NEW_TYPE electricity-disconnection: {has_genuine_new_type}"
    ))

    # -------------------------------------------------------------------------
    # Print formatted Summary Table
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print(f"{'#':<3} | {'Scenario Name':<45} | {'Result':<8} | {'Details'}")
    print("-" * 80)

    all_passed = True
    for idx, r in enumerate(results, 1):
        status_str = "PASS [OK]" if r.passed else "FAIL [X]"
        if not r.passed:
            all_passed = False
        print(f"{idx:<3} | {r.name:<45} | {status_str:<8} | {r.details}")

    print("-" * 80)
    if all_passed:
        print("[SUCCESS] ALL ADVERSARIAL SCENARIOS PASSED WITH ZERO REGRESSIONS!")
    else:
        print("[FAILURE] SOME ADVERSARIAL SCENARIOS FAILED.")
    print("=" * 80 + "\n")

    return all_passed

if __name__ == "__main__":
    success = run_adversarial_suite()
    sys.exit(0 if success else 1)
