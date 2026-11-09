from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from collections import defaultdict

from fastapi import APIRouter, Query, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Area, Report
from app.trust.engine import get_all_trusted_reports
from app.trust import config

router = APIRouter()

@router.get("/alerts")
def get_alerts(
    pincode: Optional[str] = Query(None, description="Area pincode to filter alerts"),
    db: Session = Depends(get_db)
):
    all_areas = {a.pincode: a for a in db.query(Area).all()}

    # If pincode provided, validate it exists in our Area table
    target_pincodes: List[str] = []
    if pincode is not None:
        pincode_clean = pincode.strip()
        if pincode_clean not in all_areas:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": f"Unknown pincode: {pincode}"}
            )
        target_pincodes = [pincode_clean]
    else:
        target_pincodes = list(all_areas.keys())

    now_utc = datetime.now(timezone.utc)
    t_24h = now_utc - timedelta(hours=24)
    t_8d = now_utc - timedelta(days=8)
    t_31d = now_utc - timedelta(days=31)

    # Fetch all trusted reports from the past 31 days
    all_trusted = get_all_trusted_reports(db, since=t_31d)

    # Partition reports by pincode
    reports_24h_by_pin: Dict[str, List[Report]] = defaultdict(list)
    reports_7d_prev_by_pin: Dict[str, List[Report]] = defaultdict(list)
    reports_30d_prev_by_pin: Dict[str, List[Report]] = defaultdict(list)

    for r in all_trusted:
        if r.pincode not in all_areas:
            continue
        r_occ = r.occurred_at.replace(tzinfo=timezone.utc) if r.occurred_at.tzinfo is None else r.occurred_at
        if r_occ >= t_24h:
            reports_24h_by_pin[r.pincode].append(r)
        elif r_occ >= t_8d:
            reports_7d_prev_by_pin[r.pincode].append(r)
        
        if t_31d <= r_occ < t_24h:
            reports_30d_prev_by_pin[r.pincode].append(r)

    alerts = []

    for pin in target_pincodes:
        reps_24h = reports_24h_by_pin.get(pin, [])
        reps_7d_prev = reports_7d_prev_by_pin.get(pin, [])
        reps_30d_prev = reports_30d_prev_by_pin.get(pin, [])

        count_24h = len(reps_24h)
        count_7d_prev = len(reps_7d_prev)
        baseline_per_day = round(count_7d_prev / 7.0, 1)

        # 1. SPIKE Alert:
        # trusted reports in last 24h >= 5 AND >= 2x the daily average of previous 7 days
        if count_24h >= config.SPIKE_MIN_REPORTS and count_24h >= (config.SPIKE_BASELINE_MULTIPLIER * baseline_per_day):
            alerts.append({
                "type": "SPIKE",
                "pincode": pin,
                "window": "24h",
                "count": count_24h,
                "baseline_per_day": baseline_per_day
            })

        # 2. NEW_TYPE Alert:
        # a scam type reported in last 24h that was NOT seen in that area in the 30 days before
        seen_prev_types = {r.scam_type for r in reps_30d_prev}
        new_types_seen = set()
        for r in reps_24h:
            if r.scam_type not in seen_prev_types and r.scam_type not in new_types_seen:
                new_types_seen.add(r.scam_type)
                alerts.append({
                    "type": "NEW_TYPE",
                    "pincode": pin,
                    "scam_type": r.scam_type,
                    "window": "24h"
                })

    return {"alerts": alerts}
