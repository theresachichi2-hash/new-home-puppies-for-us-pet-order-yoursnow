
-- Extended puppy info fields
ALTER TABLE public.puppies
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS generation text,
  ADD COLUMN IF NOT EXISTS weight_min_lbs numeric,
  ADD COLUMN IF NOT EXISTS weight_max_lbs numeric,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS vet_checked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vaccines_status text,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_delivery boolean NOT NULL DEFAULT false;

GRANT SELECT (size, generation, weight_min_lbs, weight_max_lbs, date_of_birth, vet_checked, vaccines_status, view_count, free_delivery) ON public.puppies TO anon;
GRANT UPDATE (view_count) ON public.puppies TO anon;

-- Reservation amount on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS reservation_amount numeric;

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puppy_id uuid REFERENCES public.puppies(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT reviews_name_len CHECK (char_length(author_name) BETWEEN 1 AND 80),
  CONSTRAINT reviews_content_len CHECK (char_length(content) BETWEEN 3 AND 2000)
);

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT ON public.reviews TO anon, authenticated;
GRANT DELETE, UPDATE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are publicly readable"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can submit a review"
  ON public.reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    rating BETWEEN 1 AND 5
    AND char_length(author_name) BETWEEN 1 AND 80
    AND char_length(content) BETWEEN 3 AND 2000
  );

CREATE POLICY "Admins manage reviews"
  ON public.reviews FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed a few starter reviews so the section is populated
INSERT INTO public.reviews (author_name, rating, content) VALUES
  ('Sarah M.', 5, 'Our Cavapoo from NewHomePet is the sweetest addition to our family. Healthy, well-socialized, and the delivery was seamless!'),
  ('James T.', 5, 'Incredible experience from start to finish. The team answered every question and our puppy arrived happy and healthy.'),
  ('Emily R.', 5, 'Highly recommend! Our Frenchie is thriving. Vet said she was in perfect shape when we did our first check-up.'),
  ('Michael B.', 5, 'Best decision we ever made. The reservation process was easy and communication was top notch.'),
  ('Ava L.', 5, 'Beautiful, healthy puppy and fantastic support. Truly a five-star breeder network.');
