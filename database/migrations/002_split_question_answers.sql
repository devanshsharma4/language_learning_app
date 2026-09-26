-- 002_split_question_answers: repair lesson_responses schema drift.
--
-- An earlier version of the table stored every answer in a single
-- `question_answers jsonb` object. The code was later split to grade multiple
-- choice deterministically and send only free text to the LLM, which needs two
-- separate columns -- but because schema.sql used CREATE TABLE IF NOT EXISTS,
-- re-applying it never altered the existing table. Result: every call to
-- submitLessonResponse failed with
--   error: column "mcq_answers" of relation "lesson_responses" does not exist
--
-- No data is migrated because no response was ever stored successfully
-- (lesson_responses was empty when this was written).
--
-- Guarded so it is a no-op on a database created fresh from 001_baseline.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_responses' AND column_name = 'question_answers'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_responses' AND column_name = 'mcq_answers'
  ) THEN
    ALTER TABLE lesson_responses RENAME COLUMN question_answers TO mcq_answers;
    -- The old column defaulted to '{}' (an object keyed by question id); the code
    -- now writes an array of { questionId, selectedOption }.
    ALTER TABLE lesson_responses ALTER COLUMN mcq_answers SET DEFAULT '[]'::jsonb;
    UPDATE lesson_responses SET mcq_answers = '[]'::jsonb
      WHERE jsonb_typeof(mcq_answers) <> 'array';
  END IF;
END $$;

ALTER TABLE lesson_responses
  ADD COLUMN IF NOT EXISTS mcq_answers JSONB NOT NULL DEFAULT '[]';

ALTER TABLE lesson_responses
  ADD COLUMN IF NOT EXISTS short_answer_responses JSONB NOT NULL DEFAULT '[]';
