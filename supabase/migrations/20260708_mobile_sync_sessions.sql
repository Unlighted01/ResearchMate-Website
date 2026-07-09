-- 1. Create paired_devices/sync sessions table
CREATE TABLE IF NOT EXISTS public.paired_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT CHECK (device_type IN ('mobile_scanner', 'tablet_sync')),
    session_token TEXT UNIQUE,
    token_expires_at TIMESTAMPTZ NOT NULL,
    last_sync TIMESTAMPTZ DEFAULT now(),
    is_connected BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on paired_devices
ALTER TABLE public.paired_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own paired devices"
ON public.paired_devices FOR ALL
USING (auth.uid() = user_id);

-- 2. Update CHECK constraint on items table
ALTER TABLE public.items 
DROP CONSTRAINT IF EXISTS items_device_source_check;

ALTER TABLE public.items 
ADD CONSTRAINT items_device_source_check 
CHECK (device_source IN ('extension', 'mobile', 'smart_pen', 'web', 'transcription', 'mobile_scanner', 'tablet_sync'));

-- 3. Ensure ocr_confidence column is added
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS ocr_confidence FLOAT DEFAULT 1.0;
