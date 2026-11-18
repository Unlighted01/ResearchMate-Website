-- ============================================
-- DE-SAASIFICATION MIGRATION: REMOVE BILLING & CREDITS
-- ============================================
-- Strips out all SaaS columns, subscription fields,
-- credit deduction RPCs, and cron reset jobs.
-- ============================================

-- 1. Unschedule daily credit reset cron job (if pg_cron is enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('daily-credit-reset');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Gracefully ignore if cron extension is not configured
END $$;

-- 2. Drop atomic credit deduction & refund RPC functions
DROP FUNCTION IF EXISTS public.deduct_credit(UUID);
DROP FUNCTION IF EXISTS public.refund_credit(UUID);

-- 3. Update new user profile trigger to stop inserting ai_credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Drop SaaS and billing columns from public.profiles
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS ai_credits,
  DROP COLUMN IF EXISTS plan,
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS subscription_id;
