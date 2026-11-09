import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models import Report, VerifiedIdentifier, Challenge, Area
from app.trust.union_find import UnionFind
from app.trust.shingles import jaccard_similarity
from app.core.normalize import mask_identifier
from app.trust import config

IST = timezone(timedelta(hours=5, minutes=30))

def format_iso_time(dt: datetime | None) -> str | None:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST).isoformat()

def compute_note_quality(length: int, is_empty: bool, has_screenshot: bool, amount_lost_inr: float) -> float:
    """
    note_quality:
    - empty 0.6
    - under 20 characters 0.8
    - 20 or more characters 1.0
    - plus 0.2 if amount_lost_inr > 0 or has_screenshot (cap 1.2)
    """
    if is_empty or length == 0:
        base = config.NOTE_QUALITY_EMPTY
    elif length < 20:
        base = config.NOTE_QUALITY_SHORT
    else:
        base = config.NOTE_QUALITY_STANDARD

    if has_screenshot or (amount_lost_inr and amount_lost_inr > 0):
        base += config.NOTE_QUALITY_BONUS

    return min(base, config.NOTE_QUALITY_CAP)


def compute_reporter_reputation(
    reporter_key: str,
    db: Session,
    exclude_case_id: str | None = None,
    verified_set: set | None = None,
    challenged_set: set | None = None
) -> float:
    """
    Reputation starts at 0.7 for a new reporter.
    +0.15 for each earlier report that landed on a KNOWN_SCAM identifier (confirmed by >= 3 OTHER persons).
    -0.2 for each earlier report that landed on a challenged or verified identifier.
    Clamped to [0.3, 1.5].
    """
    reputation = config.INITIAL_REPUTATION

    # Find distinct other cases reported by this reporter
    query = db.query(Report.case_id, Report.identifier_type, Report.identifier_value).filter(
        Report.reporter_key == reporter_key
    )
    if exclude_case_id:
        query = query.filter(Report.case_id != exclude_case_id)

    other_cases = query.distinct().all()
    if not other_cases:
        return reputation

    if verified_set is None:
        verified_set = {(v.identifier_type, v.identifier_value) for v in db.query(VerifiedIdentifier).all()}
    if challenged_set is None:
        challenged_set = {(c.identifier_type, c.identifier_value) for c in db.query(Challenge).filter(Challenge.status == "under_review").all()}

    # Check each distinct case
    for case_id, id_type, id_val in other_cases:
        if (id_type, id_val) in verified_set:
            reputation -= config.REPUTATION_PENALTY_VERIFIED_OR_CHALLENGED
            continue

        if (id_type, id_val) in challenged_set:
            reputation -= config.REPUTATION_PENALTY_VERIFIED_OR_CHALLENGED
            continue

        # Check if confirmed by at least 3 other distinct reporter keys
        other_reporter_count = db.query(func.count(func.distinct(Report.reporter_key))).filter(
            Report.case_id == case_id,
            Report.reporter_key != reporter_key
        ).scalar() or 0

        if other_reporter_count >= 3:
            reputation += config.REPUTATION_BOOST_KNOWN_SCAM

    return max(config.MIN_REPUTATION, min(reputation, config.MAX_REPUTATION))


def is_spam_reporter(reporter_key: str, target_time: datetime, db: Session, total_distinct_cases: int | None = None) -> bool:
    """
    A reporter_key that reports >= 8 different identifiers within 1 hour gets spam penalty (weight * 0.3).
    """
    if total_distinct_cases is not None and total_distinct_cases < config.SPAM_REPORTER_DISTINCT_IDENTIFIERS_THRESHOLD:
        return False

    window_start = target_time - timedelta(seconds=config.SPAM_REPORTER_WINDOW_SECONDS)
    window_end = target_time + timedelta(seconds=config.SPAM_REPORTER_WINDOW_SECONDS)

    count = db.query(func.count(func.distinct(Report.case_id))).filter(
        Report.reporter_key == reporter_key,
        Report.occurred_at >= window_start,
        Report.occurred_at <= window_end
    ).scalar() or 0

    return count >= config.SPAM_REPORTER_DISTINCT_IDENTIFIERS_THRESHOLD


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two decimal degree points in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def is_impossible_travel_reporter(reporter_key: str, db: Session, area_cache: Dict[str, Tuple[float, float]] | None = None) -> bool:
    """
    Layer 4 Security: Detects impossible travel velocity.
    If the same reporter_key reports from two distinct municipal centroids separated by
    distance at an impossible travel velocity (> 600 km/h), flag as spoofed traveler.
    """
    reps = db.query(Report.pincode, Report.occurred_at).filter(
        Report.reporter_key == reporter_key
    ).order_by(Report.occurred_at.asc()).all()

    if len(reps) < 2:
        return False

    if area_cache is None:
        area_cache = {a.pincode: (a.lat, a.lng) for a in db.query(Area).all()}

    for i in range(len(reps)):
        pin1, t1 = reps[i]
        coords1 = area_cache.get(pin1)
        if not coords1:
            continue
        for j in range(i + 1, len(reps)):
            pin2, t2 = reps[j]
            if pin1 == pin2:
                continue
            coords2 = area_cache.get(pin2)
            if not coords2:
                continue

            time_diff_hours = abs((t2 - t1).total_seconds()) / 3600.0
            dist = haversine_km(coords1[0], coords1[1], coords2[0], coords2[1])

            if time_diff_hours <= 0.01:
                # Same minute across distant cities (>50km apart) -> impossible travel
                if dist > 50.0:
                    return True
            else:
                speed = dist / time_diff_hours
                if speed > config.IMPOSSIBLE_TRAVEL_MAX_SPEED_KMH:
                    return True

    return False


class Person:
    def __init__(self, person_id: int):
        self.person_id = person_id
        self.reports: List[Report] = []
        self.weight: float = 0.0

    @property
    def earliest_report(self) -> Report:
        return min(self.reports, key=lambda r: r.occurred_at)

    @property
    def ip_keys(self) -> set:
        return {r.ip_key for r in self.reports}

    @property
    def reporter_keys(self) -> set:
        return {r.reporter_key for r in self.reports}


def evaluate_identifier(
    identifier_type: str,
    canonical_value: str,
    db: Session
) -> Dict[str, Any]:
    """
    Runs full trust evaluation for an identifier:
    1. Check verified business table.
    2. Check challenge table.
    3. Merge reports into Persons using Union-Find (reporter_key, IP within 60m, duplicate note Jaccard >= 0.7).
    4. Compute Person weights (reputation * note_quality * spam_penalty).
    5. Check coordination gate (burst of >= 5 persons within 60m with low IP entropy or low text dissimilarity).
    6. Derive final verdict, effective reports, and display_value.
    """
    case_id = f"{identifier_type}:{canonical_value}"

    # 1. Verified Business Check
    verified_entry = db.query(VerifiedIdentifier).filter(
        VerifiedIdentifier.identifier_type == identifier_type,
        VerifiedIdentifier.identifier_value == canonical_value
    ).first()

    # 2. Challenge Check
    challenge_entry = db.query(Challenge).filter(
        Challenge.identifier_type == identifier_type,
        Challenge.identifier_value == canonical_value,
        Challenge.status == "under_review"
    ).first()
    is_challenged = challenge_entry is not None

    # Load all reports for this case
    reports: List[Report] = db.query(Report).filter(Report.case_id == case_id).order_by(Report.occurred_at.asc()).all()

    if not reports:
        if verified_entry:
            return {
                "verdict": "VERIFIED_BUSINESS",
                "report_count": 0,
                "distinct_reporters": 0,
                "first_seen": None,
                "last_seen": None,
                "scam_type": None,
                "display_value": canonical_value, # Verified identifiers show in full
                "evidence": [],
                "challenged": is_challenged,
                "verified_name": verified_entry.owner_name,
                "effective_reports": []
            }
        else:
            return {
                "verdict": "NO_REPORTS",
                "report_count": 0,
                "distinct_reporters": 0,
                "first_seen": None,
                "last_seen": None,
                "scam_type": None,
                "display_value": mask_identifier(identifier_type, canonical_value),
                "evidence": [],
                "challenged": is_challenged,
                "effective_reports": []
            }

    # 3. Group reports into Persons with Union-Find
    n = len(reports)
    uf = UnionFind(list(range(n)))

    for i in range(n):
        for j in range(i + 1, n):
            r1 = reports[i]
            r2 = reports[j]

            # Condition A: same reporter_key
            if r1.reporter_key == r2.reporter_key:
                uf.union(i, j)
                continue

            # Condition B: same ip_key within 60 minutes
            time_diff = abs((r1.occurred_at - r2.occurred_at).total_seconds())
            if r1.ip_key == r2.ip_key and time_diff <= config.SAME_IP_WINDOW_SECONDS:
                uf.union(i, j)
                continue

            # Condition C: near-duplicate notes (Jaccard >= 0.7 on shingles)
            sim = jaccard_similarity(r1.note_shingles, r2.note_shingles)
            if sim >= config.JACCARD_DUPLICATE_THRESHOLD:
                uf.union(i, j)

    groups = uf.get_groups()
    persons: List[Person] = []

    # 4. Calculate Person weights (with local caches to achieve sub-millisecond execution)
    verified_set = {(v.identifier_type, v.identifier_value) for v in db.query(VerifiedIdentifier).all()}
    challenged_set = {(c.identifier_type, c.identifier_value) for c in db.query(Challenge).filter(Challenge.status == "under_review").all()}
    rep_cache: Dict[str, float] = {}
    spam_cache: Dict[str, bool] = {}
    travel_cache: Dict[str, bool] = {}
    area_coords_cache: Dict[str, Tuple[float, float]] = {a.pincode: (a.lat, a.lng) for a in db.query(Area).all()}

    for p_idx, (root, report_indices) in enumerate(groups.items()):
        person = Person(person_id=p_idx)
        person.reports = [reports[idx] for idx in report_indices]

        # Calculate max weight over all reports in this person
        max_report_weight = 0.0
        for r in person.reports:
            if r.reporter_key not in rep_cache:
                rep_cache[r.reporter_key] = compute_reporter_reputation(
                    r.reporter_key, db, exclude_case_id=case_id,
                    verified_set=verified_set, challenged_set=challenged_set
                )
            rep = rep_cache[r.reporter_key]

            nq = compute_note_quality(r.note_length, r.note_is_empty, r.has_screenshot, r.amount_lost_inr)

            if r.reporter_key not in spam_cache:
                spam_cache[r.reporter_key] = is_spam_reporter(r.reporter_key, r.occurred_at, db)
            spam_pen = config.SPAM_REPORTER_MULTIPLIER if spam_cache[r.reporter_key] else 1.0

            if r.reporter_key not in travel_cache:
                travel_cache[r.reporter_key] = is_impossible_travel_reporter(r.reporter_key, db, area_coords_cache)
            travel_pen = config.IMPOSSIBLE_TRAVEL_PENALTY_MULTIPLIER if travel_cache[r.reporter_key] else 1.0

            r_weight = rep * nq * spam_pen * travel_pen
            if r_weight > max_report_weight:
                max_report_weight = r_weight

        person.weight = max_report_weight
        persons.append(person)

    # 5. Coordination Gate
    # Check if >= 5 persons arrived within 60 minutes with low IP diversity or low note dissimilarity
    coordinated_collapse = False
    if len(persons) >= config.COORDINATION_MIN_PERSONS:
        # Sort persons by earliest report time
        sorted_persons = sorted(persons, key=lambda p: p.earliest_report.occurred_at)
        p_count = len(sorted_persons)
        
        # Sliding 60-minute window over persons
        for start_idx in range(p_count):
            window_persons = [sorted_persons[start_idx]]
            t0 = sorted_persons[start_idx].earliest_report.occurred_at
            for next_idx in range(start_idx + 1, p_count):
                if (sorted_persons[next_idx].earliest_report.occurred_at - t0).total_seconds() <= config.COORDINATION_WINDOW_SECONDS:
                    window_persons.append(sorted_persons[next_idx])
                else:
                    break

            if len(window_persons) >= config.COORDINATION_MIN_PERSONS:
                # Check IP entropy: unique ip_key / persons < 0.5
                all_ips = set()
                for wp in window_persons:
                    all_ips.update(wp.ip_keys)
                ip_ratio = len(all_ips) / len(window_persons)

                # Check note dissimilarity
                pair_count = 0
                dissim_sum = 0.0
                for i in range(len(window_persons)):
                    for j in range(i + 1, len(window_persons)):
                        r_a = window_persons[i].earliest_report
                        r_b = window_persons[j].earliest_report
                        sim = jaccard_similarity(r_a.note_shingles, r_b.note_shingles)
                        dissim_sum += (1.0 - sim)
                        pair_count += 1
                avg_dissim = (dissim_sum / pair_count) if pair_count > 0 else 1.0

                if ip_ratio < config.COORDINATION_IP_RATIO_THRESHOLD or avg_dissim < config.COORDINATION_AVG_DISSIMILARITY_THRESHOLD:
                    coordinated_collapse = True
                    break

    # If coordinated attack detected, collapse to 1 single person
    if coordinated_collapse:
        single_person = Person(person_id=0)
        single_person.reports = reports
        single_person.weight = max(p.weight for p in persons) if persons else 0.5
        persons = [single_person]

    distinct_reporters = len(persons)
    total_score = sum(p.weight for p in persons)

    # 6. Effective reports determination for alerts and map counts
    # Rule: Report groups the trust engine collapsed from several accounts, several IPs,
    # or near-duplicate notes, and groups flagged as coordinated bursts, contribute ZERO to alerts and map counts.
    effective_reports: List[Report] = []

    if not verified_entry and not coordinated_collapse:
        for p in persons:
            distinct_accounts = len(set(r.reporter_key for r in p.reports))
            distinct_ips = len(set(r.ip_key for r in p.reports))

            # Collapsed from several accounts or several IPs?
            if distinct_accounts > 1 or distinct_ips > 1:
                continue

            # Collapsed from near-duplicate notes across distinct reports?
            if len(p.reports) > 1:
                has_duplicate_note_merge = False
                for idx_a in range(len(p.reports)):
                    for idx_b in range(idx_a + 1, len(p.reports)):
                        if p.reports[idx_a].report_id != p.reports[idx_b].report_id:
                            if jaccard_similarity(p.reports[idx_a].note_shingles, p.reports[idx_b].note_shingles) >= config.JACCARD_DUPLICATE_THRESHOLD:
                                has_duplicate_note_merge = True
                                break
                    if has_duplicate_note_merge:
                        break
                if has_duplicate_note_merge:
                    continue

            # Layer 4 Security: Disqualify impossible travelers from contributing to community alerts/map counts
            if any(travel_cache.get(r.reporter_key, False) for r in p.reports):
                continue

            # Genuine person without sybil/duplicate collapse
            effective_reports.append(p.earliest_report)

    # 7. Verdict determination
    if verified_entry:
        verdict = "VERIFIED_BUSINESS"
        effective_reports = []
    elif is_challenged:
        # Capped at SUSPICIOUS (or NO_REPORTS if none)
        verdict = "SUSPICIOUS" if distinct_reporters >= 1 else "NO_REPORTS"
    elif distinct_reporters >= config.KNOWN_SCAM_MIN_PERSONS and total_score >= config.KNOWN_SCAM_MIN_SCORE:
        verdict = "KNOWN_SCAM"
    elif distinct_reporters >= 1:
        verdict = "SUSPICIOUS"
    else:
        verdict = "NO_REPORTS"

    # Display value masking: masked until distinct_reporters >= 3, verified always unmasked
    if verified_entry or distinct_reporters >= config.MASKING_MIN_PERSONS:
        display_value = canonical_value
    else:
        display_value = mask_identifier(identifier_type, canonical_value)

    # Compute top scam_type
    scam_types = [r.scam_type for r in reports]
    top_scam_type = max(set(scam_types), key=scam_types.count) if scam_types else "other"

    first_seen = format_iso_time(min(r.occurred_at for r in reports))
    last_seen = format_iso_time(max(r.occurred_at for r in reports))

    # Evidence: max 5 items, ordered by occurred_at desc
    evidence_source = effective_reports if effective_reports else [p.earliest_report for p in persons]
    sorted_ev_reports = sorted(evidence_source, key=lambda r: r.occurred_at, reverse=True)[:5]
    evidence = [
        {
            "occurred_at": format_iso_time(r.occurred_at),
            "channel": r.channel,
            "scam_type": r.scam_type,
            "pincode": r.pincode
        }
        for r in sorted_ev_reports
    ]

    result = {
        "verdict": verdict,
        "report_count": len(reports),
        "distinct_reporters": distinct_reporters,
        "first_seen": first_seen,
        "last_seen": last_seen,
        "scam_type": top_scam_type,
        "display_value": display_value,
        "evidence": evidence,
        "challenged": is_challenged,
        "effective_reports": effective_reports
    }
    if verified_entry:
        result["verified_name"] = verified_entry.owner_name

    return result


def get_all_trusted_reports(
    db: Session,
    since: datetime | None = None,
    pincode: str | None = None
) -> List[Report]:
    """
    Returns all trusted (effective) reports across the system.
    Evaluates each case using trust rules and extracts effective reports,
    filtering out fake/coordinated duplicates and verified identifiers.
    """
    query = db.query(Report.identifier_type, Report.identifier_value).distinct()
    if since is not None:
        query = query.filter(Report.occurred_at >= since)
    if pincode is not None:
        query = query.filter(Report.pincode == pincode)

    distinct_cases = query.all()
    trusted: List[Report] = []

    for id_type, id_val in distinct_cases:
        res = evaluate_identifier(id_type, id_val, db)
        for r in res.get("effective_reports", []):
            r_occ = r.occurred_at.replace(tzinfo=timezone.utc) if r.occurred_at.tzinfo is None else r.occurred_at
            if since is not None and r_occ < since:
                continue
            if pincode is not None and r.pincode != pincode:
                continue
            trusted.append(r)

    return trusted

