ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS source_document_title TEXT,
  ADD COLUMN IF NOT EXISTS seed TEXT,
  ADD COLUMN IF NOT EXISTS seed_record JSONB,
  ADD COLUMN IF NOT EXISTS import_batch_id TEXT;

ALTER TABLE public.flashcard_decks
  ADD COLUMN IF NOT EXISTS import_batch_id TEXT;

ALTER TABLE public.exams ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.exam_attempts ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.flashcard_decks ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.exam_attempts DROP CONSTRAINT IF EXISTS exam_attempts_exam_id_fkey;
ALTER TABLE public.exam_attempts DROP CONSTRAINT IF EXISTS fk_exam_attempts_exam;
ALTER TABLE public.exam_attempts
  ADD CONSTRAINT fk_exam_attempts_exam
  FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE SET NULL;
