-- ============================================
-- RSS Feeds Migration (Phase 4)
-- ============================================
-- Table: rss_feeds
-- Stores per-user subscriptions to external RSS/Atom feeds.
-- The API endpoint `api/rss.ts` handles the actual fetch+parse.

CREATE TABLE IF NOT EXISTS public.rss_feeds (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    url         TEXT NOT NULL,
    category    TEXT DEFAULT 'General',
    last_fetched_at  TIMESTAMPTZ,
    last_item_date   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, url)
);

CREATE INDEX IF NOT EXISTS idx_rss_feeds_user_id ON public.rss_feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_created_at ON public.rss_feeds(created_at DESC);

-- Row-level security
ALTER TABLE public.rss_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rss feeds"
    ON public.rss_feeds FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rss feeds"
    ON public.rss_feeds FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rss feeds"
    ON public.rss_feeds FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rss feeds"
    ON public.rss_feeds FOR DELETE
    USING (auth.uid() = user_id);

-- Auto-bump updated_at
CREATE OR REPLACE FUNCTION public.rss_feeds_bump_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rss_feeds_updated_at ON public.rss_feeds;
CREATE TRIGGER rss_feeds_updated_at
    BEFORE UPDATE ON public.rss_feeds
    FOR EACH ROW
    EXECUTE FUNCTION public.rss_feeds_bump_updated_at();
