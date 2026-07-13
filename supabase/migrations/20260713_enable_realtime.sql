-- =========================================================================
-- DATABASE MIGRATION - ENABLE REALTIME FOR SYSTEM TABLES
-- =========================================================================

-- 1. Create supabase_realtime publication if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Add tables to supabase_realtime publication (safely)
DO $$
BEGIN
    -- Add items table if not already added
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
    END IF;

    -- Add paired_devices table if not already added
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'paired_devices'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.paired_devices;
    END IF;
END $$;
