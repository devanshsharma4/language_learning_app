-- 003_saved_vocabulary_part_of_speech: remember what kind of word was saved.
--
-- The redesign colours every vocabulary word by its part of speech, and that
-- mapping is a meaning rather than decoration: the same ink means the same
-- grammatical category on every screen. Lesson vocabulary already carries
-- `partOfSpeech` inside the `lessons.vocabulary` JSONB, but saving a word threw
-- it away, so the vocabulary collection page had no way to colour its cards or
-- offer the part-of-speech filter the design calls for.
--
-- Nullable with no default: rows saved before this migration genuinely do not
-- know their part of speech, and inventing 'other' for them would be a lie the
-- filter counts would then repeat. The frontend normalizes NULL to 'other' at
-- render time, which keeps the unknown out of the stored data.

ALTER TABLE saved_vocabulary
  ADD COLUMN IF NOT EXISTS part_of_speech VARCHAR(40);

-- The collection page filters by part of speech within a language, which is the
-- only query shape this column has.
CREATE INDEX IF NOT EXISTS idx_saved_vocabulary_user_pos
  ON saved_vocabulary(user_id, part_of_speech);
