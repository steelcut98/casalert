-- Questionnaire and address search logging
-- property_details: one row per property (optional details from onboarding questionnaire)
CREATE TABLE IF NOT EXISTS public.property_details (
  property_id UUID PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  property_type TEXT,
  unit_count TEXT,
  management_type TEXT,
  approximate_rent TEXT,
  year_built TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- profiles: questionnaire user-level fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_properties_owned TEXT,
  ADD COLUMN IF NOT EXISTS biggest_concerns TEXT[],
  ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- address_searches: log address searches during onboarding
CREATE TABLE IF NOT EXISTS public.address_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  property_added BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_address_searches_user_city_added
  ON public.address_searches(user_id, city, property_added);
