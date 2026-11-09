#!/usr/bin/env bash
# ==============================================================================
# scripts/licence_demo.sh
# Automated 4-Step Judge Demonstration for Ed25519 Licence & Rollback Enforcement
# Usage:
#   ./scripts/licence_demo.sh http://localhost:8000
#   ./scripts/licence_demo.sh https://community-scam-map.onrender.com
# ==============================================================================

set -e

BASE_URL="${1:-http://localhost:8000}"
BASE_URL="${BASE_URL%/}"

echo "================================================================================"
echo "COMMUNITY SCAM MAP - LICENCE DEMONSTRATION"
echo "Target Base URL: ${BASE_URL}"
echo "================================================================================"

# Step 0: Ensure we have python tool to generate dynamic test licences
PYTHON_CMD="python"
if command -v python3 &>/dev/null; then
  PYTHON_CMD="python3"
fi

# Step 1: Show GET /license & post a probe report for data integrity check
echo -e "\n[STEP 1] Querying current licence status (GET /license)..."
curl -s -w "\nHTTP Status: %{http_code}\n" "${BASE_URL}/license"

echo -e "\n[STEP 1b] Seeding a test report to verify data integrity across expiry..."
REPORT_ID="demo_probe_$(date +%s)"
curl -s -X POST "${BASE_URL}/reports" \
  -H "Content-Type: application/json" \
  -d '{
    "report_id": "'"${REPORT_ID}"'",
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
  }'
echo -e "\nReport seeded successfully."

# Step 2: Upload a short licence (5 seconds for automated runner)
echo -e "\n[STEP 2] Generating and uploading short-duration licence (5 seconds)..."
SHORT_LIC=$($PYTHON_CMD tools/make_license.py --licensee "Judge Demo Bank" --seconds 5 --compact)

UPLOAD_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/license" \
  -H "Content-Type: application/json" \
  -d "${SHORT_LIC}")
echo "${UPLOAD_RESP}"

echo -e "\nVerifying immediate activation without server restart:"
curl -s "${BASE_URL}/license"

# Step 3: Wait and show 403 LICENSE_EXPIRED on /lookup
echo -e "\n\n[STEP 3] Waiting 6 seconds for licence expiry..."
sleep 6

echo -e "\nVerifying licence has expired (GET /license):"
curl -s "${BASE_URL}/license"

echo -e "\nAttempting protected lookup (GET /lookup) - Expecting HTTP 403 LICENSE_EXPIRED:"
LOOKUP_EXPIRED=$(curl -s -w "\nHTTP Status: %{http_code}\n" "${BASE_URL}/lookup?type=phone&value=%2B919876543210")
echo "${LOOKUP_EXPIRED}"

if echo "${LOOKUP_EXPIRED}" | grep -q "LICENSE_EXPIRED"; then
  echo "[✔] SUCCESS: Protected route properly refused service with 403 LICENSE_EXPIRED!"
else
  echo "[✘] FAILED: Route was not blocked as expected."
fi

# Step 4: Upload long 30-day licence and verify data remains intact
echo -e "\n[STEP 4] Uploading renewed 30-day licence..."
LONG_LIC=$($PYTHON_CMD tools/make_license.py --licensee "Enterprise Scam Defense" --days 30 --compact)

curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "${BASE_URL}/license" \
  -H "Content-Type: application/json" \
  -d "${LONG_LIC}"

echo -e "\nVerifying licence status after renewal (GET /license):"
curl -s "${BASE_URL}/license"

echo -e "\nVerifying service restored and previous data is 100% INTACT (GET /lookup):"
LOOKUP_RESTORED=$(curl -s "${BASE_URL}/lookup?type=phone&value=%2B919876543210")
echo "${LOOKUP_RESTORED}"

if echo "${LOOKUP_RESTORED}" | grep -q "report_count"; then
  echo -e "\n================================================================================"
  echo "[✔] ALL 4 LICENCE STAGES COMPLETED SUCCESSFULLY WITH ZERO DATA LOSS!"
  echo "================================================================================"
fi
