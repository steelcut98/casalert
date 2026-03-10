-- When user cancels subscription at period end, we store the end date for UI messaging
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_cancel_at timestamptz;
