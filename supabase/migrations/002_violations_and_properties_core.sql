-- CasAlert: Violations detail columns, property_group, last_scanned_at, RLS for inserts
-- Run after 001_initial_schema.sql

-- =============================================================================
-- PROPERTIES: add last_scanned_at and property_group
-- =============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS property_group TEXT;

-- =============================================================================
-- VIOLATIONS: add full building-violation fields and alert tracking
-- =============================================================================

-- external_id already exists and stores city violation id (Chicago "id" field)
-- Add columns for building violations (22u3-xenr) and future ordinance
ALTER TABLE public.violations
  ADD COLUMN IF NOT EXISTS violation_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS violation_code TEXT,
  ADD COLUMN IF NOT EXISTS violation_description TEXT,
  ADD COLUMN IF NOT EXISTS violation_status TEXT,
  ADD COLUMN IF NOT EXISTS violation_status_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inspection_number TEXT,
  ADD COLUMN IF NOT EXISTS inspection_category TEXT,
  ADD COLUMN IF NOT EXISTS inspection_status TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS property_group TEXT,
  ADD COLUMN IF NOT EXISTS needs_alert BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS source_dataset TEXT NOT NULL DEFAULT 'building';

-- Unique constraint: one row per (property, city violation id)
-- Already have UNIQUE(property_id, external_id); external_id = violation_id_from_city

-- Index for open violations and alerting
CREATE INDEX IF NOT EXISTS idx_violations_needs_alert ON public.violations(needs_alert) WHERE needs_alert = true;
CREATE INDEX IF NOT EXISTS idx_violations_property_status ON public.violations(property_id, violation_status);
CREATE INDEX IF NOT EXISTS idx_violations_first_seen ON public.violations(property_id, first_seen_at DESC);

-- =============================================================================
-- RLS: allow insert/update violations for own properties (onboarding + app)
-- =============================================================================

CREATE POLICY "Users can insert violations for own properties"
  ON public.violations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = violations.property_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update violations for own properties"
  ON public.violations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = violations.property_id AND p.user_id = auth.uid()
    )
  );

-- Cron uses service_role key and bypasses RLS for bulk insert/update
