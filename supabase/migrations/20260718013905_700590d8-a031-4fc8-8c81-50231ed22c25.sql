
-- 1) Lock down SECURITY DEFINER function execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.grant_first_admin() FROM PUBLIC, anon, authenticated;
-- trigger owner (postgres) can still execute it; grant to service_role for admin ops
GRANT EXECUTE ON FUNCTION public.grant_first_admin() TO service_role;

-- 2) payment_settings: remove public read
DROP POLICY IF EXISTS "settings public read" ON public.payment_settings;
REVOKE SELECT ON public.payment_settings FROM anon;
CREATE POLICY "settings admin read"
  ON public.payment_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) puppies: hide seller PII columns from public/anon via column grants
REVOKE SELECT ON public.puppies FROM anon, authenticated, PUBLIC;

GRANT SELECT
  (id, name, breed, gender, age_weeks, color, price, description,
   image_url, media, available, created_at, updated_at)
  ON public.puppies TO anon;

GRANT SELECT
  (id, name, breed, gender, age_weeks, color, price, description,
   image_url, media, available, created_at, updated_at,
   seller_name, seller_phone, seller_email, seller_notes)
  ON public.puppies TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.puppies TO authenticated;
GRANT ALL ON public.puppies TO service_role;

-- 4) orders: validated insert policy (remove USING/CHECK true permissive)
DROP POLICY IF EXISTS "orders anyone create" ON public.orders;
CREATE POLICY "orders create validated"
  ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(buyer_name) BETWEEN 1 AND 200
    AND char_length(buyer_email) BETWEEN 3 AND 254
    AND buyer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(buyer_phone) BETWEEN 5 AND 50
    AND char_length(address_line1) BETWEEN 1 AND 500
    AND char_length(city) BETWEEN 1 AND 200
    AND char_length(state) BETWEEN 1 AND 200
    AND char_length(postal_code) BETWEEN 1 AND 40
    AND char_length(country) BETWEEN 1 AND 100
    AND price >= 0
    AND payment_method IN ('paypal','bitcoin','contact')
    AND status = 'pending_payment'
  );
