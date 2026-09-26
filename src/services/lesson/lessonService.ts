import { query, transaction } from '../../config/database';
import { llmService } from '../llm/llmService';
import { vocabularyTarget } from '../llm/prompts';
import { articleService } from '../article/articleService';
import { AppError } from '../../middleware/errorHandler';
import {
  Lesson,
  LessonResponse,
  LessonQuestion,
  MCQResult,
  MCQAnswer,
  ShortAnswerResponse,
  VocabularyItem
} from '../../types/models';

/** lessons.article_title is VARCHAR(500); an over-long <title> used to fail the INSERT. */
const TITLE_MAX_LENGTH = 500;

function truncateTitle(title: string | undefined): string | undefined {
  const trimmed = title?.trim();
  if (!trimmed) return undefined;
  return trimmed.length > TITLE_MAX_LENGTH
    ? `${trimmed.slice(0, TITLE_MAX_LENGTH - 1)}…`
    : trimmed;
}

/** Free-text scores are 0-10. The model is instructed to stay in range; this enforces it. */
export const MAX_SCORE = 10;

export function clampScore(score: unknown): number {
  const n = typeof score === 'number' ? score : Number(score);
  if (!Number.isFinite(n)) return 0;
  return Math.min(MAX_SCORE, Math.max(0, n));
}

/**
 * Overall lesson score as a percentage, averaging whichever sections exist.
 *
 * MCQs are already a ratio; free-text sections are 0-10 and scale by 10. Returns
 * null when a lesson has been graded but carries no scoreable section, so the UI
 * can distinguish "no score" from "scored zero".
 */
export function computeOverallScore(feedback: {
  mcq_results?: Array<{ correct: boolean }>;
  short_answer_evaluation?: Array<{ score: unknown }>;
  writing_evaluation?: Array<{ score: unknown }>;
} | null | undefined): number | null {
  if (!feedback) return null;

  const parts: number[] = [];

  const mcq = feedback.mcq_results ?? [];
  if (mcq.length > 0) {
    parts.push((mcq.filter(r => r.correct).length / mcq.length) * 100);
  }

  for (const section of [feedback.short_answer_evaluation, feedback.writing_evaluation]) {
    if (section && section.length > 0) {
      // clampScore also absorbs a missing or non-numeric score, which previously
      // turned the whole average into NaN and serialised as null.
      const avg = section.reduce((sum, e) => sum + clampScore(e.score), 0) / section.length;
      parts.push(avg * 10);
    }
  }

  if (parts.length === 0) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

export class LessonService {
  async createLesson(
    userId: number,
    language: string,
    difficulty: string,
    articleInput: { text?: string; url?: string }
  ): Promise<{ lesson: Lesson; articleTruncated: boolean }> {
    let articleText: string;
    let articleTitle: string | undefined;
    let articleUrl: string | undefined;
    // Reported back to the caller so the UI can say the lesson covers only
    // part of a long article. Deliberately not persisted — it describes this
    // creation, and storing it would need a schema change.
    let articleTruncated = false;

    // Extract article content
    if (articleInput.url) {
      const extracted = await articleService.extractFromUrl(articleInput.url);
      articleText = extracted.text;
      articleTitle = extracted.title;
      articleUrl = articleInput.url;
      articleTruncated = extracted.truncated;
    } else if (articleInput.text) {
      articleText = articleInput.text;
      articleService.validateArticle(articleText);
    } else {
      throw new AppError(400, 'Either article text or URL must be provided');
    }

    // Step 1: Run vocab extraction, reading comp questions, and writing prompts in parallel
    const [vocabularyResult, questionsResult, promptsResult] = await Promise.all([
      llmService.extractVocabulary(articleText, language, difficulty),
      llmService.generateQuestions(articleText, language, difficulty),
      llmService.generateWritingPrompts(articleText, language, difficulty)
    ]);

    // The prompt asks for a specific count, but models treat counts as
    // suggestions and sometimes repeat a word. Enforce both here so the stored
    // lesson is guaranteed to satisfy the quota.
    const vocabulary = this.normalizeVocabulary(
      vocabularyResult.vocabulary,
      vocabularyTarget(articleText, difficulty)
    );

    // Pasted text has no <title> to scrape, so every pasted lesson showed as
    // "Untitled Article" in the history list. The vocabulary call already receives
    // the full article, so asking it for a headline costs no extra request.
    // A scraped title still wins -- it is the author's own.
    articleTitle = truncateTitle(articleTitle) ?? truncateTitle(vocabularyResult.title);

    // Step 2: Generate vocab MCQs (needs vocabulary output from step 1)
    const vocabQuestionsResult = await llmService.generateVocabQuestions(
      vocabulary,
      language,
      difficulty
    );

    // Merge all questions into a single array with proper types
    const allQuestions: LessonQuestion[] = [
      ...questionsResult.readingComprehension.map(q => ({
        ...q,
        type: 'reading_comprehension' as const
      })),
      ...vocabQuestionsResult.questions.map(q => ({
        ...q,
        type: 'vocabulary' as const
      })),
      ...questionsResult.shortAnswer.map(q => ({
        ...q,
        type: 'short_answer' as const
      }))
    ];

    // Save lesson to database
    const lesson = await transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO lessons (
          user_id, language, difficulty, article_title, article_text, article_url,
          vocabulary, questions, writing_prompts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          userId,
          language,
          difficulty,
          articleTitle,
          articleText,
          articleUrl,
          JSON.stringify(vocabulary),
          JSON.stringify(allQuestions),
          JSON.stringify(promptsResult.prompts)
        ]
      );

      return result.rows[0];
    });

    return { lesson: this.formatLesson(lesson), articleTruncated };
  }

  async getLesson(lessonId: number, userId: number): Promise<Lesson | null> {
    const lessons = await query<any>(
      'SELECT * FROM lessons WHERE id = $1 AND user_id = $2',
      [lessonId, userId]
    );

    if (lessons.length === 0) {
      return null;
    }

    return this.formatLesson(lessons[0]);
  }

  async getUserLessons(
    userId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ lessons: any[]; total: number }> {
    const [lessons, countResult] = await Promise.all([
      query<any>(
        `SELECT l.id, l.user_id, l.language, l.difficulty, l.article_title,
                l.article_url, l.created_at,
                lr.completed, lr.submitted_at, lr.ai_feedback
         FROM lessons l
         LEFT JOIN lesson_responses lr ON lr.lesson_id = l.id AND lr.user_id = l.user_id
         WHERE l.user_id = $1
         ORDER BY l.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      query<{ count: string }>(
        'SELECT COUNT(*) FROM lessons WHERE user_id = $1',
        [userId]
      )
    ]);

    return {
      lessons: lessons.map((row: any) => {
        // One malformed row must not 500 the entire history page.
        let feedback: any = row.ai_feedback;
        if (typeof feedback === 'string') {
          try {
            feedback = JSON.parse(feedback);
          } catch {
            console.error(`Unparseable ai_feedback on lesson ${row.id}; treating as ungraded`);
            feedback = null;
          }
        }

        const overallScore = computeOverallScore(feedback);

        return {
          id: row.id,
          user_id: row.user_id,
          language: row.language,
          difficulty: row.difficulty,
          article_title: row.article_title,
          article_url: row.article_url,
          created_at: row.created_at,
          completed: row.completed ?? false,
          submitted_at: row.submitted_at,
          overall_score: overallScore,
        };
      }),
      total: parseInt(countResult[0].count)
    };
  }

  async submitLessonResponse(
    lessonId: number,
    userId: number,
    mcqAnswers: MCQAnswer[],
    shortAnswerResponses: ShortAnswerResponse[],
    writingResponses: Array<{ promptId: string; response: string }>
  ): Promise<LessonResponse> {
    // Get the lesson
    const lesson = await this.getLesson(lessonId, userId);

    if (!lesson) {
      throw new AppError(404, 'Lesson not found');
    }

    // Grade MCQs deterministically
    const mcqQuestions = lesson.questions.filter(
      (q): q is Extract<LessonQuestion, { type: 'reading_comprehension' | 'vocabulary' }> =>
        q.type === 'reading_comprehension' || q.type === 'vocabulary'
    );

    // Iterate the questions, not the submitted answers. Mapping over the
    // client-supplied answers made the denominator "however many answers were
    // sent", so answering 1 of 9 questions correctly scored 100% and every
    // skipped question vanished instead of counting as wrong.
    const mcqResults: MCQResult[] = mcqQuestions.map(question => {
      const answer = mcqAnswers.find(a => a.questionId === question.id);
      const selectedAnswer = answer ? answer.selectedOption : null;

      return {
        questionId: question.id,
        type: question.type,
        // An unanswered question is incorrect, never absent.
        correct: selectedAnswer !== null && selectedAnswer === question.correctAnswer,
        selectedAnswer,
        correctAnswer: question.correctAnswer
      };
    });

    // Get short answer questions for AI feedback
    const shortAnswerQuestions = lesson.questions.filter(
      (q): q is Extract<LessonQuestion, { type: 'short_answer' }> =>
        q.type === 'short_answer'
    );

    // Generate AI feedback only for short answers and writing
    const aiFeedback = await llmService.generateFeedback(
      lesson.article_text,
      shortAnswerQuestions,
      shortAnswerResponses,
      lesson.writing_prompts,
      writingResponses,
      lesson.language
    );

    // Combine MCQ results with AI feedback. Scores are clamped on the way in so
    // a model that ignores the 0-10 instruction cannot poison stored feedback --
    // an out-of-range value reaches the UI as a percentage and, before this,
    // rendered things like "850%" with a negative progress-ring offset.
    const fullFeedback = {
      mcq_results: mcqResults,
      ...aiFeedback,
      short_answer_evaluation: aiFeedback.short_answer_evaluation?.map(e => ({
        ...e,
        score: clampScore(e.score)
      })) ?? [],
      writing_evaluation: aiFeedback.writing_evaluation?.map(e => ({
        ...e,
        score: clampScore(e.score)
      })) ?? []
    };

    // Save response to database
    const response = await transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO lesson_responses (
          lesson_id, user_id, mcq_answers, short_answer_responses,
          writing_responses, ai_feedback, completed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (lesson_id, user_id)
        DO UPDATE SET
          mcq_answers = $3,
          short_answer_responses = $4,
          writing_responses = $5,
          ai_feedback = $6,
          completed = $7,
          submitted_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [
          lessonId,
          userId,
          JSON.stringify(mcqAnswers),
          JSON.stringify(shortAnswerResponses),
          JSON.stringify(writingResponses),
          JSON.stringify(fullFeedback),
          true
        ]
      );

      return result.rows[0];
    });

    return this.formatLessonResponse(response);
  }

  async getLessonResponse(
    lessonId: number,
    userId: number
  ): Promise<LessonResponse | null> {
    const responses = await query<any>(
      'SELECT * FROM lesson_responses WHERE lesson_id = $1 AND user_id = $2',
      [lessonId, userId]
    );

    if (responses.length === 0) {
      return null;
    }

    return this.formatLessonResponse(responses[0]);
  }

  /**
   * Drops duplicate words (case-insensitive) and trims to `target`.
   *
   * Duplicates matter beyond tidiness: the article highlighter keys on the
   * word, so a repeated entry produces a vocabulary MCQ testing the same term
   * twice.
   */
  private normalizeVocabulary(
    items: VocabularyItem[],
    target: number
  ): VocabularyItem[] {
    const seen = new Set<string>();
    const unique: VocabularyItem[] = [];

    for (const item of items) {
      const key = item.word?.trim().toLowerCase();
      if (!key || seen.has(key)) continue;

      seen.add(key);
      unique.push(item);
    }

    return unique.slice(0, target);
  }

  private formatLesson(row: any): Lesson {
    return {
      id: row.id,
      user_id: row.user_id,
      language: row.language,
      difficulty: row.difficulty,
      article_title: row.article_title,
      article_text: row.article_text,
      article_url: row.article_url,
      vocabulary: row.vocabulary,
      questions: row.questions,
      writing_prompts: row.writing_prompts,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private formatLessonResponse(row: any): LessonResponse {
    return {
      id: row.id,
      lesson_id: row.lesson_id,
      user_id: row.user_id,
      mcq_answers: row.mcq_answers || [],
      short_answer_responses: row.short_answer_responses || [],
      writing_responses: row.writing_responses || [],
      ai_feedback: row.ai_feedback,
      completed: row.completed,
      submitted_at: row.submitted_at
    };
  }
}

export const lessonService = new LessonService();
