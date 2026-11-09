#!/usr/bin/env python3
"""
scripts/benchmark_lookup.py
Measures p50 and p95 of /lookup endpoint with 5,000 reports loaded.
Target: p95 < 150 ms.
"""

import time
import random
import statistics
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Ensure repo root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.models import Base, Report
from app.db.session import get_db
from app.db.init_db import init_db
from app.core.security import hash_reporter_id, hash_ip_prefix
from app.trust.shingles import extract_note_features

def run_benchmark(num_reports: int = 5000, num_queries: int = 250):
    print("=" * 60)
    print(f"BENCHMARK: /lookup performance with {num_reports} reports")
    print("=" * 60)

    # Use in-memory SQLite with StaticPool for realistic test execution
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSession()
    init_db(db)

    # Override app get_db
    def override_get_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    print(f"[*] Generating and bulk-inserting {num_reports} synthetic reports...")
    now = datetime.now(timezone.utc)
    scam_types = ["digital-arrest", "fake-kyc-link", "upi-refund-qr", "job-offer", "courier-customs"]
    channels = ["Phone call", "SMS or WhatsApp", "QR code", "Fake website"]
    pincodes = ["560102", "560038", "560034", "560076", "560011", "560037", "400050", "110016"]

    # Generate 500 distinct phone numbers
    target_numbers = [f"+9198765{i:05d}" for i in range(500)]

    reports_to_insert = []
    sample_feat = extract_note_features("Suspicious extortion call claiming CBI arrest")

    for i in range(num_reports):
        num = random.choice(target_numbers)
        case_id = f"phone:{num}"
        occ = now - timedelta(hours=random.randint(1, 240))
        r = Report(
            report_id=f"bench_rep_{i}",
            case_id=case_id,
            identifier_type="phone",
            identifier_value=num,
            occurred_at=occ,
            reported_at=occ,
            received_at=occ,
            channel=random.choice(channels),
            scam_type=random.choice(scam_types),
            pincode=random.choice(pincodes),
            locality="HSR Layout",
            city="Bengaluru",
            reporter_key=hash_reporter_id(f"bench_reporter_{i % 300}"),
            ip_key=hash_ip_prefix(f"103.{i % 50}.{i % 255}"),
            note_length=sample_feat["length"],
            note_is_empty=sample_feat["is_empty"],
            has_screenshot=(i % 3 == 0),
            amount_lost_inr=float(1000 * (i % 5))
        )
        r.note_shingles = sample_feat["shingles"]
        reports_to_insert.append(r)

    db.bulk_save_objects(reports_to_insert)
    db.commit()
    print(f"[+] Bulk insert complete. Total reports in DB: {db.query(Report).count()}")

    # Warmup
    for _ in range(10):
        client.get("/lookup?type=phone&value=%2B919876500001")

    print(f"[*] Running {num_queries} timed lookup requests across loaded dataset...")
    latencies = []

    for _ in range(num_queries):
        val = random.choice(target_numbers)
        start_t = time.perf_counter()
        res = client.get(f"/lookup?type=phone&value={val}")
        elapsed_ms = (time.perf_counter() - start_t) * 1000.0
        assert res.status_code == 200
        latencies.append(elapsed_ms)

    p50 = statistics.median(latencies)
    latencies.sort()
    idx_95 = int(0.95 * len(latencies))
    p95 = latencies[idx_95]
    p99 = latencies[int(0.99 * len(latencies))]
    mean_val = statistics.mean(latencies)

    print("-" * 60)
    print(f"RESULTS ({num_queries} queries):")
    print(f"  Mean latency: {mean_val:.2f} ms")
    print(f"  p50 (median): {p50:.2f} ms")
    print(f"  p95:         {p95:.2f} ms")
    print(f"  p99:         {p99:.2f} ms")
    print("-" * 60)

    if p95 < 150.0:
        print(f"[SUCCESS] p95 ({p95:.2f} ms) is well UNDER 150 ms target!")
    else:
        print(f"[WARNING] p95 ({p95:.2f} ms) exceeded 150 ms target.")
    print("=" * 60)

if __name__ == "__main__":
    run_benchmark(5000, 250)
