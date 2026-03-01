-- Violation deadline reminders (user-set from official notice).
-- Cron/alert job: SELECT * FROM violation_reminders
--   WHERE is_active AND next_reminder_at IS NOT NULL AND next_reminder_at <= now()
-- to find due reminders for alerting; then update next_reminder_at (e.g. +3 days for every_3_days).
CREATE TABLE public.violation_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID NOT NULL REFERENCES public.violations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deadline_date DATE NOT NULL,
  reminder_frequency TEXT NOT NULL CHECK (reminder_frequency IN (
    'every_3_days', 'every_week', '10_days_before', '3_days_before', '1_day_before'
  )),
  next_reminder_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (violation_id)
);

CREATE INDEX idx_violation_reminders_next ON public.violation_reminders(next_reminder_at)
  WHERE is_active = true AND next_reminder_at IS NOT NULL;
CREATE INDEX idx_violation_reminders_user ON public.violation_reminders(user_id);

ALTER TABLE public.violation_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON public.violation_reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
  ON public.violation_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON public.violation_reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON public.violation_reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Ensure reminder is for a violation on user's property
CREATE OR REPLACE FUNCTION public.violation_reminder_property_check()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.violations v
    JOIN public.properties p ON p.id = v.property_id
    WHERE v.id = NEW.violation_id AND p.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Violation does not belong to user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER violation_reminder_property_owner
  BEFORE INSERT OR UPDATE ON public.violation_reminders
  FOR EACH ROW EXECUTE FUNCTION public.violation_reminder_property_check();

CREATE TRIGGER violation_reminders_updated_at
  BEFORE UPDATE ON public.violation_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
