-- ============================================
-- Atomic Credit Operations (Security Fix H-1)
-- ============================================
-- Replaces the non-atomic read-then-write pattern in auth.ts
-- with single-statement atomic updates to prevent race conditions.

-- Deduct 1 credit atomically. Returns the new credit count,
-- or -1 if the user has 0 credits (no deduction performed).
CREATE OR REPLACE FUNCTION public.deduct_credit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE public.profiles
  SET ai_credits = ai_credits - 1
  WHERE id = p_user_id AND ai_credits > 0
  RETURNING ai_credits INTO new_credits;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refund 1 credit atomically. Returns the new credit count.
CREATE OR REPLACE FUNCTION public.refund_credit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE public.profiles
  SET ai_credits = ai_credits + 1
  WHERE id = p_user_id
  RETURNING ai_credits INTO new_credits;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
