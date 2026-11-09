import math
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from collections import defaultdict, Counter

from fastapi import APIRouter, Query, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Area, Report
from app.trust.engine import get_all_trusted_reports
from app.trust import config

router = APIRouter()

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Computes Haversine distance in kilometers between two lat/lng points."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def compute_severity(count: int) -> str:
    if count >= config.SEVERITY_CRIT_THRESHOLD:
        return "CRIT"
    elif count >= config.SEVERITY_HIGH_THRESHOLD:
        return "HIGH"
    return "MED"

@router.get("/map")
def get_scam_map(
    pincode: Optional[str] = Query(None, description="Center area pincode"),
    days: int = Query(7, ge=1, description="Time window in days"),
    radius_km: float = Query(2.0, ge=0.1, description="Radius in kilometers"),
    db: Session = Depends(get_db)
):
    all_areas = {a.pincode: a for a in db.query(Area).all()}

    # If pincode provided, validate it exists in our Area table
    target_area = None
    if pincode is not None:
        pincode_clean = pincode.strip()
        target_area = all_areas.get(pincode_clean)
        if not target_area:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": f"Unknown pincode: {pincode}"}
            )

    # Compute time window cutoff against server clock
    now_utc = datetime.now(timezone.utc)
    cutoff = now_utc - timedelta(days=days)

    # Get trusted reports in the window
    trusted_reports = get_all_trusted_reports(db, since=cutoff)

    # Group reports by pincode
    reports_by_pincode: Dict[str, List[Report]] = defaultdict(list)
    for r in trusted_reports:
        reports_by_pincode[r.pincode].append(r)

    clusters = []

    # If center pincode provided, check distance to each area with reports
    for area_pin, area_obj in all_areas.items():
        area_reports = reports_by_pincode.get(area_pin, [])
        if not area_reports:
            continue

        if target_area is not None:
            dist = haversine_km(target_area.lat, target_area.lng, area_obj.lat, area_obj.lng)
            if dist > radius_km:
                continue

        count = len(area_reports)
        # Find top scam type
        scam_counts = Counter(r.scam_type for r in area_reports)
        top_scam_type = scam_counts.most_common(1)[0][0] if scam_counts else "other"

        clusters.append({
            "pincode": area_obj.pincode,
            "locality": area_obj.locality,
            "city": area_obj.city,
            "count": count,
            "top_scam_type": top_scam_type,
            "severity": compute_severity(count),
            "lat": area_obj.lat,
            "lng": area_obj.lng
        })

    # Sort clusters by count descending
    clusters.sort(key=lambda x: x["count"], reverse=True)

    return {"clusters": clusters}
