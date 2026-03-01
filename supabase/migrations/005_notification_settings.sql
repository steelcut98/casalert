-- Notification preferences on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_alerts_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alert_complaint BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_periodic BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_registration BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_permit BOOLEAN NOT NULL DEFAULT true;

-- phone already exists on profiles for SMS
