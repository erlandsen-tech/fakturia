-- 004: Free trial — seed every new user's profile with 3 invoice points

-- Idempotent profile-seeding function. Triggered on auth.users insert.
CREATE OR REPLACE FUNCTION public.seed_profile_with_trial_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, invoice_points)
  VALUES (NEW.id, 3)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_seed_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_seed_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_profile_with_trial_points();

-- Backfill: any existing user without a profile gets 3 points too.
INSERT INTO public.profiles (id, invoice_points)
SELECT u.id, 3
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
