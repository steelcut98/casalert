# CasAlerts · Master Playbook

**Single source of truth for pre-launch execution, scaling decisions, and engineering history.**

Last updated: April 27, 2026
Status: PRE-LAUNCH · feature complete · gating + audit shipped · brand rollout in progress · legal in draft · secret rotation pending

---

## Table of Contents

1. [Status snapshot](#1-status-snapshot)
2. [Pre-launch execution order](#2-pre-launch-execution-order)
3. [Pre-launch scaling work](#3-pre-launch-scaling-work-13-items)
4. [Post-launch scaling roadmap](#4-post-launch-scaling-roadmap)
5. [Daily scan policy (locked decision)](#5-daily-scan-policy-locked-decision)
6. [Competitive landscape](#6-competitive-landscape)
7. [Key decisions log](#7-key-decisions-log)
8. [Critical never-forget rules](#8-critical-never-forget-rules)
9. [Document index](#9-document-index)

---

## 1. Status snapshot

### What's shipped (production at casalerts.com)

#### Core product (verified working)
- Daily CRON scan at `/api/cron/scan-violations` (Vercel CRON 8am UTC, `maxDuration=60`)
- Chicago + Philadelphia violation fetching (Socrata + Carto)
- New violation detection AND status-change detection (OPEN → COMPLIANT)
- Email alerts via Resend (`alerts@casalerts.com`, branded, inbox-confirmed)
- SMS alerts via Twilio (upgraded from trial, $20 balance)
- Property enrichment from Cook County Assessor + Philadelphia OPA
- Geographic data (lat/lng, parcel_id, zip_code) saved on enrichment
- Severity classification on every violation (551 classified: 284 moderate / 99 high / 87 critical / 67 administrative / 14 low)
- 8-factor compliance score (0-100, A-F grade) with daily snapshots → `compliance_score_history`
- Risk briefing (keyword-based)
- Magic link auth via Supabase (branded emails)
- RLS verified across all user-scoped tables (User A gets 404 on User B's property)

#### Recent shipped features (this build session)
- **Starter tier gating** — free users see locked placeholders for compliance score, score breakdown, risk briefing, and history >6 months. Mark as Resolved stays free (data collection).
- **Property locking on plan downgrade** — `pinned_at` column, "Make active" button, locked properties skipped by CRON, portfolio stats only count active properties
- **3-step onboarding modal** — summary → quick questions → optional details. Contractor Yes/No question removed (low value without details, deferred to Month 2-3)
- **Property removal feedback questionnaire** — reason, sold date (conditional), NPS (Yes/Maybe/No), conditional "What could we do better?" textarea on No (verified live)
- **Edit property details with audit trail** — `property_edits_audit` table captures every field change (old value, new value, who, when). Verified working: 6 fields captured per test edit.
- **Compliance score info tooltip** — `i` icon next to grade badge, click outside to close. Currently shows OLD copy ("0-100 severity-weighted score..."); upgrade to liability-protective copy is queued for Phase 2.5d.

#### Data integrity (the moat)
21 data collection paths verified:
1. Severity classification — onboarding ✅ CRON ✅ rescan ✅
2. Zip codes — Philly properties ✅
3. Lat/lng — Chicago properties ✅
4. Parcel IDs — Chicago properties ✅
5. Geo data on re-enrich ✅
6. Geo data on onboarding ✅
7. `violation_external_id` in `violation_resolutions` ✅ (survives rescans)
8. Daily score snapshots ✅
9-15. Compliance events (onboarding, CRON, rescan, resolution, alerts, reminders, removal) ✅
16. Analytics events (9 dashboard + property detail actions) ✅
17. Settings change analytics ✅
18. Resolution form proprietary fields ✅ (`exact_cost`, `contractor_*`, `work_on_schedule`, `casalerts_alerted_first`, `deadline_met`, `is_recurring`)
19. Questionnaire 15-field match ✅
20. Address searches logged ✅
21. Violation status change detection ✅

### What's in progress

- **Walnut Brick brand rollout (Phase 1 of 4)** — design tokens, fonts, Logo component, favicons. Files generated and ready to apply against the actual `app/layout.tsx` (verified Tailwind v4, `body.light-theme` system). NOT YET APPLIED.
- **Legal documents** — drafted, awaiting SeedLegals review before integration

### What's queued (in order)

1. **Rotate all secrets** (use `docs/runbooks/rotate-secrets.md`) — required before Phase 5 launch
2. Walnut Phase 1 application + verification
3. Walnut Phases 2, 3, 4 (rollout in sequence, never merged)
4. Phase 2 design review (landing, login, dashboard, property detail, settings, pricing — light + dark)
5. Phase 3 mobile testing
6. Phase 4 functional testing (end-to-end SMS via CRON, all features as a real new user)
7. Phase 2.5d legal disclaimer integration (after SeedLegals returns drafts)
8. Pre-launch scaling subset (see §3)
9. Phase 5 cleanup + Stripe live + launch

### What's pending outside the codebase (founder actions)

- [ ] **Rotate all secrets** (use `docs/runbooks/rotate-secrets.md`) — clean slate before launch, ~25 min. Required because secrets may have been pasted into Claude chats during development. **DO BEFORE PHASE 5.**
- [ ] Register CasAlerts Ltd at Companies House (£12)
- [ ] Open business bank account (Tide or Starling)
- [ ] File US trademark on "CasAlerts" + logo (via LegalZoom or USPTO directly, ~$650)
- [ ] Send 4 legal docs + `in-app-disclaimers.md` to SeedLegals (£500-800, 5-10 day turnaround)
- [ ] Get insurance quotes (Superscript, Hiscox, Simply Business — combined PI £500k + Cyber £250k, expected £700-1,700/year)
- [ ] Set up email aliases: `support@`, `privacy@`, `legal@`, `security@`, `abuse@`
- [ ] Switch Stripe to live mode (requires UK Ltd + bank)
- [ ] SMS A2P 10DLC registration with Twilio (1-4 weeks approval)

---

## 2. Pre-launch execution order

This is the canonical step-by-step sequence. Do these in order. Never merge phases. Each phase has its own verification before moving to the next.

### Phase 1 — Walnut Brick brand rollout (multi-step)

**Goal:** Apply the locked design system without breaking existing UI.

| Step | Scope | Risk | Status |
|---|---|---|---|
| 1A | Design tokens + fonts + Logo component + favicons | Zero (additive) | Files ready, awaiting apply |
| 1B | Marketing/auth surfaces (landing, login, footer) — zinc → stone swap | Low | Pending |
| 1C | Dashboard shell (nav, portfolio bar, property cards) with Logo | Medium | Pending |
| 1D | Detail pages + resolution form + onboarding + settings — **REVENUE-CRITICAL** | High | Pending |

**After Phase 1D**, MANDATORY: end-to-end resolution form test with verification that all fields write to `violation_resolutions` (see §8 Critical rules).

### Phase 2 — Comprehensive design review

**Goal:** Catch inconsistencies, broken states, polish issues across every page before launch.

For each page, screenshot in BOTH light and dark mode. Identify and fix:
- Branding consistency (logo, name, footer)
- Color/spacing/typography aligned with Walnut design system
- Dark/light mode rendering (no broken contrasts)
- Clear primary CTA on each page
- Mobile-responsive layout (test at ~400px viewport)
- Missing footer on any page

Pages to review in order:
1. Landing (`/`)
2. Login (`/login`)
3. Onboarding (`/onboarding` + 3-step modal)
4. Dashboard (`/dashboard`) — active + locked properties, portfolio stats, city filter
5. Property detail (`/dashboard/[propertyId]`) — sections, modals, filters, CSV export
6. Settings (`/settings`)
7. Pricing (`/pricing`)

**Time-box:** 1-2 hours per session, focus on showstoppers only. Defer nice-to-haves.

### Phase 3 — Mobile testing

**Goal:** Verify CasAlerts works on actual iOS + Android phones, not just narrow browser viewport.

Checklist for each device:
- Magic link login flow
- Onboarding (address search, property add)
- Dashboard (active + locked cards, theme toggle)
- Property detail (all sections, modals, edit details)
- Mark as Resolved (4-step flow)
- Settings (notification toggles, plan management)

### Phase 4 — Functional testing

**Goal:** End-to-end verification with a fresh account simulating a real new user.

- [ ] Create new account via magic link
- [ ] Complete full onboarding (address → property add → 3-step modal)
- [ ] Trigger CRON manually to generate test alert
- [ ] Verify email alert received and rendered correctly
- [ ] Verify SMS alert received (with phone number opted in)
- [ ] Mark a violation resolved with all fields completed
- [ ] **Verify in Supabase** that all resolution fields wrote correctly to `violation_resolutions`
- [ ] Edit property details, verify audit trail in `property_edits_audit`
- [ ] Remove a property, verify questionnaire saves to `property_removal_feedback`
- [ ] Test plan upgrade flow (Stripe test mode)
- [ ] Test plan downgrade — verify properties lock correctly
- [ ] Verify locked properties don't receive alerts
- [ ] Test theme toggle on every page

### Phase 2.5d — Legal disclaimer integration

**Trigger:** SeedLegals returns reviewed legal documents (5-10 days after sending).

Use `in-app-disclaimers.md` + `in-app-disclaimers-patch-daily-scan.md` as the source of truth for placement. 18 sections cover:
- Login passive acceptance text
- Onboarding ToS checkbox + `terms_accepted_at` column
- SMS consent disclosure
- Resolution form data usage notice
- Email + SMS footer disclaimers
- **Compliance score tooltip — REPLACE old copy with stronger disclaimer:**
  > "CasAlerts Compliance Score is an informational indicator generated from public city data, refreshed once daily. Not legal or financial advice. Data may contain delays or errors. Always refer to official violation notices for binding deadlines and requirements."
- Risk briefing disclaimer
- Property info modal disclaimer
- Cookie consent banner (UK/EU users)
- Account deletion notice
- Email aliases setup
- Daily scan policy disclosure (10 user-facing surfaces)

Migration needed:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_version TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_consent_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cookie_consent_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cookie_consent_preferences JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT FALSE;
```

### Phase 5 — Cleanup + launch

- [ ] **Verify all secrets rotated** (per `docs/runbooks/rotate-secrets.md`)
- [ ] Delete test accounts and test properties
- [ ] Verify no test data remaining in production database
- [ ] Switch Stripe to LIVE mode (requires UK Ltd registered + bank account open)
- [ ] **Rotate Stripe live mode keys after switch** (live keys are independent from test keys)
- [ ] Real payment test with actual card ($1 test charge, refund)
- [ ] Verify Stripe webhook fires correctly in live mode (with idempotency from §3 item ext-06)
- [ ] Set up Google Analytics 4 / Plausible
- [ ] Final landing page copy review
- [ ] Launch announcement (LinkedIn, X, target communities)

---

## 3. Pre-launch scaling work (13 items)

These 13 items from the 74-item scaling roadmap are the genuine pre-launch necessities. They make CasAlerts solid from day-1 and create the foundation to scale to 50,000+ users without emergency refactors.

### 3A. Genuine launch blockers (must do before first paying customer)

| # | Item | Source | Effort | Trigger |
|---|---|---|---|---|
| **0** | **Rotate all secrets** (Stripe, Supabase service role, Twilio, Resend, CRON_SECRET, Cook County token) | `docs/runbooks/rotate-secrets.md` | 25 min | **DO BEFORE PHASE 5 LAUNCH** |
| 1 | **Legal: ToS + Privacy + AUP + Cookie pages** — Stripe live mode requires this | `legal-03` | M | Before Phase 5 |
| 2 | **Legal: Email compliance** (CAN-SPAM, unsubscribe, physical address in footer) | `legal-05` | S | Before launch |
| 3 | **Legal: SMS A2P 10DLC application** — takes 1-4 weeks to approve | `legal-04` | S | START NOW |
| 4 | **Legal: Twilio STOP/HELP webhook handler** — required by CTIA if sending SMS | `ext-05` | M | Before launch (if SMS enabled) |
| 5 | **Stripe webhook idempotency** — prevents double-charging on duplicate webhooks | `ext-06` | S | Before Phase 5 live mode |
| 6 | **Resend webhook handler** (bounces, complaints, unsubscribes) — protects sender reputation | `ext-04` | M | Before launch |
| 7 | **Supabase PITR + verify daily backups** | `dr-01` | XS | This week |

### 3B. Architectural foundations (cheap now, painful to retrofit at scale)

| # | Item | Source | Effort | Why pre-launch |
|---|---|---|---|---|
| 8 | **Database indexes on hot query paths** | `db-01` | XS | Two-hour migration. At 2,000 properties dashboard becomes slow without these. |
| 9 | **Sentry runtime error tracking** | `obs-01` | S | First real bug at 3am needs to be visible. 1-2 hour setup. |
| 10 | **BetterStack uptime monitoring** | `obs-03` | XS | Free tier. 30-minute setup. Detects outages before users complain. |
| 11 | **Rate limit magic link auth + address search** | `sec-01`, `sec-02` | S | Bots hit these endpoints day 1. Upstash free tier covers it. |
| 12 | **Database integrity constraints** (severity NOT NULL, cost ≥0, unique violation per property) | `db-04` | XS | Defense-in-depth for moat data. Single migration. |

### 3C. NOT pre-launch (defer per the trigger)

The other 17 P0 items in `SCALING_TO_100K.json` defer until specific user/scale triggers:

- **Queue migration (`bg-01`)** — defer until ~300-500 active properties. Sequential CRON works fine until there.
- **Failed-alert dead-letter queue (`bg-02`)** — defer until first alert delivery failure or 1k users.
- **Idempotency keys on alerts (`bg-03`)** — defer with `bg-01`. They're paired.
- **CRON observability table (`bg-04`)** — defer with `bg-01`.
- **CRON health check endpoint (`bg-05`)** — defer until queue migration complete.
- **`property_stats` populated (`db-03`)** — defer until dashboard load slows (likely 100-500 active users).
- **Socrata token rotation (`ext-01`)** — defer until rate-limit signal from Chicago API.
- **Carto retry wrapper (`ext-02`)** — defer until first Philly enrichment failure.
- **Full RLS audit at scale (`sec-03`)** — defer; current RLS already verified.
- **Service role audit (`sec-04`)** — defer; current usage is contained.
- **Zod everywhere (`val-01`)** — defer to Month 2 hardening sprint.
- **Structured logging (`obs-02`)** — defer until Sentry pain forces the upgrade.
- **Weekly data integrity check (`int-01`)** — defer to Month 1.
- **Resolution data archive trigger (`int-03`)** — defer; FKs are already SET NULL not CASCADE.
- **Staging environment (`test-01`)** — defer to Month 1.
- **Unit tests for `lib/` (`test-03`)** — defer to Month 1.
- **GitHub Actions CI (`test-05`)** — defer to Month 1.

### Pre-launch scaling checklist

- [ ] **Item 0** (rotation) — Rotate all secrets following `docs/runbooks/rotate-secrets.md`. Do this BEFORE switching Stripe to live mode in Phase 5.
- [ ] **Item 3** (`legal-04`) — START SMS A2P 10DLC application TODAY (it has the longest lead time)
- [ ] **Item 7** (`dr-01`) — Verify Supabase PITR enabled (5 minutes in dashboard)
- [ ] **Item 9** (`obs-01`) — Install Sentry
- [ ] **Item 10** (`obs-03`) — Set up BetterStack uptime monitor
- [ ] **Item 8** (`db-01`) — Run hot-path index migration
- [ ] **Item 12** (`db-04`) — Run integrity constraint migration
- [ ] **Item 11** (`sec-01`, `sec-02`) — Add Upstash rate limiting middleware
- [ ] **Item 5** (`ext-06`) — Stripe webhook idempotency (do alongside Phase 5 live mode prep)
- [ ] **Item 6** (`ext-04`) — Resend webhook handler
- [ ] **Item 4** (`ext-05`) — Twilio STOP/HELP handler (only if launching with SMS)
- [ ] **Item 1** (`legal-03`) — Wire ToS/Privacy/AUP/Cookie pages (after SeedLegals returns)
- [ ] **Item 2** (`legal-05`) — Email compliance footer (covered by `in-app-disclaimers.md`)

---

## 4. Post-launch scaling roadmap

The full 74-item scaling plan lives in `docs/SCALING_TO_100K.json`. That file has the canonical execution sequence, dependencies, SQL migrations, and verification commands per item.

### Trigger thresholds

| User count | Phase |
|---|---|
| 0-50 | Launch + observe; do nothing scaling-wise |
| 50-500 | Sentry pain points → fix as you go |
| 300-500 active properties | **TRIGGER `bg-01`** queue migration. Sequential CRON breaks above ~500. |
| 500-1,000 users | Start P0 items not yet done from `before_any_growth_push_P0_only` |
| 1,000-3,000 users | Complete P0 round-out + start P1 (`first_60_days_after_launch_P1`) |
| 3,000-10,000 users | P2 items + cost optimization |
| 30,000+ users | P3 items + advanced infrastructure |

### Marketing/growth gate

Before any marketing push that could spike traffic >1,000 users in a week:
- `bg-01` (queue) MUST be deployed and verified
- `db-01` (indexes) MUST be applied
- `obs-01` (Sentry) + `obs-03` (uptime) MUST be in place

### Use the JSON

When ready to start an item, paste that item's JSON block into a new Claude session along with current code context. Claude generates Cursor prompts and verification commands. The structured fields (`problem`, `solution_steps`, `files_affected`, `verification`, `do_not_change`) are designed for exactly this workflow.

---

## 5. Daily scan policy (locked decision)

**Decision:** CasAlerts scans publicly available city violation data **once per day**. This is the official policy.

### Rationale

1. **City data publishing cadence.** Chicago Socrata (Building Violations) publishes in nightly batches. Philadelphia Carto (L&I) publishes daily. Scanning more frequently produces identical data 99% of the time.
2. **Violation deadline windows are 30-90 days.** A 24-hour detection window is functionally indistinguishable from a 1-hour window for the user.
3. **Cost / load math.** Daily = 21k scans/day at 21k properties. Hourly = 504k scans/day (24x load) for zero additional user value. City APIs would throttle.

### What this means for users

- Alerts arrive within ~24 hours of a violation appearing in city data
- Manual rescan button remains (user-triggered, on demand)
- This is industry-standard for similar services and aligns with city data refresh rates

### What this means for product

- No need to build hourly/real-time scanning architecture
- Pricing tiers don't promise sub-daily scans
- Future "premium scan frequency" could exist (e.g., 2x daily for Pro) but is NOT on the roadmap
- Disclosed in Privacy Policy, Terms of Service, and the compliance score info tooltip

### Where this is reflected

- `in-app-disclaimers.md` (compliance score tooltip + email/SMS footers)
- `in-app-disclaimers-patch-daily-scan.md` (Section 18 — covers 10 user-facing surfaces)
- ToS draft (Section 4 — Data accuracy and informational-only disclaimer)
- Privacy Policy draft (Section 6 — Automated decision-making)

### What's still allowed manually

- Manual "Refresh data" button on property detail page (user-initiated, runs immediately)
- Re-enrichment endpoint (founder-triggered, for backfills)

---

## 6. Competitive landscape

**Initial assumption: blue ocean.** Subsequent research showed this is incorrect for the broader US market but may still hold for Chicago + Philadelphia specifically.

### Direct competitors (NYC-focused, identified April 2026)

| Competitor | Focus | Pricing | Notes |
|---|---|---|---|
| ViolationWatch.nyc | NYC DOB/HPD/ECB/FDNY/311 + 311 | $9.99/month per address | Has free tier, multi-language (EN/ES), active SEO |
| DOBGuard.com | NYC DOB/HPD + 10+ agencies | Tiered up to 150 properties | "Intelligent Risk Scoring" (similar to compliance score), 14-day trial |
| CompliGuard / NYCAIGuide.com | NYC HPD + AI repair guidance | $39 professional reports | AI-positioned |
| NYCHAalerts.com | NYC NYCHA-specific | — | Narrow focus |
| Brickwise AI | NYC compliance + AI tenant comms | — | Adjacent (broader, more ambitious) |

### CasAlerts position

- **Probable blue ocean: Chicago + Philadelphia** (no direct competitor identified for these cities as of April 2026)
- **NOT blue ocean: NYC** — established players exist
- **Differentiator:** Chicago + Philly specialization, plus the resolution data moat (none of the competitors collect resolution costs / contractor data as far as can be determined from public marketing)

### Strategic implications

1. **Speed to Chicago + Philly launch matters more, not less.** If ViolationWatch or DOBGuard expands westward before CasAlerts is established, the window closes.
2. **Drop "blue ocean" language in pitching.** Lean into "Chicago + Philly specialist" or "the only platform collecting resolution + contractor data."
3. **US trademark on CasAlerts is now MORE important** — there are other compliance/violation alert services. Defensive trademark filing prevents extortion.
4. **The resolution data moat is the long-term defense.** Competitors track violations; CasAlerts tracks how landlords RESOLVE them. That's not in any public dataset.
5. **Multi-city architecture is right** — current `cities` table approach prepares for NYC, LA, Boston, Seattle expansion.

### Recommended action items (deferred but tracked)

- [ ] Deep-dive ViolationWatch + DOBGuard pricing, features, traffic (use SimilarWeb, BuiltWith, LinkedIn)
- [ ] File US trademark on "CasAlerts" + logo (~$650 via LegalZoom or USPTO directly)
- [ ] Track competitor expansion plans (their blog posts, LinkedIn announcements, hiring)

---

## 7. Key decisions log

This section records every meaningful decision and the rationale, so future Claude sessions or hired engineers don't re-litigate.

### Product decisions

| Decision | Rationale |
|---|---|
| UK Ltd not US LLC | Founder is Italian AIRE-registered London resident; US LLC creates double-tax complexity |
| Daily scan only, not hourly/real-time | City data publishes in nightly batches; hourly scans add 24x cost for zero user value |
| Property-based score, not landlord-based | Avoids ownership verification problem; landlord-level score in v2 with verified ownership |
| No tenant scoring | Fair Housing Act risk + reputational risk + not value prop |
| No tenant portal pre-launch | Legal complexity + two-sided marketplace + changes positioning |
| No contractor marketplace pre-launch | Requires user base first; recruit month 2-3, build month 3-4 |
| Collect ALL data from day 1 | Resolution costs are crown jewel moat; behavioral data is second; public data is foundation but not defensible alone |
| Gate score + risk briefing behind Starter tier | Strongest conversion driver; free users see violations but not intelligence layer |
| Free users still submit resolutions | Collects proprietary data even from non-paying users |
| Auto-keep newest properties on plan downgrade + user-pinnable | Simpler than asking user which to keep; "Make active" button gives control |
| Locked properties don't receive alerts | Aligns with paid-tier value prop; CRON skips them entirely |
| Contractor Yes/No question removed from onboarding | Low value without contractor name/details; full contractor system deferred to Month 2-3 |
| Resolution form data is sacrosanct | `exact_cost`, `contractor_*`, `work_on_schedule`, `casalerts_alerted_first`, `deadline_met`, `is_recurring`, `violation_external_id` must survive every refactor |
| Recommend reason textarea only for "No" answers | High signal, low friction — Yes/Maybe answers are noise |

### Technical decisions

| Decision | Rationale |
|---|---|
| Stay on Vercel Hobby until forced to upgrade | $50/mo total ops cost is the goal; current scale doesn't need Pro |
| Supabase Pro from day 1 | Required for branded SMTP and reliable RLS; $25/mo |
| Tailwind v4 (not v3) | Already in place; CSS-based config in `globals.css` via `@theme inline` |
| Walnut Brick palette (not blue/green) | Differentiation from every PropTech competitor (Appfolio/Buildium/CoreLogic blues) |
| Marcellus is logo-only | Never in dashboard text; Inter is functional UI font |
| Numbers use Inter tabular-nums | Not JetBrains Mono. JetBrains Mono is for identifiers (violation codes) only. |
| `body.light-theme` class (not `html.dark`) | Existing theme system; default is dark |
| Audit trail for property edits from day 1 | Multi-user future (B2B tier Month 4-6); zero cost to capture `changed_by_user_id` now |
| `violation_external_id` in `violation_resolutions` | Survives rescans; `violation_id` FK is SET NULL not CASCADE |
| `severity_classification` always set | Moat data; auto-classified at insert if missing (planned via `db-04` constraint + `int-02` trigger) |
| 4-phase Walnut rollout, never merged | Phase 4 is revenue-critical; isolation enables targeted rollback |
| Zinc kept alive in Tailwind during Walnut migration | Hundreds of zinc references; gradual swap surface-by-surface in Phases 2-4 |

### Strategic decisions

| Decision | Rationale |
|---|---|
| Path 1 + Insurance for legal | SeedLegals review (£500-800) + combined PI/Cyber from Superscript (£700-1,700/yr) = £1,200-2,500 total pre-launch |
| Defer queue migration until 300-500 properties | Current sequential CRON works fine until then; refactor when forced |
| Defer 17 of 29 P0 scaling items to post-launch | Build for the scale you have, not the scale you might one day reach |
| Pre-launch scaling list = 13 items, not 74 | Speed to market matters in blue oceans; over-engineering is the enemy of launch |
| Trademark CasAlerts in US ASAP | Other "violation alert" services exist; defensive filing prevents extortion |
| Rotate all secrets pre-launch + annually | Cheap (~25 min), gives clean slate, protects against unknown leaks (e.g., past chat pastes), industry-standard hygiene |

---

## 8. Critical never-forget rules

These rules MUST be honored in every change, every Cursor prompt, every refactor. If a future Claude session or engineer violates these, revert immediately.

### Data integrity rules (the moat)

1. **Never remove or modify existing data collection code without explicit instruction.**
2. **Every new feature must log appropriate `compliance_events` and `analytics_events`.**
3. **Every violation insertion must include `severity_classification`.**
4. **Every property enrichment must save `zip_code`, `latitude`, `longitude`, `parcel_id` where available.**
5. **Resolution data is the most valuable proprietary data — never lose it.**
   - Required fields: `exact_cost`, `contractor_source`, `contractor_trade`, `contractor_rating`, `contractor_name`, `contractor_phone`, `contractor_website`, `work_on_schedule`, `casalerts_alerted_first`, `deadline_met`, `is_recurring`, `affected_areas`, `fix_date`, `resolution_method`
6. **`violation_external_id` MUST be saved in `violation_resolutions` to survive rescans.**
7. **Property edit audit trail MUST capture every field change.** `property_edits_audit` table.

### Design system rules

8. **Marcellus / Marcellus SC is logo-only.** If a Cursor prompt applies these fonts to dashboard text, that's a bug — reject.
9. **Numbers use Inter with tabular-nums.** Not JetBrains Mono.
10. **JetBrains Mono is for identifiers and micro-labels only** (violation codes like `BV-24-0891`, grade pills, stat labels).
11. **Brand colors and semantic colors never collide on the same element.** Walnut/cream = brand; red/amber/green = state.
12. **Walnut Brick rollout phases never merge.** Each phase deploys + verifies before the next starts.

### Phase 4 mandatory test

13. **After any change to the resolution form (PropertyDetailClient.tsx, ResolutionForm.tsx, propertyId-actions.ts), run a full end-to-end test** with a real test resolution and verify in Supabase that all fields wrote correctly. Required SQL:

```sql
SELECT
  violation_external_id, resolution_method, exact_cost,
  contractor_name, contractor_trade, contractor_rating,
  contractor_source, work_on_schedule, casalerts_alerted_first,
  deadline_met, is_recurring, fix_date, affected_areas
FROM violation_resolutions
ORDER BY created_at DESC
LIMIT 1;
```

Every column must contain non-null values matching the test input. If ANY field is null or missing, revert the change.

### CRON safety

14. **CRON `maxDuration=60` on Vercel Hobby.** Don't change without queue migration.
15. **Locked properties (`pinned_at IS NULL` AND outside top-N for plan) MUST be skipped by CRON.** Free tier = top 1, Starter = top 5, Pro = unlimited.
16. **Daily scan only.** Do not increase frequency without explicit decision change in §5.

### RLS

17. **Every new user-scoped table needs RLS enabled + policy added.** Current pattern: SELECT/UPDATE/DELETE policies use `auth.uid() = user_id`. Service role bypasses RLS.

### Secret hygiene

18. **Never paste secret values into any chat** (Claude, ChatGPT, Slack, Discord, anywhere). Refer to variable NAMES only (`STRIPE_SECRET_KEY`), never the value. If accidentally pasted, rotate immediately using `docs/runbooks/rotate-secrets.md`.

19. **Annual rotation cadence.** Set a calendar reminder one year from each rotation. Repeat the rotation runbook annually as good hygiene.

20. **GitHub push protection MUST stay enabled.** Verify monthly: github.com/steelcut98/casalert/settings/security_analysis. If disabled, re-enable immediately.

21. **Secrets only live in three places.** `.env.local` on your machine (gitignored), Vercel environment variables (production), and your password manager. Never in code, commits, chats, emails, screenshots, or cloud-synced files.

---

## 9. Document index

### Active planning documents (in repo)

| File | Purpose |
|---|---|
| `docs/CasAlerts_Master_Playbook.md` (this file) | Single source of truth for execution, decisions, history |
| `CasAlerts_Business_Overview.md` | Product positioning, market, unit economics |
| `CasAlerts_Engineering_Handoff.md` | Stack, schema, completed features. **Note:** may be slightly out of date — this playbook supersedes for status. |
| `CasAlerts_PostLaunch_Roadmap.md` | 6-month product roadmap (post-launch features) |
| `Complete_Design_System` | Walnut Brick design tokens, typography, logo spec — LOCKED |
| `docs/SCALING_TO_100K.json` | Structured 74-item scaling roadmap |
| `docs/runbooks/rotate-secrets.md` | Step-by-step rotation for all 5 actually-secret credentials |

### Generated drafts (not yet integrated)

| File | Status | Integration phase |
|---|---|---|
| `terms-of-service-v2.tsx` | Drafted | Phase 2.5d after SeedLegals |
| `privacy-policy-v2.tsx` | Drafted | Phase 2.5d |
| `acceptable-use-policy.tsx` | Drafted | Phase 2.5d |
| `cookie-policy.tsx` | Drafted | Phase 2.5d |
| `SiteFooter-v2.tsx` | Drafted | Phase 1B (footer surface) |
| `in-app-disclaimers.md` + `in-app-disclaimers-patch-daily-scan.md` | Reference doc, master truth for in-app legal copy | Phase 2.5d wires per the spec |
| Walnut ship package (`02-08`) | Files ready to apply | Phase 1A |

### Related runbooks (to create when needed)

- `docs/runbooks/database-restore.md` (after `dr-01`)
- `docs/runbooks/incident-response.md` (Month 1 post-launch)
- `docs/runbooks/disaster-scenarios.md` (Month 1 post-launch)

---

## How to use this playbook

### When starting a new Claude session
Paste this entire playbook as the first message after the persona/system prompt. Claude has full context — current state, decisions, what's pending — without re-asking.

### When completing a step
Update the checkbox or status marker immediately. This is a living document — it should always reflect reality. If something ships, mark it done. If a decision changes, log the change in §7.

### When a competitor decision or strategic question comes up
Check §7 first. If a similar question was decided, use that decision. If not, decide and add to §7.

### When working on Cursor prompts
Reference §8 critical rules. If a prompt would violate any of those rules, reject it.

---

_End of master playbook._
