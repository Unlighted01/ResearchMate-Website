-- Enable pg_cron extension (Must be done by Superuser/Dashboard)
-- NOTE: If this fails in SQL Editor, user must enable 'pg_cron' in Supabase Dashboard -> Database -> Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create Cron Job to reset credits every day at midnight UTC
-- Schedule: '0 0 * * *' (Every day at 00:00)
SELECT cron.schedule(
  'daily-credit-reset', -- Job Name
  '0 0 * * *',          -- Schedule (Midnight UTC)
  'UPDATE public.profiles SET ai_credits = 50 WHERE ai_credits < 50' -- Query
);

-- NOTE: To verify, run: SELECT * FROM cron.job;
