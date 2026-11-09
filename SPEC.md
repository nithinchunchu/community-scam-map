# Community Scam Map - Specification

> Derived from the hackathon student brief and distilled system specification.
> The PDF is the source of truth. If any conflict arises, the PDF takes precedence.

---

## A. Scoring. Optimise for this

- **Backend auto-test tool (live server):**
  - Stops fake reports: 20
  - Lookup correct, all formats match, under 500 ms: 15
  - Map and alerts: 10
  - Privacy: 15 (hidden numbers under 3 reporters, anonymous, careful wording)
- **Judges:**
  - Server and licence: 15
  - Easy to report: 15 (under 60 s on a phone, usable in Hindi or from icons, no login)
  - Demo, README, pitch: 10
- **Bonus (up to 7):**
  - Verified business and helplines: 3
  - Dispute: 2
  - Fake reports never trigger alerts: 2
- **Automatic disqualification:**
  - A reporter can be identified
  - Exact locations stored
  - Personal data scraped
  - Code written before the event
- **Crucial testing reality:**
  - Judges load a secret new dataset on judging day.
  - NEVER hardcode specific numbers in logic.
  - A seeded data table of verified identifiers is allowed because it is data, not logic.

---

## B. Stack (decided, do not re-debate)

- **Backend:** Python 3.11+ (running 3.12 locally), FastAPI, SQLAlchemy 2, Pydantic v2, PyNaCl.
- **Database:** From `DATABASE_URL` (Postgres in production, SQLite locally: `sqlite:///./scammap.db`). Nothing that must survive a restart lives only in memory.
- **Frontend:** React + Vite + TypeScript + Tailwind, mobile-first PWA, built to `frontend/dist` and served by FastAPI at `/`. One deployable service, same origin.
- **Deploy:** Dockerfile + render.yaml, HTTPS. `make dev`, `make test`, `make build` must work.
- **Layout:**
  - `app/` (`api/`, `core/`, `trust/`, `db/`, `data/`)
  - `frontend/`
  - `tests/`
  - `scripts/`
  - `tools/` (licence tooling)
  - `docs/`
  - `design/`

---

## C. API Contract (exact, JSON in and out, NO login on these seven; extra response fields are fine)

### 1. `GET /health`
- **Reply:** `200 {"ok": true}`

### 2. `POST /reports`
- **Body fields:**
  - `report_id`: string (e.g. `"rep_000123"`)
  - `occurred_at`: ISO 8601 string (e.g. `"2026-10-27T18:21:04+05:30"`)
  - `reported_at`: ISO 8601 string (e.g. `"2026-10-27T18:40:04+05:30"`)
  - `reporter_id`: optional string (e.g. `"r_7c2d91aa"`)
  - `ip_prefix`: optional string (e.g. `"103.21.58"`)
  - `channel`: string (`"Phone call"`, `"SMS or WhatsApp"`, `"QR code"`, `"Fake website"`, `"UPI request"`, `"Something else"`)
  - `scam_type`: string (`"digital-arrest"`, `"fake-kyc-link"`, `"upi-refund-qr"`, `"investment-group"`, `"courier-customs"`, `"job-offer"`, `"lottery-prize"`, `"loan-app-harassment"`, `"electricity-disconnection"`, `"fake-customer-care"`, `"otp-call"`, `"sextortion"`, or `"other"`)
  - `identifier_type`: string (`"phone" | "upi" | "url" | "sender_id"`)
  - `identifier_value`: string
  - `pincode`: string (e.g. `"560102"`)
  - `locality`: string
  - `city`: string
  - `note`: string (English, Hindi, Hinglish or empty)
  - `has_screenshot`: bool
  - `amount_lost_inr`: float/int
- **Reply:**
  - `201 {"report_id": "...", "case_id": "...", "merged": true|false}`
  - `merged` is true when an earlier report about the same identifier exists.
- **Validation & Status codes:**
  - `400 {"error": "..."}` for:
    - Invalid identifier (e.g., junk like `"12345"` or `"test"`)
    - Pincode not in our area table
    - Unparseable time
    - `occurred_at` more than 10 minutes in the future
  - Old reports (even 30+ days) are accepted.
  - Unknown `scam_type` becomes `"other"`. Unknown `channel` becomes `"Something else"`. Never reject for those.
  - If `reporter_id` or `ip_prefix` is missing (real app usage), derive an anonymous value from the request IP (/24 prefix) and a random ID.
  - Use `reporter_id` and `ip_prefix` in the body as the identity, NOT the connection address (the test tool simulates many reporters from one machine).
  - Idempotent on `report_id`: the same `report_id` twice never double counts.
  - `429` only for extreme abuse (e.g. > 30 reports/min per reporter_key). Do not rate-limit normal bursts as test tool sends rapid batches.

### 3. `GET /lookup?type=&value=` (value URL-encoded)
- **Query params:**
  - `type`: `"phone" | "upi" | "url" | "sender_id"`
  - `value`: string (URL encoded)
- **Reply:**
  ```json
  {
    "verdict": "KNOWN_SCAM",
    "report_count": 7,
    "distinct_reporters": 7,
    "first_seen": "2026-10-14T09:12:00+05:30",
    "last_seen": "2026-10-27T18:21:04+05:30",
    "scam_type": "digital-arrest",
    "display_value": "+919876543210",
    "evidence": [
      {
        "occurred_at": "2026-10-27T18:21:04+05:30",
        "channel": "Phone call",
        "scam_type": "digital-arrest",
        "pincode": "560102"
      }
    ],
    "challenged": false,
    "verified_name": "HDFC Bank customer care" // optional, when verified
  }
  ```
- **Constraints & Edge cases:**
  - `verdict`: exactly one of `KNOWN_SCAM | SUSPICIOUS | NO_REPORTS | VERIFIED_BUSINESS`.
  - `distinct_reporters`: count of distinct persons AFTER trust rules (e.g., one person reporting six times counts as 1).
  - `display_value`: masked until `distinct_reporters >= 3`.
    - Phone: `98XXXXX210` (first 2 + XXXXX + last 3 of the 10 digits).
    - UPI: `r***@okaxis` (first char + *** + @ + domain).
    - URL: `sbi***.in/...` (first 3 chars of host + *** + last label + /...).
    - Sender: `HD****` (first 2 + ****).
    - Masked also for `NO_REPORTS`.
    - Verified identifiers show in full!
  - `evidence`: max 5 items; never includes who, IP, or notes.
  - Unreported number: `200` with `NO_REPORTS` (never 404).
  - Impossible/invalid value: `400`. Missing or invalid type: `400`.
  - Under 500 ms (index canonical value, target p95 < 150 ms).

### 4. `GET /map?pincode=560102&days=7&radius_km=2`
- **Defaults:** `days=7`, `radius_km=2`.
- **Returns:**
  ```json
  {
    "clusters": [
      {
        "pincode": "560102",
        "locality": "HSR Layout",
        "city": "Bengaluru",
        "count": 12,
        "top_scam_type": "digital-arrest",
        "severity": "CRIT",
        "lat": 12.9116,
        "lng": 77.6473
      }
    ]
  }
  ```
- One cluster per area within the radius (haversine from requested area's point) that has trusted reports in window.
- Use area table coordinates, NEVER anything from a reporter.
- Window computed from each report's `occurred_at` against server clock.
- If `pincode` is missing, return all areas with reports.
- Unknown `pincode` is `400`.

### 5. `GET /alerts?pincode=`
- **Returns:**
  ```json
  {
    "alerts": [
      {
        "type": "SPIKE",
        "pincode": "560102",
        "window": "24h",
        "count": 10,
        "baseline_per_day": 2.0
      },
      {
        "type": "NEW_TYPE",
        "pincode": "560102",
        "scam_type": "job-offer",
        "window": "24h"
      }
    ]
  }
  ```
- Empty list `{"alerts": []}` when none.
- `SPIKE`: trusted reports in last 24h >= 5 AND >= 2x the daily average of previous 7 days (the 7 days before the last 24h).
- `NEW_TYPE`: scam type reported in last 24h NOT seen in that area in the 30 days before.
- Count only trusted (post-trust-rules) reports. Fake reports never trigger alerts.
- Missing `pincode` returns alerts for all areas.

### 6. `POST /admin/reset`
- Delete ALL reports, challenges, reporter reputations, and caches.
- Reply `200 {"ok": true}`.
- Do NOT delete the licence.
- Re-seed the verified table.
- Must work on deployed server.

### 7. `POST /challenges` (Bonus)
- **Body:** `{identifier_type, identifier_value, claimant_name, contact_email, proof_note}`
- **Reply:** `201 {"challenge_id": "...", "status": "under_review"}`
- When challenged, lookup returns `"challenged": true` and verdict is NEVER `KNOWN_SCAM` while under review (cap at `SUSPICIOUS`, or `NO_REPORTS`).
- Store contact email and name ONLY in challenges table, never in logs or lookup output.

---

## D. Normalisation. Every spelling becomes one canonical key

- **Phone:**
  - Strip spaces, hyphens, dots, brackets.
  - Toll-free check: starts with `1800` or `1860` and has 8 to 12 digits -> canonical form is digits only (`18001600`, `18604195555`).
  - 4-digit code starting with 1 (`1930`, `1909`) is canonical as-is. Reject obvious junk (`1234`, `1111`).
  - Otherwise remove leading `+`, then `0091`, then `91` (if 12 digits) or leading `0` (if 11 digits).
  - Must end up as exactly 10 digits with first digit 2 to 9. Canonical form is `+91` followed by the 10 digits (`+919876543210`, `+918041002233`).
  - Reject letters, 5-digit values (`12345`), all-same-digit (`0000000000`), sequential junk (`1234567890`, `0123456789`).
- **UPI:**
  - Trim, lowercase, remove whitespace.
  - Regex: `^[a-z0-9][a-z0-9._-]+@[a-z][a-z0-9]+$`
  - `Ravi12@OKAXIS` -> `ravi12@okaxis`. `"test"` is rejected.
- **URL:**
  - Add `https://` if missing scheme, lowercase host, force https, strip leading `www.`, drop query string and fragment, drop trailing slash.
  - Host must contain a dot and valid domain characters.
  - `http://www.sbi-kyc.in/pay?utm=sms` -> `https://sbi-kyc.in/pay`.
  - Reject `"test"`.
- **sender_id:**
  - Uppercase. Regex: `^(?:[A-Z]{2}-?)?([A-Z0-9]{6})(?:-[A-Z])?$` and keep the 6-character group.
  - `VM-HDFCBK`, `AD-HDFCBK`, `HDFCBK` all become `HDFCBK`.
- One function per type in `app/core/normalize.py`, with table-driven tests.

---

## E. Trust Rules (Explainable)

- **Goal:** Stop report-bombing, fake accounts on one Wi-Fi, spam, and junk, while still labelling a real campaign (many unrelated people, own words) as KNOWN_SCAM.
- **Storage per report ONLY:**
  - `report_id`, `case` (identifier_type + canonical_value)
  - `occurred_at`, `reported_at`, `received_at`
  - `channel`, `scam_type`, `pincode`
  - `reporter_key` = HMAC-SHA256(server_secret, reporter_id) truncated
  - `ip_key` = HMAC-SHA256(server_secret, ip_prefix) truncated
  - `note_features` (length, empty bool, hashed char 4-gram shingles for similarity)
  - `has_screenshot`, `amount_lost_inr`
  - Raw note, raw reporter_id, and raw IP are NEVER stored or logged!
- **Persons (Union-Find):**
  - Within one identifier, merge reports into a "person" if:
    - Same `reporter_key`; OR
    - Same `ip_key` within 60 minutes; OR
    - Near-duplicate notes (Jaccard >= 0.7 on 4-gram shingles).
  - Many reports from one person count as 1 in `distinct_reporters`.
- **Person weight = reputation x note_quality:**
  - Reputation starts at 0.7 for a new reporter.
  - Earlier report landed on KNOWN_SCAM (confirmed by >= 3 OTHER persons): +0.15.
  - Earlier report landed on challenged or verified: -0.2.
  - Clamp reputation to `[0.3, 1.5]`.
  - `note_quality`: empty = 0.6, < 20 chars = 0.8, >= 20 original chars = 1.0, + 0.2 if `amount_lost_inr > 0` or `has_screenshot` (cap 1.2).
  - Person's weight is the max over their reports, never the sum.
- **Spam reporter penalty:**
  - A `reporter_key` reporting >= 8 different identifiers within 1 hour gets weight `* 0.3`.
- **Coordination gate:**
  - If >= 5 persons arrived within 60 minutes and either `(unique ip_key / persons) < 0.5` OR `average note dissimilarity < 0.4`, collapse the whole burst into ONE coordinated person.
- **Verdict order:**
  - `VERIFIED_BUSINESS` (verified table) > `challenged` cap > `KNOWN_SCAM` (persons >= 3 AND weighted score >= 2.5) > `SUSPICIOUS` (at least 1 trusted report) > `NO_REPORTS`.
  - Thresholds in `app/trust/config.py` as named constants.
- **Effective reports:**
  - Earliest report per person per identifier, excluding coordinated-collapsed extras and verified identifiers. Map counts and alerts use effective reports.
- Plain English explanation in `docs/TRUST_RULES.md`.

---

## F. Privacy Rules (Zero Disqualification)

1. Anonymous reporters: no name, phone or exact location stored or shown; area only.
2. Numbers hidden until 3 different people (`distinct_reporters >= 3`).
3. Wording is `"Reported by X people near you"`, NEVER `"scammer"` or `"This person is a fraud"`.
4. No scraping or people-search.
5. No personal data in logs: configure uvicorn/logging so query strings are not logged. Log only report_id, status code, timing. Never log note, identifier, IP or reporter_id.
6. No 3rd party analytics.
7. Privacy page in frontend.

---

## G. Licence (15 points)

- Structure: `{"licensee", "expires_at" (ISO with +05:30), "signature"}`
- Ed25519 via PyNaCl. Signature = base64 over canonical JSON of `{"licensee", "expires_at"}` (sorted keys, no spaces).
- Public key embedded in code. Private key lives OUTSIDE repo in `~/.scammap/` (gitignored).
- Tools: `tools/gen_keys.py` and `tools/make_license.py --licensee "Demo Bank" --minutes 5` or `--days 30`.
- Middleware checks in-memory cached licence on EVERY request. Expired/invalid: returns `403 {"error": "LICENSE_EXPIRED"}` on all routes except `/health`, `/license` (GET/POST), and static assets.
- `GET /license`: `{licensee, expires_at, status: "valid"|"expired", seconds_remaining}`
- `POST /license`: verifies signature, checks expiry, saves to DB and activates immediately without restart.
- Boot loader: checks DB, falls back to `LICENSE_JSON` env var.
- Clock rollback guard: `max_seen_time` persisted. If `now < max_seen_time - 120s`, treat as expired (`clock_tampered`).

---

## H. Working Rules & Verified Data

- Write tests first for normalisation and trust.
- After any trust change, run full adversarial suite.
- No special-casing specific numbers. Verified data lives in seeded table.
- Keep code simple and explainable.
- Never commit secrets, private keys, or real personal data.
- Every stage ends with: what changed, how I verify it, and exact commands to run.

### Verified Identifiers
- `phone`:
  - `1930` National Cybercrime Helpline
  - `1909` TRAI Do Not Disturb
  - `18001600` HDFC Bank customer care
  - `18002600` HDFC Bank customer care
  - `18001080` ICICI Bank customer care
  - `18001234` State Bank of India customer care
  - `18002100` State Bank of India customer care
  - `18604195555` Axis Bank customer care
  - `18602662666` Kotak Mahindra Bank customer care
  - `+918041002233` Fresh Bakes, Indiranagar (made up)
  - `+918025530190` Koramangala Pharmacy (made up)
- `sender_id`:
  - `HDFCBK` HDFC Bank SMS sender
  - `ICICIB` ICICI Bank SMS sender
  - `SBIINB` State Bank of India SMS sender
  - `AXISBK` Axis Bank SMS sender
  - `KOTAKB` Kotak Mahindra Bank SMS sender
- `url`:
  - `https://cybercrime.gov.in` National Cyber Crime Reporting Portal
  - `https://sancharsaathi.gov.in` Sanchar Saathi
- `upi`:
  - `freshbakes@okaxis` Fresh Bakes, Indiranagar (made up)

### Valid Areas (25 + 2 demo = 27 total)
All 25 from Appendix B plus 506002 Warangal and 506001 Hanamkonda. Reject any pincode not in this list.
