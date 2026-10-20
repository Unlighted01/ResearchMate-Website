-- ====================================================================
-- MIGRATION: 20261020_exam_simulator_schema.sql
-- Master schema for Exams, Exam Attempts (with snapshots), and Flashcards
-- Security: Strict Owner-Only Row Level Security (RLS)
-- ====================================================================

-- 1. Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Exams Table
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source_item_ids UUID[] DEFAULT '{}',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INT NOT NULL DEFAULT 1,
    visibility TEXT DEFAULT 'private',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Exam Attempts Table (with questions_snapshot for immutability)
CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    score INT NOT NULL,
    total INT NOT NULL,
    percentage NUMERIC NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb, -- keyed by question UUID string: { [qId: string]: number }
    questions_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    duration_seconds INT,
    passed BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Flashcard Decks Table
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    source_item_ids UUID[] DEFAULT '{}',
    cards JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INT NOT NULL DEFAULT 1,
    visibility TEXT DEFAULT 'private',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Updated At Triggers
DROP TRIGGER IF EXISTS trigger_exams_updated_at ON public.exams;
CREATE TRIGGER trigger_exams_updated_at
    BEFORE UPDATE ON public.exams
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_decks_updated_at ON public.flashcard_decks;
CREATE TRIGGER trigger_decks_updated_at
    BEFORE UPDATE ON public.flashcard_decks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;

-- 7. Strict Owner-Only Policies (Prevents data leakage)
DROP POLICY IF EXISTS "Users can manage their own exams" ON public.exams;
CREATE POLICY "Users can manage their own exams"
ON public.exams FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own exam attempts" ON public.exam_attempts;
CREATE POLICY "Users can manage their own exam attempts"
ON public.exam_attempts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own flashcard decks" ON public.flashcard_decks;
CREATE POLICY "Users can manage their own flashcard decks"
ON public.flashcard_decks FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
