-- 004_lessons_english_title: keep both titles, not whichever one won.
--
-- The lesson page now shows two titles: an English headline above the article
-- card so you know what you are about to read, and the article's own headline
-- in the target language at the top of the card itself.
--
-- The English one was already being generated -- `vocabularyExtraction` asks for
-- it on every lesson -- but `createLesson` wrote a single `article_title` column
-- and preferred the scraped headline, so on any URL-sourced lesson the generated
-- English title was computed, paid for, and discarded. This column stores it
-- instead of throwing it away.
--
-- Nullable: lessons created before this migration have only the one title, and
-- the page falls back to showing it alone.

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS article_title_english VARCHAR(500);
