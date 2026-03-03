-- Fix for F-05: Public Profile Enumeration
-- The original policy "Public profiles are viewable by everyone." allowed SELECT USING (true).
-- This means any authenticated or anonymous user (with the anon key) could potentially 
-- query all user profiles.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- Create a restrictive policy so users can only view their own profile data
CREATE POLICY "Users can view their own profile." 
  ON public.profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Note: The INSERT and UPDATE policies were already correctly constrained in the original migration:
-- "Users can insert their own profile." (auth.uid() = id)
-- "Users can update own profile." (auth.uid() = id)
