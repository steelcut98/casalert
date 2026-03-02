-- Optional nickname for properties (e.g. "Rental Unit A", "Mom's building")
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS nickname TEXT;
