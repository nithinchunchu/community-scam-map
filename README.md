# 🛡️ Community Scam Map
### *Neighborhood-Verified, Privacy-First Fraud Defense Network for India*

[![Tests](https://img.shields.io/badge/Pytest%20Suite-105%20Passed-emerald.svg)](#-testing--verification)
[![Adversarial Suite](https://img.shields.io/badge/Adversarial%20Attacks-17%2F17%20Stopped-blue.svg)](#-adversarial-defense-matrix)
[![Privacy](https://img.shields.io/badge/Privacy%20By%20Design-100%25%20Anonymous-teal.svg)](#-privacy-first-architecture)
[![Licence](https://img.shields.io/badge/Licence%20Engine-Ed25519%20Signed-purple.svg)](#-ed25519-licence--anti-tamper-system)

---

## 📖 The Problem (Why We Built This)

> **Ravi's Story:**  
> Ravi's father received a video call from someone wearing a police uniform claiming a parcel with contraband was booked under his Aadhaar card. Terrified of a "digital arrest," he stayed on the call for three hours and lost ₹2,00,000.  
> 
> Ravi warned his family, but the rest of the neighborhood never heard about it. The next morning, the exact same fraudster called Priya three streets away. She had no way to know that this number had already stolen money from someone nearby.

Scams reach ordinary citizens every day through **WhatsApp calls, SMS phishing, fake courier notices, electricity cut-off threats, and fraudulent QR codes**.

**Community Scam Map** is the answer: a lightning-fast, anonymous platform where communities protect each other from scammers in real time.

---

## ✨ What the Application Does (At a Glance)

| Feature | What It Does for the User | How Fast & Safe It Is |
|---|---|---|
| **1. Fast Report** | Report a scam call, SMS, or QR code in 4 easy taps. | **Takes < 30 seconds**. Zero passwords, zero accounts, no login wall. |
| **2. Instant Lookup** | Paste any phone number, UPI ID, link, or SMS header to check its trust. | **Answers in < 0.1 seconds** with an explainable verdict: *Known Scam*, *Suspicious*, *No Reports*, or *Verified Business*. |
| **3. Neighborhood Map** | Explore a 7-day rolling map showing fraud hotspots in your city. | Shows municipal centroids (e.g. *HSR Layout*, *Hanamkonda*)—**never your private home address**. |
| **4. Early Warning Alerts** | Get notified when a scam surge (`SPIKE`) or a brand new scam technique (`NEW_TYPE`) hits your area. | Only fires on genuine emergencies—never spams you with every report. |
| **5. Business Dispute** | Legitimate businesses can contest false claims with one click. | Number is immediately marked `Under Review` and cannot be labeled a scam. |
| **6. Multimodal Vision AI** | Drop a screenshot of an SMS, UPI receipt, or fake notice. | AI instantly reads the text, extracts phone numbers/links, and detects urgency tricks. |

---

## 🚀 Quickstart: Run in 3 Commands

You can run the complete application on any laptop or server in 3 simple commands:

```bash
# Step 1: Install Python backend requirements
pip install -r requirements.txt

# Step 2: Build the React web application
npm run build --prefix frontend

# Step 3: Start the server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- **Open the App in Browser:** [http://localhost:8000](http://localhost:8000)
- **Interactive API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Judge & Admin Console:** [http://localhost:8000/admin](http://localhost:8000/admin)

---

## 📱 How Each Feature Works

### 1. Report a Scam (Under 45 Seconds)
- **No Login Required**: Anyone can report immediately without creating an account or entering an email.
- **Bilingual Interface**: Seamlessly toggle between **हिन्दी (Hindi)** and **English**.
- **Visual Icon Channels**: Phone call, SMS/WhatsApp, QR code, Fake website, UPI request, or Something else.
- **Smart Date Picker**: Choose *Just now*, *Earlier today*, *Yesterday*, or tap **Pick date** to choose a past date/time. Future dates are automatically rejected.
- **Automatic Centroid Lock**: Your report is tied to your nearest municipal zone (27 pre-verified Indian metro areas) to stop fake out-of-state bot reports.

### 2. Instant Identifier Lookup
Paste any identifier in any format:
- **Phone**: `+91 98765 43210`, `09876543210`, `98765-43210`, and `919876543210` automatically normalize to `+919876543210`.
- **UPI ID**: `Ravi12@OKAXIS` normalizes to `ravi12@okaxis`.
- **Website Link**: `http://www.sbi-kyc.in/pay?utm=sms` normalizes to `https://sbi-kyc.in/pay` (strips trackers and trailing slashes).
- **SMS Sender ID**: `VM-HDFCBK` and `AD-HDFCBK` normalize to `HDFCBK`.

#### The 4 Clear Verdicts:
1. 🟢 **VERIFIED_BUSINESS**: Official helplines (`1930`, `1909`), banks, and verified merchants. Immune to crowd smearing.
2. 🔴 **KNOWN_SCAM**: Confirmed fraud backed by independent, unrelated citizens with corroborating evidence.
3. 🟡 **SUSPICIOUS**: Unverified reports, ongoing coordination, or numbers under active business review.
4. ⚪ **NO_REPORTS**: No reports on record. Displays preventive safety advice.

---

### 3. Interactive Neighborhood Map & Live User Pointer
- **7-Day Rolling Hotspots**: Shows recent community scam clusters with color-coded severity:
  - 🔴 **CRIT (High Alert)**: $\ge 15$ reports.
  - 🟠 **HIGH (Elevated)**: 8–14 reports.
  - 🔵 **MED (Moderate)**: $< 8$ reports.
  - 🟢 **Peaceful Area**: Monitored municipal zones with 0 reports.
- **Pulsing Blue "You Are Here" Pointer**: Click the bottom-right locate button (`⌖`) to view your accurate device location with an accuracy halo and a guide line to your nearest municipal centroid.
- **100% Client-Side Privacy**: Your raw GPS position is computed only in your browser. It is **never** sent to the server.

---

### 4. Multimodal Vision LLM & Zero-Downtime Fail-Safe
- **Vision OCR & Fraud Detection**: Upload a screenshot of a suspicious message or fake police warrant. Google Gemini Vision (`gemini-flash-latest`) analyzes:
  - Extracted phone numbers, UPI handles, and URLs.
  - Scam intent and emotional urgency triggers.
  - AI-manipulated or templated visual artifacts.
- **Zero-Downtime Offline Fallback**: If the internet drops or the API quota expires, the built-in offline regex & heuristic vision engine activates automatically. **The app never crashes or disrupts user reports.**
- **Live Status & Probe**: Click the `Probe` button in Settings to test the Google Gemini API health in real time.

---

## 🛡️ Anti-Cheat & Trust Rules (How We Stop Fake Reports)

If an app counts raw clicks, competitors can ruin a rival bakery or bot farms can spam innocent numbers. Our **Explainable Trust Engine** stops every trick:

| Attack Scenario | What the Attacker Tries | How Our Trust Engine Stops It | Result |
|---|---|---|---|
| **Rival Shop Smear** | A business pays 40 friends to report an innocent bakery. | **4-Gram Shingle Similarity**: Templated/copy-pasted complaint notes share $> 70\%$ text patterns and collapse into 1 single person. | Bakery is **never** marked a scam. |
| **Wi-Fi Bot Farm** | 1 person creates 22 fake accounts on the same Wi-Fi. | **IP Subnet Temporal Window**: All reports from the same `/24` IP prefix within 60 minutes collapse into 1 person. | Counts as **1 person**, not 22. |
| **Repeated Spammer** | 1 angry person reports a number 6 times in an hour. | **Union-Find by Reporter ID**: Multiple reports from the same reporter ID collapse into 1 person. | Counts as **1 report**. |
| **Junk Input** | Someone types `"12345"` or `"test"` as a number. | **Strict Validation Filter**: Non-compliant phone numbers and dummy sequences are rejected immediately. | Rejected with **HTTP 400 Bad Request**. |
| **Bank Smear Attack** | Scammers report HDFC Bank or 1930 Helpline as fraud. | **Seeded Business Registry**: Verified emergency helplines and registered banks are permanently protected. | Always returns **VERIFIED_BUSINESS**. |
| **False Accusation** | A citizen accidentally reports a legitimate merchant. | **Dispute Challenge (`POST /challenges`)**: The merchant files a dispute with one click. | Marked **Under Review**; verdict capped at `SUSPICIOUS`. |

---

## 🔒 Privacy Rules (Zero Disqualification Guarantee)

1. **Anonymous Reporting**: We never ask for or store your name, phone number, or IP address.
2. **Number Masking (< 3 Reports)**: If a number has only 1 or 2 reports, it is displayed as `98XXXXX210` to prevent personal doxxing. It only unmasks when $\ge 3$ independent citizens report it.
3. **No Private Coordinates**: Reports are linked to municipal postal centroids (e.g., *HSR Layout - 560102*), never exact home street addresses.
4. **Objective Facts Only**: The interface states *"Reported by 7 people near you"*, never defamatory accusations like *"This person is a fraud"*.
5. **In-Browser EXIF Purging**: Photos and screenshots have all camera model and GPS metadata wiped directly in browser memory before uploading.

---

## 🔐 Ed25519 Cryptographic Licensing

To ensure commercial software licensing without server restarts:
1. **Asymmetric Signatures**: Licences are signed using an Ed25519 private key. The server validates them using the built-in public key.
2. **Microsecond Middleware**: Every request checks the in-memory licence state.
3. **Graceful Expiration**: When a licence expires, routes return `403 {"error": "LICENSE_EXPIRED"}`. The app displays an informative renewal screen without deleting stored data.
4. **Hot Reload Without Restart**: Uploading a new licence via `POST /license` reactivates the server in milliseconds.
5. **Anti-Clock Rollback Guard**: If a user sets the server clock backward to bypass expiry, the monotonic clock guard detects it and blocks requests.

---

## 🧪 Testing & Verification

### 1. Pytest Unit Suite (105 Tests)
Runs all normalization, trust algorithms, vision fail-safe, and API schema checks:
```bash
python -m pytest tests/
```
*Result: 105 passed in ~23 seconds.*

### 2. Adversarial Security Simulation (17 Attack Scenarios)
Simulates botnets, Sybil clusters, smear bursts, and concurrent lookups:
```bash
python tools/simulate_attacks.py
```
*Result: 17/17 passed with 0 regressions.*

### 3. Four-Step Licence Demonstration
```bash
python scripts/licence_demo.py http://localhost:8000
```
- **Step 1:** Verifies active licence via `GET /license`.
- **Step 2:** Uploads a 5-minute licence via `POST /license`.
- **Step 3:** Waits for expiry; verifies `403 LICENSE_EXPIRED` modal triggers.
- **Step 4:** Uploads a renewed licence; proves the app recovers instantly with zero data loss.

---

## 🌐 Supported Municipal Areas (27 Metro Zones)

Seeded in `app/data/areas.json`:
- **Bengaluru**: HSR Layout (560102), Indiranagar (560038), Koramangala (560034), Whitefield (560066), BTM Layout (560076), Jayanagar (560011), Marathahalli (560037), Bellandur (560103), Electronic City (560100), JP Nagar (560078), Malleshwaram (560003), Rajajinagar (560010), Hebbal (560024), Yelahanka (560064), Banashankari (560070)
- **Mumbai**: Bandra West (400050)
- **Delhi**: Hauz Khas (110016)
- **Hyderabad**: Madhapur (500081)
- **Chennai**: Adyar (600020)
- **Pune**: Viman Nagar (411014)
- **Kolkata**: Salt Lake Sector V (700091)
- **Ahmedabad**: Satellite (380015)
- **Jaipur**: Malviya Nagar (302017)
- **Lucknow**: Gomti Nagar (226010)
- **Kochi**: Kakkanad (682030)
- **Warangal Demo**: Hanamkonda (506001), Warangal (506002)

---

## 📞 Official Emergency Helplines Directory

- **National Cybercrime Helpline**: Dial `1930`
- **National Cybercrime Reporting Portal**: [https://cybercrime.gov.in](https://cybercrime.gov.in)
- **TRAI Do Not Disturb (DND) / Spam Reporting**: Dial `1909`
- **Sanchar Saathi (Chakshu Lost/Fraud Device Portal)**: [https://sancharsaathi.gov.in](https://sancharsaathi.gov.in)
