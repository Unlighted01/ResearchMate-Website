-- =============================================
-- RESEARCHMATE MASTER SCHEMA VERIFICATION SCRIPT
-- =============================================
-- Run this script in the Supabase SQL Editor to ensure your database 
-- is 100% ready for the ResearchMate Extension and Website.

-- 1. Ensure the 'items' table exists
CREATE TABLE IF NOT EXISTS public.items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    text TEXT NOT NULL,
    source_url TEXT,
    source_title TEXT,
    note TEXT,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    device_source TEXT DEFAULT 'extension'
);

-- 2. Add all potentially missing columns (Idempotent)
DO $$ 
BEGIN 
    -- AI Summary
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'ai_summary') THEN
        ALTER TABLE public.items ADD COLUMN ai_summary TEXT;
    END IF;

    -- Citation (The ones causing issues earlier)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'citation') THEN
        ALTER TABLE public.items ADD COLUMN citation TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'citation_format') THEN
        ALTER TABLE public.items ADD COLUMN citation_format TEXT;
    END IF;

    -- Preferred View
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'preferred_view') THEN
        ALTER TABLE public.items ADD COLUMN preferred_view TEXT;
    END IF;

    -- Collection ID
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'collection_id') THEN
        ALTER TABLE public.items ADD COLUMN collection_id UUID;
    END IF;
    
    -- Smart Pen Fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'image_url') THEN
        ALTER TABLE public.items ADD COLUMN image_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'ocr_text') THEN
        ALTER TABLE public.items ADD COLUMN ocr_text TEXT;
    END IF;
END $$;

-- 3. Enable Row Level Security (RLS) if not already enabled
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Drops existing to ensure latest correct version)
DROP POLICY IF EXISTS "Users can create their own items" ON public.items;
CREATE POLICY "Users can create their own items"
ON public.items FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own items" ON public.items;
CREATE POLICY "Users can view their own items"
ON public.items FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own items" ON public.items;
CREATE POLICY "Users can update their own items"
ON public.items FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own items" ON public.items;
CREATE POLICY "Users can delete their own items"
ON public.items FOR DELETE
USING (auth.uid() = user_id);

-- Output success message
SELECT 'Verification Complete. Your database schema is ready!' as status;
