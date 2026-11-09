# Community Scam Map — 3-Minute Demo Script & Pitch

---

## 3-Minute Video Demo Script (With Timestamps)

### [0:00 - 0:30] Act 1: The Problem — The Story of Ravi & Priya
- **Visual**: Show incoming fake courier / digital arrest SMS on a phone.
- **Narrator**:
  > *"Every morning across India, over 50,000 citizens like Priya and Ravi receive threatening calls or fake bank links. Priya got a WhatsApp video call from someone in a fake police uniform claiming she had contraband parcels in Mumbai customs and demanding an immediate ₹25,000 bail transfer.*
  >
  > *Panicked, Priya checks Truecaller — it shows 'No Name' or 'Delivery Agent'. She hesitates, pays, and loses her savings.*
  >
  > *Why? Because traditional apps rely on centralized caller ID that scammers easily spoof, and government cybercrime reporting portals require lengthy OTP logins, aadhaar IDs, and complex forms that take 20 minutes to submit when victims have only seconds to decide.*
  >
  > *Meet **Community Scam Map** — zero login, 45-second neighborhood-verified fraud intelligence that stops scam runs before they spread."*

---

### [0:30 - 1:15] Act 2: The 45-Second Report (Hindi + Live Stopwatch)
- **Visual**: Screen switches to phone frame (390×844) showing the Hindi UI. A live countdown stopwatch runs in the top right corner.
- **Action**:
  1. User taps the big red **"फ्रॉड रिपोर्ट करें"** (Report Scam) button.
  2. **Step 1 (Channel)**: Taps the **Phone call** tile (with icon).
  3. **Step 2 (Time)**: Taps **"आज"** (Today).
  4. **Step 3 (Identifier)**: Pastes `+91 98765 43210`. The client-side auto-detector instantly highlights **"फोन नंबर"** (Phone Number).
  5. **Step 4 (Type)**: Taps **"डिजिटल अरेस्ट"** (Digital Arrest).
  6. **Step 5 (Area)**: Selects **"560102 — HSR Layout"** (auto-remembered). Enters ₹25,000 lost.
  7. Taps **"रिपोर्ट दर्ज करें"** (Submit Report).
- **Stopwatch stops at**: **38 seconds**!
- **Narrator**:
  > *"Zero passwords, zero OTP, zero GPS tracking. In under 40 seconds, completely in Hindi using intuitive visual icons, the report is securely registered. The user's note is never stored as text — it is converted into an irreversible mathematical shingle digest right inside the privacy engine."*

---

### [1:15 - 1:45] Act 3: Lookup & Privacy Masking
- **Visual**: Navigate to Search / Home. Paste `9876543210`.
- **Narrator**:
  > *"Now Ravi receives a call from that same number. He opens the app and pastes it. Look at the result screen:*
  > - *If only 1 or 2 neighbors have reported it, the number is strictly masked as `98XXXXX210` to prevent doxxing or personal smear campaigns.*
  > - *Objective community wording: **'Reported by 7 people near you'** — notice we never use defamatory labels like 'scammer' or 'criminal'.*
  > - *Instant actionable guidance: 'Hang up immediately. Police never conduct trials over video call.' with direct one-tap links to the 1930 National Cyber Helpline and cybercrime.gov.in."*

---

### [1:45 - 2:15] Act 4: Adversarial Defense — Bakery Attack vs Real Campaign
- **Visual**: Show the terminal / admin test runner showing the attack comparison.
- **Narrator**:
  > *"Can competitors report-bomb an innocent local business? We tested this!*
  >
  > *In Attack Scenario 1, a bot ring files 40 reports against 'Fresh Bakes Indiranagar' using copy-pasted notes and 40 different accounts in 10 minutes.*
  > - *Our Union-Find engine clusters the identical notes via 4-gram Jaccard shingles ($\ge 0.7$) and identical subnets into just ONE person.*
  > - *The coordination gate detects the unnatural burst and collapses the entire wave.*
  > - *Verdict: NEVER Known Scam. The innocent business is protected.*
  >
  > *Meanwhile, in Attack Scenario 6, when 7 distinct residents across different subnets write genuine reports in English, Hindi, and Hinglish, their diversity easily crosses the mathematical threshold ($\ge 2.5$), correctly flagging the syndicate as a **KNOWN SCAM**."*

---

### [2:15 - 2:40] Act 5: Real-Time Heat Map & Neighborhood Surge Alerts
- **Visual**: Tap **"Map"** tab. Shows the 7-day interactive Leaflet map and active alerts.
- **Narrator**:
  > *"Look at the Neighborhood Heat Map:*
  > - *Areas are summarized over 7-day rolling windows with severity ratings: Critical, High, and Moderate.*
  > - *Notice HSR Layout has a **SURGE ALERT**: reports doubled today compared to last week.*
  > - *Notice Whitefield has a **NEW SCAM TYPE** badge: the first sextortion wave detected in this pincode in 30 days.*
  > - *No precise home GPS coordinates are ever tracked — only municipal centroids for the 27 verified pincodes."*

---

### [2:40 - 3:00] Act 6: Licence Engine & Self-Healing Architecture
- **Visual**: Navigate to `/admin`. Show live Ed25519 licence countdown timer.
- **Narrator**:
  > *"Enterprise licensing is powered by military-grade Ed25519 asymmetric cryptography.*
  > - *When the 5-minute licence expires, all protected APIs instantly return 403 `LICENSE_EXPIRED`, displaying the full-screen lock.*
  > - *The frontend background worker auto-polls `/license` every 15 seconds.*
  > - *As soon as the judge uploads a renewed licence, the system hot-reloads in memory without a restart, with 100% of community reports intact!*
  >
  > *Community Scam Map: Privacy-first, tamper-proof, neighborhood-verified fraud defense for 1.4 billion citizens."*

---

## 60-Second Elevator Pitch

> *"Financial cyber fraud in India is exploding — over ₹10,000 crores lost this year alone through digital arrests, fake KYC APKs, and UPI refund traps. Victims lose money in the first 5 minutes because they have no fast way to check caller numbers without registering on bloated, privacy-invasive apps.*
>
> *We built **Community Scam Map**: the fastest, most privacy-conscious fraud defense network in India.*
> - *Under 45 seconds to report — zero logins, zero passwords, 100% anonymous.*
> - *Usable by anyone: full Hindi localization and icon-guided tiles.*
> - *Zero doxxing: personal numbers remain masked until verified by 3 independent neighbors.*
> - *Bulletproof trust: an explainable Union-Find and shingling engine that stops report-bombing bots while instantly verifying genuine scam campaigns.*
> - *And an Ed25519 enterprise licence guard with automatic clock-rollback detection.*
>
> *Real protection, verified by your community, delivered in seconds."*

---

## Top 10 Likely Judge Questions & Direct Technical Answers

### Q1: "How do you prevent a malicious group of 50 people from falsely labeling an innocent shopkeeper as a Known Scam?"
**Answer**: Three interlocking layers prevent this:
1. **Coordination Gate**: If 5 or more reports arrive within 60 minutes with low IP diversity ($\frac{\text{unique IPs}}{\text{persons}} < 0.5$) or low text dissimilarity ($< 0.4$), the entire wave collapses into 1 single person.
2. **4-Gram Shingle Similarity**: If the smear campaign uses scripted or templated notes, Jaccard similarity ($\ge 0.7$) groups them into 1 person.
3. **Dispute Mechanism (`POST /challenges`)**: Any business can file a challenge with their GST/licence proof, which instantly marks the number as under review and caps its verdict at `SUSPICIOUS`, making it mathematically impossible to show as `KNOWN_SCAM`.

### Q2: "Why don't you store the reporter's user note as plain text?"
**Answer**: Privacy and liability. Storing raw notes risks storing PII, defamatory accusations, or sensitive bank details. Instead, our backend converts the note into two irreversible mathematical features:
1. `note_length` and `empty` boolean (for quality scoring).
2. A list of 64-bit integer hashes representing 4-gram character shingles (for Jaccard bot-detection).
The raw text is discarded immediately in memory.

### Q3: "What stops attackers from spoofing their IP address with a VPN?"
**Answer**: Attackers using VPNs still fail because our trust score requires **both** distinct reporters and distinct note entropy. Even with 50 rotating VPN IPs, identical or similar complaints collapse via the Shingle gate. Furthermore, VPN IP ranges fall into concentrated subnet blocks, failing the IP entropy threshold ($\ge 0.5$).

### Q4: "How does the Ed25519 licence check work, and where is the private key?"
**Answer**: The private key is strictly kept outside the repository in `~/.scammap/scammap_ed25519.key` and is never committed to Git. The backend embeds only the base64 public key. Licences are canonical sorted JSON strings (`{"expires_at": ..., "licensee": ...}`) signed with Ed25519 via PyNaCl. The middleware verifies this signature in microseconds on every request using an in-memory cache.

### Q5: "What happens if someone rolls back their system clock to keep an expired licence active?"
**Answer**: Our database persists `max_seen_time` in the `server_state` table. If the server evaluates a timestamp and finds `now < max_seen_time - 120 seconds`, the clock rollback guard triggers, immediately refusing all service with `status: "expired", reason: "clock_tampered"`.

### Q6: "Why is the p95 lookup latency so fast (< 50 ms)?"
**Answer**: We optimized `evaluate_identifier` through:
1. Indexed database queries on `case_id` (`reports_case_idx`) and `occurred_at`.
2. In-memory caching of the 27 verified seed identifiers and active dispute challenges.
3. Early exits: If an identifier has 0 reports, it returns `NO_REPORTS` in $< 5\text{ ms}$ without running Union-Find.
4. Per-request reputation memoization avoiding repeated database lookups for the same reporter.

### Q7: "Why did you choose 27 specific postal pincodes instead of GPS?"
**Answer**: By design for citizen safety. GPS coordinates pinpoint an individual's exact home or office desk, allowing malicious actors to infer victim identities. 27 municipal pincodes across major Indian metros (Bengaluru, Mumbai, Delhi, Hyderabad, Chennai, Kolkata, Warangal, etc.) provide meaningful neighborhood granularity without compromising individual privacy.

### Q8: "How does the app work offline?"
**Answer**: The PWA service worker caches all static assets (HTML, CSS, JS bundles, Devanagari fonts, icons). In addition, `localStorage` caches the last lookup result and the latest 7-day map clusters. If offline, the app displays a prominent amber banner (*"You are offline. Showing cached information."*) and allows victims to review cached safety advice.

### Q9: "Why does the result screen say 'Reported by 7 people near you' instead of '7 scams'?"
**Answer**: Legal and ethical neutrality. Under Indian law and community guidelines, labeling an unconvicted citizen as a "scammer" or "fraudster" exposes the platform and users to defamation claims. By stating the objective empirical fact — *"Reported by 7 people near you"* — we maintain 100% legal compliance and calm, non-judgmental communication.

### Q10: "What happens if Render puts the free container to sleep during judge testing?"
**Answer**: Free containers sleep after 15 minutes of inactivity, causing a 45-second cold start on the next request. We mitigated this by setting up a 5-minute automated uptime pinger on `GET /health`. Because `/health` returns `{"ok": true}` in 3 ms without database overhead, it keeps the instance hot 24/7 without consuming monthly quota.
