-- ====================================================================
-- MIGRATION: 20261020_exam_schema_hardening.sql
-- Enforces UUID Foreign Key Cascade, Decimal Percentage, and Indexes
-- ====================================================================

DO $$
BEGIN
    -- 1. Ensure percentage is NUMERIC(5,2) for exact grade calculation
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exam_attempts' AND column_name = 'percentage'
    ) THEN
        ALTER TABLE public.exam_attempts ALTER COLUMN percentage TYPE NUMERIC(5,2);
    END IF;

    -- 2. Ensure exam_id is UUID with foreign key constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exam_attempts' AND column_name = 'exam_id' AND data_type = 'text'
    ) THEN
        -- Clean up any invalid non-UUID placeholders (e.g. 'active-session')
        UPDATE public.exam_attempts 
        SET exam_id = NULL 
        WHERE exam_id IS NOT NULL AND exam_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

        ALTER TABLE public.exam_attempts 
        ALTER COLUMN exam_id TYPE UUID USING exam_id::UUID;
    END IF;
END $$;

-- 3. Add Foreign Key if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_exam_attempts_exam' AND table_name = 'exam_attempts'
    ) THEN
        ALTER TABLE public.exam_attempts
        ADD CONSTRAINT fk_exam_attempts_exam
        FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Add Indexes for fast attempt lookups
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON public.exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON public.exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_user_id ON public.exams(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user_id ON public.flashcard_decks(user_id);
