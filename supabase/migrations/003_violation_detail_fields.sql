-- Add inspector comments, ordinance, and inspector_id for violation detail UI
ALTER TABLE public.violations
  ADD COLUMN IF NOT EXISTS violation_inspector_comments TEXT,
  ADD COLUMN IF NOT EXISTS violation_ordinance TEXT,
  ADD COLUMN IF NOT EXISTS inspector_id TEXT;
