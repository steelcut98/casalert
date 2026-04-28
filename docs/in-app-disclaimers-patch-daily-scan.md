# in-app-disclaimers.md — Daily Scan Policy Patch

**Purpose:** Add daily scan policy language to specific sections of `in-app-disclaimers.md`. This is an additive patch — do NOT replace the whole file, just add/modify the sections below.

**Date:** April 27, 2026

---

## Patch 1 — New Section 18 (add at end of document, before "END OF REFERENCE DOCUMENT")

Add this new section as **Section 18 — Daily Scan Policy** before the END marker:

```markdown
## 18. Daily Scan Policy

CasAlerts officially scans publicly available city violation data ONCE PER DAY. This is a deliberate product decision (see Master Playbook §5). The following copy must appear in the locations specified.

### 18.1 Compliance Score Tooltip — UPDATED COPY

**Where:** `i` button next to compliance score grade in PropertyDetailClient.tsx

**Replace existing tooltip text with:**
```
CasAlerts Compliance Score is an informational indicator generated from public city data, refreshed once daily. Not legal or financial advice. Always refer to official violation notices for binding deadlines.
```

### 18.2 Email Alert Footer — ADDITION

**Where:** Footer of every email alert sent via Resend (`lib/email-alerts.ts`)

**Add this line to existing legal footer:**
```
This alert is based on public city data refreshed once daily; there may be a delay between when a violation is filed and when CasAlerts detects it.
```

Place it before "Refer to your official notice" line.

### 18.3 SMS Alert — ADDITION (only if character budget allows)

**Where:** New violation SMS template

**Optional addition to existing SMS:**
```
Daily scan; check official notice for binding deadlines.
```

If standard 160-char SMS exceeds limits, prioritize: core info + STOP language + URL. Drop the daily scan note.

### 18.4 Privacy Policy — Already Captured

The Privacy Policy v2 (Section 6 — Automated decision-making) already states:
> "outputs are generated algorithmically from third-party data... updated daily"

No additional changes needed in Privacy Policy.

### 18.5 Terms of Service — Already Captured

The ToS v2 (Section 4 — Data accuracy and informational-only disclaimer) implicitly covers data refresh cadence. Optionally add to Section 4.4:
> "Violation data is sourced from publicly available Chicago Building Violations (Socrata) and Philadelphia Licenses and Inspections (Carto) datasets, refreshed once daily."

### 18.6 Risk Briefing Disclaimer — ADDITION

**Where:** Top of Risk Briefing section in PropertyDetailClient.tsx

**Update existing disclaimer to:**
```
⚠ This briefing is automatically generated from public data refreshed once daily and is informational only. It is not a substitute for professional inspection, legal advice, or an official city communication.
```

### 18.7 Property Info Modal — ADDITION

**Where:** Bottom of Property Info popup

**Update existing source line to:**
```
Source: Public property records (Cook County Assessor / Philadelphia OPA), refreshed once daily. Data may contain errors or be out of date. Not a substitute for a survey, appraisal, or title report.
```

### 18.8 Pricing Page — ADDITION

**Where:** FAQ or feature comparison on `/pricing`

**Add to FAQ:**
```
Q: How often does CasAlerts scan my properties?
A: CasAlerts scans publicly available city data once per day. This matches how Chicago and Philadelphia publish their violation data — most updates appear in nightly batches. You can also manually refresh any property at any time using the "Refresh data" button on the property detail page.
```

### 18.9 Onboarding Result Page — ADDITION

**Where:** After baseline scan completes, in the success summary

**Add line:**
```
✓ This property is now monitored. CasAlerts will check for new violations once daily.
```

### 18.10 Settings Page — ADDITION

**Where:** Notifications section, near alert toggles

**Add helper text:**
```
CasAlerts scans for new violations once daily. Alerts are sent within 24 hours of a violation appearing in city data.
```
```

---

## Patch 2 — Update Section 4.1 (Compliance Score Info Tooltip)

Find the existing 4.1 section in `in-app-disclaimers.md` and replace the **Revised copy** block with this stronger version:

**Existing:**
```
CasAlerts Compliance Score is an informational indicator, not legal or financial advice. It reflects publicly available data, which may contain delays or errors. Always refer to official violation notices for binding deadlines and requirements.
```

**Replace with:**
```
CasAlerts Compliance Score is an informational indicator generated from public city data, refreshed once daily. Not legal or financial advice. Data may contain delays or errors. Always refer to official violation notices for binding deadlines and requirements.
```

The single-word change ("once daily") aligns with the new policy.

---

## Patch 3 — Update Section 4.2 (Risk Briefing Disclaimer)

Find Section 4.2 and update with the same daily-scan addition shown in Patch 1, item 18.6 above.

---

## Patch 4 — Update Section 4.3 (Property Info Modal Disclaimer)

Find Section 4.3 and update with the daily-scan addition shown in Patch 1, item 18.7 above.

---

## Patch 5 — Update Section 6.1 (Email Footer on every outbound email)

Find Section 6.1. The existing footer reads:

```
This is not legal advice. CasAlerts aggregates publicly available violation data — always refer to your official notice from the city for binding deadlines and obligations. Data may be delayed or contain errors.
```

**Replace with:**
```
This is not legal advice. CasAlerts aggregates publicly available violation data, refreshed once per day — always refer to your official notice from the city for binding deadlines and obligations. Data may be delayed or contain errors.
```

---

## Patch 6 — Update Section 6.2 (New-violation alert email inline disclaimer)

Find Section 6.2. The existing copy reads:

```
ℹ This alert is based on public city data that may be delayed or contain errors. Refer to your official notice for binding deadlines.
```

**Replace with:**
```
ℹ This alert is based on public city data, scanned once per day. There may be a delay between filing and detection. Refer to your official notice for binding deadlines.
```

---

## Patch 7 — Add new Section 16.1 to Database Migrations

Find Section 14 (Database Migrations Needed for Disclaimer Tracking) and add at the end:

```sql
-- Daily scan policy disclosure timestamp (for compliance documentation)
-- Optional: track that the user has been informed of daily scan cadence
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_scan_disclosure_shown_at TIMESTAMPTZ;
```

This is optional — only needed if you want to track that the user saw the daily-scan disclosure in onboarding. Most apps don't track this granularly.

---

## Summary of changes

The daily-scan policy now appears in **9 user-facing surfaces**:

1. ✅ Compliance score tooltip (existing — copy update)
2. ✅ Risk briefing disclaimer (existing — copy update)
3. ✅ Property info modal (existing — copy update)
4. ✅ Email alert footer (existing — copy update)
5. ✅ Email new-violation inline disclaimer (existing — copy update)
6. ✅ Privacy Policy Section 6 (already covers it)
7. ✅ ToS Section 4.4 (optional addition)
8. ✅ Pricing page FAQ (new — to add when pricing page reviewed in Phase 2)
9. ✅ Onboarding result page (new — to add in Phase 1B/2)
10. ✅ Settings page notification helper text (new — to add in Phase 4)

This creates redundant, consistent disclosure of the daily-scan cadence across the entire user journey. Defensible legally and clear to users.

---

**End of patch document.**

When integrating in Phase 2.5d (after SeedLegals review), apply these patches to the working copy of `in-app-disclaimers.md` before sending the final wired-up versions to the lawyer for sign-off.
