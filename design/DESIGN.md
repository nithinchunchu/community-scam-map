# Community Scam Map — Product Design Specification

## 1. Design Goals

1. **Panic-Proof 60-Second Reporting**: Victims who have just experienced an extortion or scam call must be able to report in under 60 seconds with zero login or password friction.
2. **Dual-Language & Icon-First Accessibility**: Fully usable in English, Hindi (हिन्दी), or purely by non-literate users through visual icons alone.
3. **Calm & Trustworthy Aesthetic**: Deep navy and emerald/teal tones, soft off-white canvas, clean rounded surfaces. Language is objective and helpful ("Reported by 7 people near you"), never accusatory ("scammer", "fraudster").
4. **Mobile-First Android Optimization**: Standard 390 × 844 px viewport, minimum 48 px touch targets, high contrast (WCAG AA), accessible for low-cost Android hardware on cellular networks.

---

## 2. Design System Tokens

### Colors
- **Base Brand**:
  - Deep Navy (`#0B192C`): Primary app bars, hero elements, dark contrast.
  - Slate Navy (`#1E3E62`): Secondary elements and active states.
  - Emerald Teal (`#008170`): Trust accents and primary action highlights.
- **Backgrounds**:
  - Off-white Canvas (`#F8FAFC`): Soft, glare-free background.
  - Surface Card (`#FFFFFF`): Elevated content cards.
  - Subtle Surface (`#F1F5F9`): Inset containers and chip backgrounds.
- **Text & Typography**:
  - Primary (`#0F172A`): High contrast readability.
  - Secondary (`#475569`): Labels, timestamps, and captions.
  - Muted (`#94A3B8`): Placeholder text and borders.
- **Fixed Verdict Signage (Dual Coding: Color + Lucide Icon)**:
  - **KNOWN_SCAM**: Crimson (`#DC2626` / `#991B1B`), Background (`#FEF2F2`), Icon `shield-alert`.
  - **SUSPICIOUS**: Amber (`#D97706` / `#92400E`), Background (`#FFFBEB`), Icon `eye`.
  - **NO_REPORTS**: Blue-Grey (`#64748B` / `#334155`), Background (`#F8FAFC`), Icon `search`.
  - **VERIFIED_BUSINESS**: Green (`#16A34A` / `#166534`), Background (`#F0FDF4`), Icon `badge-check`.

### Typography Ramp
- **Fonts**: `Inter` for Latin characters; `'Noto Sans Devanagari'` for Hindi script.
- **Sizes**:
  - `Display / H1`: 24px (Bold, 32px line-height)
  - `H2`: 20px (SemiBold, 28px line-height)
  - `H3`: 18px (SemiBold, 24px line-height)
  - `Body / Button`: 16px (Regular / Medium, 24px line-height)
  - `Small / Chips`: 14px (Medium, 20px line-height)
  - `Caption`: 12px (Regular, 16px line-height)

### Spacing & Layout
- **8-point Grid**: Spacing tokens at 4px, 8px, 16px, 24px, 32px, 48px.
- **Touch Target Minimum**: 48 × 48 px for all interactive buttons, tiles, and chips.
- **Border Radii**: 12px (Input & Chips), 16px (Cards), 24px (Modal Sheets), Full/Pill (Action Badges).

---

## 3. Screen Specifications

### 1. Home (`/`)
- **Header**: App Logo + Wordmark, language toggle (`English / हिन्दी`), and quick helpline badge (`1930`).
- **Live Local Alerts Banner**: Visible if saved area has active alerts (e.g., *"HSR Layout: Scam reports near you doubled today"* with warning badge).
- **Primary Search & Lookup Bar**: Large paste-ready input with instant client-side auto-detection badge (`Phone`, `UPI`, `Link`, `SMS Sender`).
- **Call-to-Action Buttons**:
  - Primary: `Check Status / स्थिति जांचें` (Teal full-width button).
  - Secondary: `Report a Scam / फ्रॉड रिपोर्ट करें` (Navy full-width button with shield icon).
- **Recent Scam Trends Carousel**: Cards showing recent verified alert patterns in the community.

### 2. Fast Report Screen (`/report`)
Target: Completed in under 60 seconds with 5 taps or fewer.
- **Step 1 — Communication Channel**:
  6 large icon cards (Phone call, SMS or WhatsApp, QR code, Fake website, UPI request, Something else) with bilingual labels.
- **Step 2 — Incident Time**:
  Horizontal pill selector: `Just now / अभी`, `Today / आज`, `Yesterday / कल`, `Pick date / तारीख चुनें`.
- **Step 3 — Identifier Value**:
  Autofocus paste box that auto-formats input and previews canonical format (+91 98765 43210).
- **Step 4 — Scam Type (Optional)**:
  Chips with icons (Digital arrest, Fake KYC, UPI QR, Investment group, Courier customs, Job offer, etc.; default "Not sure / पता नहीं").
- **Step 5 — Area & Note**:
  Area picker remembered from previous report; optional one-line note input.
- **Sticky Bottom Action**:
  Primary `Submit Report / रिपोर्ट दर्ज करें` button (48px height, high-contrast). Includes invisible telemetry timer to measure < 60s completion.

### 3. Result Screen (`/lookup`)
Displays exact legal and community status with no accusatory language:
- **Verdict Card**: Large icon, colored banner, and verdict title (`KNOWN_SCAM`, `SUSPICIOUS`, `NO_REPORTS`, `VERIFIED_BUSINESS`).
- **Masking Badge**: Displays masked identifier (e.g. `98XXXXX210`) if distinct reporters < 3; displays unmasked only when verified by $\ge 3$ persons.
- **Community Evidence**: "Reported by 7 people near you" (or "Reported by 7 people"), with timeline (first seen, last seen) and channel history.
- **Safety Protocol**: Specific defense instructions based on the identified scam type.
- **Direct Escalation**: Direct call button for National Cybercrime Helpline `1930` and link to `cybercrime.gov.in`.
- **Secondary Actions**: "This is my business" (opens Dispute `/dispute`) and "Report this number too".

### 4. Community Scam Map (`/map`)
- **Area Summary Heat List**: 7-day report counts per locality with severity badges (`CRIT` $\ge 15$, `HIGH` $8-14$, `MED` $< 8$).
- **Interactive Map**: Lazy-loaded Leaflet map displaying non-identifying area circles placed strictly at official postal centroids.

### 5. Alerts Center (`/alerts`)
- Shows active community warning cards:
  - `SPIKE`: Reports surged beyond 2x normal baseline in the last 24h.
  - `NEW_TYPE`: A new scam MO (e.g., sextortion, digital arrest) surfaced in the neighborhood.

### 6. Business Dispute Form (`/dispute`)
- Allows legitimate store owners and companies to contest reports by submitting company name, contact email, and license/GST proof note.
- Immediate feedback: caps lookup status under review.

### 7. Licence Expired Guard (Full Screen)
- Full-screen modal triggered automatically when server returns HTTP 403 `LICENSE_EXPIRED`.
- Displays friendly bilingual message: *"Licence expired. Contact your provider / लाइसेंस समाप्त हो गया है। अपने प्रदाता से संपर्क करें।"*
- Background polling every 15s automatically restores the application once renewed without requiring a page refresh.
