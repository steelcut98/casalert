-- CasAlert: Initial schema with RLS
-- Run this in Supabase SQL Editor (or via Supabase CLI migrations)

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE plan_tier AS ENUM ('free', 'starter', 'pro');

CREATE TYPE violation_status AS ENUM ('open', 'closed', 'unknown');

-- =============================================================================
-- TABLES
-- =============================================================================

-- User profiles (extends auth.users; id = auth.uid())
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  plan plan_tier NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supported cities (Chicago, Philadelphia at launch)
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  socrata_domain TEXT NOT NULL,
  dataset_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User properties (addresses they monitor)
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  address TEXT NOT NULL,
  normalized_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, city_id, normalized_address)
);

-- Violations (from Socrata; one row per violation per property)
CREATE TABLE public.violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  external_id TEXT NOT NULL,
  violation_type TEXT,
  description TEXT,
  filed_at TIMESTAMPTZ,
  status violation_status NOT NULL DEFAULT 'unknown',
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, external_id)
);

-- Scan log per property (for "last scan" and new-violation detection)
CREATE TABLE public.property_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  violations_found_count INT NOT NULL DEFAULT 0,
  new_violations_count INT NOT NULL DEFAULT 0
);

-- Alert delivery log (optional; for tracking email/SMS sent)
CREATE TABLE public.alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  violation_id UUID NOT NULL REFERENCES public.violations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_properties_user_id ON public.properties(user_id);
CREATE INDEX idx_properties_city_id ON public.properties(city_id);
CREATE INDEX idx_violations_property_id ON public.violations(property_id);
CREATE INDEX idx_violations_city_id ON public.violations(city_id);
CREATE INDEX idx_violations_filed_at ON public.violations(filed_at);
CREATE INDEX idx_property_scans_property_id ON public.property_scans(property_id);
CREATE INDEX idx_property_scans_scanned_at ON public.property_scans(property_id, scanned_at DESC);
CREATE INDEX idx_alert_log_user_id ON public.alert_log(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read and update their own row only
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Cities: read-only for all authenticated users
CREATE POLICY "Authenticated users can view cities"
  ON public.cities FOR SELECT
  TO authenticated
  USING (true);

-- Properties: full CRUD for own rows
CREATE POLICY "Users can view own properties"
  ON public.properties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own properties"
  ON public.properties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own properties"
  ON public.properties FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own properties"
  ON public.properties FOR DELETE
  USING (auth.uid() = user_id);

-- Violations: read-only; user can only see violations for their properties
CREATE POLICY "Users can view violations for own properties"
  ON public.violations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = violations.property_id AND p.user_id = auth.uid()
    )
  );

-- Property scans: read-only for own properties
CREATE POLICY "Users can view scans for own properties"
  ON public.property_scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_scans.property_id AND p.user_id = auth.uid()
    )
  );

-- Alert log: users can view their own alerts
CREATE POLICY "Users can view own alert log"
  ON public.alert_log FOR SELECT
  USING (auth.uid() = user_id);

-- Service role / CRON will need to INSERT into violations and property_scans;
-- use a service role key in server-side jobs (bypasses RLS) or add policies for
-- a dedicated role. For now, RLS is satisfied for app users; backend jobs use
-- the service role key and bypass RLS.

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Keep profiles.updated_at in sync
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.cities IS 'Supported municipalities; update dataset_id per city SODA API.';

-- =============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- SEED CITIES (Chicago & Philadelphia)
-- =============================================================================

INSERT INTO public.cities (slug, name, socrata_domain, dataset_id) VALUES
  ('chicago', 'Chicago', 'data.cityofchicago.org', '22u3-xenr'),
  ('philadelphia', 'Philadelphia', 'opendata.phila.gov', 'violations');
-- Update dataset_id for Philadelphia when you have the exact SODA dataset ID.
