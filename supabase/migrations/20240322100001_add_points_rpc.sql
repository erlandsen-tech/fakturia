-- Add invoice points atomically (avoids race conditions)
CREATE OR REPLACE FUNCTION public.add_invoice_points(p_user_id UUID, p_points INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_points INTEGER;
BEGIN
  -- Try to update existing profile
  UPDATE profiles
  SET invoice_points = invoice_points + p_points,
      updated_at = now()
  WHERE id = p_user_id
  RETURNING invoice_points INTO new_points;

  -- If no profile exists, create one
  IF NOT FOUND THEN
    INSERT INTO profiles (id, invoice_points)
    VALUES (p_user_id, p_points)
    RETURNING invoice_points INTO new_points;
  END IF;

  RETURN new_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deduct invoice point atomically (only if points > 0)
-- Already defined in 001 migration, but ensure it exists
CREATE OR REPLACE FUNCTION public.deduct_invoice_point(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_points INTEGER;
BEGIN
  UPDATE profiles
  SET invoice_points = invoice_points - 1,
      updated_at = now()
  WHERE id = p_user_id AND invoice_points > 0
  RETURNING invoice_points INTO new_points;

  RETURN new_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;