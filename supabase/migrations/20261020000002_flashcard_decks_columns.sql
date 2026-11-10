ALTER TABLE public.flashcard_decks
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS source_document_title TEXT;
