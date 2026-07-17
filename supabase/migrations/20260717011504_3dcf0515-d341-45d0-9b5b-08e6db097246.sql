ALTER TABLE public.puppies
  ADD COLUMN IF NOT EXISTS seller_name text,
  ADD COLUMN IF NOT EXISTS seller_phone text,
  ADD COLUMN IF NOT EXISTS seller_email text,
  ADD COLUMN IF NOT EXISTS seller_notes text;