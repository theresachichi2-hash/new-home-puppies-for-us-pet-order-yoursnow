GRANT SELECT, INSERT, UPDATE, DELETE ON public.puppies TO authenticated;
GRANT SELECT ON public.puppies TO anon;
GRANT ALL ON public.puppies TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT INSERT ON public.orders TO anon;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, UPDATE ON public.payment_settings TO authenticated;
GRANT SELECT ON public.payment_settings TO anon;
GRANT ALL ON public.payment_settings TO service_role;