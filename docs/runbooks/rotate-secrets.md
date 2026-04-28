# Runbook: Rotate All Secrets

**Purpose:** Replace every secret credential used by CasAlerts with a freshly generated one. Use this when:
- Pre-launch (one-time clean slate before going live)
- After any suspected exposure (paste into chat, lost laptop, suspicious activity)
- Annually as good hygiene
- Before adding the first real engineer to the team

**Estimated time:** 25-30 minutes for full rotation, including verification.

**Critical rule:** rotate one secret at a time. Verify the app still works between each rotation. If anything breaks, you can pinpoint the cause.

---

## Pre-rotation checklist

Before starting:

- [ ] You have admin access to: Supabase dashboard, Twilio console, Resend dashboard, Stripe dashboard, Vercel dashboard
- [ ] You know how to access your project's `.env.local` file
- [ ] You have ~30 minutes uninterrupted
- [ ] You're not doing this 5 minutes before an important demo

---

## Rotation order (low risk first → high risk last)

The order matters. We start with secrets where rotation has lowest impact, end with the most critical ones.

### 1. CRON_SECRET (2 min)

This is a self-generated string that gates `/api/cron/scan-violations`. Easiest rotation.

**Generate new value:**
```powershell
# In PowerShell — generates a random 64-char string
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes) -replace '[+/=]'
```

Copy the output.

**Apply:**
1. Open `.env.local`, replace the existing `CRON_SECRET=...` line with the new value
2. Vercel dashboard → your project → Settings → Environment Variables
3. Find `CRON_SECRET`, click Edit, paste new value, save (apply to all environments: Production + Preview + Development)
4. Redeploy your project (Vercel: Deployments → click "..." on latest → Redeploy)

**Verify:**
```powershell
# Test the new CRON_SECRET works (should return 200)
$secret = "PASTE_NEW_SECRET_HERE"
Invoke-WebRequest -Uri "https://casalerts.com/api/cron/scan-violations" -Headers @{"Authorization"="Bearer $secret"}
```

If 200, you're done with this one. If 401, the env var didn't update — check Vercel.

---

### 2. COOK_COUNTY_APP_TOKEN (5 min)

Low risk — free token, anyone can register more.

**Get new token:**
1. Go to [data.cookcountyil.gov](https://datacatalog.cookcountyil.gov/) (Cook County data portal)
2. Sign in to your account (or create new account if needed)
3. Profile → "Apps" or "Developer Settings" → Create New App Token
4. Description: "CasAlerts Production v2 — April 2026"
5. Copy the new token

**Apply:**
1. Update `.env.local`: `COOK_COUNTY_APP_TOKEN=NEW_VALUE`
2. Update Vercel env var
3. Redeploy

**Verify:** Trigger a property re-enrichment for a Chicago property in your dashboard. If it returns property details (year built, sq ft, etc.), the token works.

**Don't delete the old token yet** — keep it for 24h in case you need to roll back.

---

### 3. RESEND_API_KEY (3 min)

Affects email delivery (alerts, magic link).

**Get new key:**
1. Go to [resend.com/api-keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Name: "CasAlerts Production v2 — April 2026"
4. Permission: Full access
5. Domain: leave default (your verified casalerts.com domain)
6. Copy the new key (starts with `re_`)

**Apply:**
1. Update `.env.local`: `RESEND_API_KEY=re_NEW_VALUE`
2. Update Vercel env var
3. Update Supabase → Authentication → SMTP Settings → password field (Supabase uses this for magic link emails)
4. Redeploy Vercel

**Verify:**
1. Trigger a test alert (use the dev "Send test email" button if you have one, or trigger CRON manually with a property that has open violations)
2. Check inbox — email should arrive within 30 seconds
3. Try magic link login — should also work (this validates Supabase SMTP)

**Once verified, delete the OLD key** in Resend dashboard.

---

### 4. STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET (5 min)

Currently in **test mode**, low real-world impact. Still worth rotating.

**Get new secret key:**
1. Go to [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) (test mode!)
2. Standard keys section → click "Roll" next to your secret key
3. Confirm rotation. Copy the new key (starts with `sk_test_`)

**Get new webhook signing secret:**
1. Stripe dashboard → Developers → Webhooks
2. Find your existing endpoint (probably `https://casalerts.com/api/webhooks/stripe`)
3. Click into it → "Roll secret" or delete + recreate the endpoint
4. Copy the new signing secret (starts with `whsec_`)

**Apply:**
1. Update `.env.local`: `STRIPE_SECRET_KEY=sk_test_NEW`, `STRIPE_WEBHOOK_SECRET=whsec_NEW`
2. Update Vercel env vars (both)
3. Redeploy

**Verify:**
1. Open your `/pricing` page
2. Click "Subscribe" on a Starter plan
3. Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC
4. Confirm checkout succeeds
5. Confirm webhook fires (Stripe dashboard → Webhooks → click your endpoint → recent events should show 200)

**Important note about live mode:** when you eventually switch to Stripe live mode (Phase 5), repeat this rotation in live mode. Test keys (`sk_test_`) and live keys (`sk_live_`) are independent — rotating one doesn't affect the other.

---

### 5. TWILIO_AUTH_TOKEN (5 min)

Higher risk — Twilio bills per SMS, leaked tokens enable spam attacks at your expense.

**Rotate:**
1. Go to [console.twilio.com](https://console.twilio.com)
2. Account Info → click "View" next to Auth Token
3. Click "Request Secondary Auth Token"
4. This creates a NEW token; the OLD one stays valid for 24h
5. Copy the new (Secondary) auth token
6. **Test it works first** before promoting (next step)

**Apply temporarily (test):**
1. Update `.env.local`: `TWILIO_AUTH_TOKEN=NEW_VALUE`
2. Update Vercel env var
3. Redeploy

**Verify:**
1. Trigger an SMS test (manual rescan of a property with open violations + SMS toggle on, OR use the dev test SMS button)
2. Confirm SMS received

**Promote (final step):**
1. Back in Twilio console, click "Promote Secondary to Primary"
2. This invalidates the old token and makes the new one official
3. Done

`TWILIO_ACCOUNT_SID` does NOT change — that's an identifier, not a secret. Don't rotate it.

---

### 6. SUPABASE_SERVICE_ROLE_KEY (5 min) — HIGHEST RISK

This is the most powerful credential. Bypasses RLS, can read/write anything in your database. **Rotate this last because it requires the most testing.**

**Rotate:**
1. Go to Supabase Dashboard → your project → Settings → API
2. Find "Service role secret" section
3. Click "Reveal" to see current key
4. Click "Generate new service_role key" or similar option
5. Confirm. Copy the new key (it's a long JWT starting with `eyJ`)

**Critical:** the OLD key stops working immediately. There's no overlap window. So move FAST through the next steps.

**Apply:**
1. Update `.env.local`: `SUPABASE_SERVICE_ROLE_KEY=eyJ_NEW_VALUE`
2. Update Vercel env var → save
3. **Redeploy IMMEDIATELY** (don't wait — your CRON could try to run with the old key)

**Verify (test all admin operations):**
1. Trigger CRON manually — should complete without errors
2. Onboard a new test property — should work (uses service role for admin operations)
3. Submit a test resolution — should work
4. Check Vercel function logs for any "JWT signature invalid" or "401" errors → if you see any, the redeploy didn't pick up the new key

`NEXT_PUBLIC_SUPABASE_ANON_KEY` does NOT need rotation under normal circumstances. It's public by design. Only rotate if there's specific evidence of abuse.

---

## After all rotations complete

### Final verification (10 min)

Run this complete smoke test to confirm everything works end-to-end:

- [ ] Visit casalerts.com — homepage loads
- [ ] Login with magic link — email arrives, link works
- [ ] Dashboard loads with your properties
- [ ] Click into a property — detail page renders
- [ ] Trigger manual rescan on a property — completes successfully
- [ ] Mark a violation as resolved — saves, audit captured
- [ ] Edit property details — saves, audit captured
- [ ] CRON manual trigger via curl with new CRON_SECRET — returns 200
- [ ] Check Vercel function logs for last 30 min — no errors
- [ ] Check Supabase → Logs → API logs for last 30 min — no auth failures

If everything passes: you're rotated and verified. **Document the date below.**

### Rotation log

Keep this table updated. Annual rotation is good hygiene.

| Date | Reason | Operator | Notes |
|---|---|---|---|
| YYYY-MM-DD | Initial pre-launch rotation | nico | All 5 secrets rotated post-Claude-chat-paste concern |
| | | | |

---

## What to do if rotation breaks something

If the app breaks during/after rotation:

### Immediate: revert to OLD value
1. Update `.env.local` back to the old value
2. Update Vercel env var back to the old value
3. Redeploy

This buys you time to debug. (Note: if you've already promoted the Twilio Primary or generated a new Supabase key, the old value may already be invalid — see specific notes below.)

### Stripe rollback
- Old test key still works for 24h after rotation. You can roll back.

### Twilio rollback
- If you only requested a Secondary token (didn't promote), the old Primary still works. Just revert `.env.local` and don't promote.
- If you already promoted, you must request another Secondary, promote it, and continue.

### Supabase rollback
- **No rollback possible.** Once you generate a new service role key, the old one is invalid. If something breaks, you must debug forward, not roll back.
- This is why we test everything BEFORE rotating Supabase, and rotate it last.

### Resend rollback
- Old key still works until you delete it manually. Just revert `.env.local`.

---

## After rotation: don't paste secrets anywhere

This rotation gives you a clean slate. To keep it:

1. **Never paste secret values into any chat** (Claude, ChatGPT, Slack, Discord, anywhere). When you need to discuss a secret, refer to the variable NAME (`STRIPE_SECRET_KEY`) — never the value.
2. **Don't email secrets.** Use a password manager's share feature (1Password, Bitwarden) if you must share.
3. **Don't put secrets in commit messages, PR descriptions, or issue comments.**
4. **Don't save secrets in Notion, Google Docs, Dropbox, or any cloud-synced file.** They belong in `.env.local`, your password manager, and the platform's own dashboard. That's it.
5. **Don't take screenshots of secrets.** If you ever need to share a screenshot, redact the values first.

If you ever suspect a leak, run this rotation again. It's cheap.

---

## Annual rotation reminder

Add a calendar reminder for one year from your initial rotation date. Repeat this runbook annually. It's the SaaS equivalent of changing the locks every year — boring, low-effort, prevents long-tail risk.

---

_End of runbook._
