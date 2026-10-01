import { z } from 'zod';

/**
 * Runtime schemas for every LLM response.
 *
 * These were previously plain interfaces, and `generateJSON` cast the parsed JSON
 * to them with no validation. Consumers then dereferenced blindly --
 * `questionsResult.readingComprehension.map(...)` -- so any drift in the model's
 * output shape threw a raw TypeError deep in lessonService, surfaced as an opaque
 * 500, and did so *after* three or four Claude calls had already been paid for.
 *
 * Validating at the boundary turns that into a typed, retryable failure. The
 * TypeScript types are inferred from the schemas so the two cannot disagree.
 */

const nonEmptyString = z.string().trim().min(1);

/** Exactly four options, which is what the UI's A-D labelling assumes. */
const mcqOptions = z.array(nonEmptyString).length(4);

export const vocabularyExtractionSchema = z.object({
  // Optional: pre-existing lessons were generated before the prompt asked for a
  // title, and a URL-sourced article already has one from its <title> tag.
  title: z.string().trim().min(1).optional(),
  /** The same headline in the target language. Heads the article card. */
  titleInLanguage: z.string().trim().min(1).optional(),
  vocabulary: z
    .array(
      z.object({
        word: nonEmptyString,
        // Optional because models comply with it inconsistently; when it is
        // missing the reader falls back to matching `word` directly, which is
        // exactly the pre-existing behaviour.
        surfaceForm: z.string().trim().min(1).optional(),
        translation: z.string().default(''),
        explanation: z.string().default(''),
        partOfSpeech: z.string().optional(),
        example: z.string().optional(),
      }),
    )
    .min(1),
});

export const questionGenerationSchema = z.object({
  readingComprehension: z.array(
    z.object({
      id: nonEmptyString,
      question: nonEmptyString,
      options: mcqOptions,
      correctAnswer: z.number().int().min(0).max(3),
    }),
  ),
  shortAnswer: z.array(
    z.object({
      id: nonEmptyString,
      question: nonEmptyString,
      expectedAnswerGuidance: z.string().default(''),
    }),
  ),
});

export const vocabQuestionSchema = z.object({
  questions: z.array(
    z.object({
      id: nonEmptyString,
      word: nonEmptyString,
      question: nonEmptyString,
      options: mcqOptions,
      correctAnswer: z.number().int().min(0).max(3),
    }),
  ),
});

export const writingPromptSchema = z.object({
  prompts: z.array(
    z.object({
      id: nonEmptyString,
      prompt: nonEmptyString,
      minWords: z.number().int().positive().optional(),
      maxWords: z.number().int().positive().optional(),
    }),
  ),
});

/**
 * Free-text scores are 0-10 (see `clampScore` in lessonService). Coerced rather
 * than rejected: a model returning "8" as a string is a formatting slip, not a
 * reason to throw away a graded submission the user already waited for.
 */
const score = z.coerce.number();

export const feedbackSchema = z.object({
  short_answer_evaluation: z
    .array(
      z.object({
        questionId: nonEmptyString,
        score,
        feedback: z.string().default(''),
      }),
    )
    .default([]),
  writing_evaluation: z
    .array(
      z.object({
        promptId: nonEmptyString,
        score,
        feedback: z.string().default(''),
        strengths: z.array(z.string()).default([]),
        improvements: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  grammar_corrections: z
    .array(
      z.object({
        original: z.string().default(''),
        corrected: z.string().default(''),
        explanation: z.string().default(''),
      }),
    )
    .default([]),
  vocabulary_suggestions: z
    .array(
      z.object({
        original: z.string().default(''),
        suggested: z.string().default(''),
        reason: z.string().default(''),
      }),
    )
    .default([]),
  overall_feedback: z.string().default(''),
});

/**
 * Which extracted text blocks are the article body.
 *
 * No `.default([])`: an empty or absent `keep` must fail validation rather than
 * quietly mean "discard the whole article". The caller treats a failure as
 * "filter unavailable" and keeps every block.
 */
export const articleBodySchema = z.object({
  keep: z.array(z.number().int().nonnegative()).min(1),
});

export type ArticleBodyResult = z.infer<typeof articleBodySchema>;
export type VocabularyExtractionResult = z.infer<typeof vocabularyExtractionSchema>;
export type QuestionGenerationResult = z.infer<typeof questionGenerationSchema>;
export type VocabQuestionResult = z.infer<typeof vocabQuestionSchema>;
export type WritingPromptResult = z.infer<typeof writingPromptSchema>;
export type FeedbackResult = z.infer<typeof feedbackSchema>;
