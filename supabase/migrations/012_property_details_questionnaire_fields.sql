-- Run this in Supabase SQL Editor if not using migration runner:
-- ALTER TABLE public.property_details
--   ADD COLUMN IF NOT EXISTS last_inspected TEXT,
--   ADD COLUMN IF NOT EXISTS surprised_by_violation TEXT;

ALTER TABLE public.property_details
  ADD COLUMN IF NOT EXISTS last_inspected TEXT,
  ADD COLUMN IF NOT EXISTS surprised_by_violation TEXT;
