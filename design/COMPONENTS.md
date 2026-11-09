# Community Scam Map — UI Component Library Specification

This document details the core UI components, variants, accessibility attributes, and interactive states used across the mobile PWA.

---

## 1. Action Components

### `Button`
- **Variants**:
  - `primary`: Navy background (`#0B192C`), white text. Used for main progression actions (e.g. "Submit Report").
  - `accent`: Emerald teal background (`#008170`), white text. Used for positive affirmation (e.g. "Check Status").
  - `secondary`: Slate background (`#F1F5F9`), dark text (`#0F172A`).
  - `outline`: 1.5px border (`#CBD5E1`), transparent background.
  - `danger`: Red outline/background for critical emergency actions.
- **States**:
  - `Default`: Standard elevation, 48px height minimum.
  - `Hover/Active`: Scale down 0.98, opacity 0.92.
  - `Focus`: 3px outline (`#0284C7`), offset 2px.
  - `Disabled`: Opacity 0.45, cursor not-allowed.
  - `Loading`: Displays inline circular spinner and locks interaction.

### `ChannelTile`
- **Visual**: 2-column or 3-column grid of square/rectangular tiles (minimum 64 × 64 px).
- **Contents**: Top Lucide icon (28px), bottom bilingual label (English + Hindi).
- **States**:
  - `Unselected`: White background, border `#E2E8F0`, grey icon `#475569`.
  - `Selected`: Navy or Teal tint (`#F0FDF4` / `#EFF6FF`), border `#008170` (2px), active checkmark badge.
  - `Focus-Visible`: 2px blue ring.

### `TimeChip` & `ScamTypeChip`
- **Visual**: Pill-shaped horizontal chips (minimum 40px height).
- **States**:
  - `Default`: Inset background (`#F1F5F9`), text `#475569`.
  - `Selected`: Dark background (`#0B192C`), white text, bold font.

---

## 2. Information & Verdict Components

### `VerdictCard`
The central visual anchor of the Lookup result screen. Always features dual-coding (color + icon).
- **Variants**:
  - `KNOWN_SCAM`:
    - Border: `#F87171` (Crimson)
    - Background: `#FEF2F2`
    - Icon: `ShieldAlert` (Crimson `#DC2626`)
    - Title: "Known Scam / ज्ञात फ्रॉड"
  - `SUSPICIOUS`:
    - Border: `#FBBF24` (Amber)
    - Background: `#FFFBEB`
    - Icon: `Eye` (Amber `#D97706`)
    - Title: "Suspicious / संदिग्ध"
  - `NO_REPORTS`:
    - Border: `#CBD5E1` (Neutral slate)
    - Background: `#F8FAFC`
    - Icon: `Search` (Slate `#64748B`)
    - Title: "No Reports Yet / अभी कोई रिपोर्ट नहीं"
    - Subtitle: "This does not guarantee it is safe / यह सुरक्षित होने की गारंटी नहीं है"
  - `VERIFIED_BUSINESS`:
    - Border: `#4ADE80` (Green)
    - Background: `#F0FDF4`
    - Icon: `BadgeCheck` (Green `#16A34A`)
    - Title: "Verified Business / सत्यापित संस्थान"

### `MaskedIdentifierDisplay`
- Large monospaced typography (22px).
- Renders `98XXXXX210` or full number with copy button and distinct reporters counter badge.

### `AlertBanner`
- Dismissible or persistent warning card displayed at the top of the Home view.
- Accompanied by `AlertTriangle` icon and bold headline ("HSR Layout: Scam reports near you doubled today").

---

## 3. Feedback & Modal Screens

### `LicenceExpiredOverlay`
- **Role**: Blocks interactions when server replies HTTP 403 `{"error": "LICENSE_EXPIRED"}`.
- **Visual**: Centered lock icon, clear bilingual text, and auto-refresh progress indicator ("Checking for renewed licence...").
- **Behavior**: Polls `GET /license` every 15 seconds; clears overlay immediately when valid.

### `DisputeModal`
- Clean bottom sheet containing business owner verification fields and document attachment proof note.

### `LanguageSwitcher`
- Dual pill toggle: `[ English | हिन्दी ]`. Persists choice in `localStorage`.
