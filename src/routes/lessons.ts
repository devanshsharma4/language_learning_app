import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { lessonService } from '../services/lesson/lessonService';
import { AppError } from '../middleware/errorHandler';
import { lessonCreationLimiter, submissionLimiter } from '../middleware/rateLimit';
import { parsePagination } from './pagination';

const router = Router();

/** The languages the prompts are written for. Shared with the auth route. */
export const LANGUAGES = ['spanish', 'french', 'japanese', 'korean'] as const;

const createLessonSchema = z.object({
  language: z.enum(LANGUAGES),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  articleText: z.string().optional(),
  articleUrl: z.string().url().optional()
}).refine(data => data.articleText || data.articleUrl, {
  message: 'Either articleText or articleUrl must be provided'
});

/** No question may be answered twice; grading looks up by id and would pick one arbitrarily. */
const uniqueQuestionIds = <T extends { questionId: string }>(answers: T[]) =>
  new Set(answers.map(a => a.questionId)).size === answers.length;

const submitResponseSchema = z.object({
  mcqAnswers: z.array(z.object({
    questionId: z.string(),
    selectedOption: z.number().int().min(0).max(3)
  })).refine(uniqueQuestionIds, { message: 'Duplicate questionId in mcqAnswers' }),
  shortAnswerResponses: z.array(z.object({
    questionId: z.string(),
    answer: z.string()
  })),
  writingResponses: z.array(z.object({
    promptId: z.string(),
    response: z.string()
  }))
});

// Create a new lesson.
//
// The limiter runs after `authenticate` so it can key on the user id: this route
// fans out to four Claude calls, and the cost lands on the account, not the IP.
router.post('/create', authenticate, lessonCreationLimiter, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const validation = createLessonSchema.safeParse(req.body);
    
    if (!validation.success) {
      throw new AppError(400, 'Invalid input data');
    }

    const { language, difficulty, articleText, articleUrl } = validation.data;

    const { lesson, articleTruncated } = await lessonService.createLesson(
      req.user.userId,
      language,
      difficulty,
      { text: articleText, url: articleUrl }
    );

    res.status(201).json({
      status: 'success',
      data: { lesson, articleTruncated }
    });
  } catch (error) {
    next(error);
  }
});

// Get user's lessons
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const { limit, offset } = parsePagination(req.query);

    const result = await lessonService.getUserLessons(
      req.user.userId,
      limit,
      offset
    );

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get specific lesson
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const lessonId = parseInt(req.params.id as string);
    
    if (isNaN(lessonId)) {
      throw new AppError(400, 'Invalid lesson ID');
    }

    const lesson = await lessonService.getLesson(lessonId, req.user.userId);
    
    if (!lesson) {
      throw new AppError(404, 'Lesson not found');
    }

    // Also get any existing response
    const response = await lessonService.getLessonResponse(lessonId, req.user.userId);

    res.json({
      status: 'success',
      data: { lesson, response }
    });
  } catch (error) {
    next(error);
  }
});

// Submit lesson response
router.post('/:id/submit', authenticate, submissionLimiter, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const lessonId = parseInt(req.params.id as string);
    
    if (isNaN(lessonId)) {
      throw new AppError(400, 'Invalid lesson ID');
    }

    const validation = submitResponseSchema.safeParse(req.body);
    
    if (!validation.success) {
      throw new AppError(400, 'Invalid input data');
    }

    const { mcqAnswers, shortAnswerResponses, writingResponses } = validation.data;

    const response = await lessonService.submitLessonResponse(
      lessonId,
      req.user.userId,
      mcqAnswers,
      shortAnswerResponses,
      writingResponses
    );

    res.json({
      status: 'success',
      data: { response }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a lesson.
 *
 * The `user_id` filter is the authorization: a lesson belonging to someone else
 * matches zero rows and reports 404, which is also the honest answer — it does
 * not exist as far as this user is concerned, and distinguishing "not yours"
 * from "not there" would leak which ids are real.
 *
 * Dependent rows are handled by the schema rather than here. `lesson_responses`
 * and `notes` cascade, because a submission and a lesson note are meaningless
 * without the lesson. `saved_vocabulary.lesson_id` is ON DELETE SET NULL on
 * purpose: a word you saved is yours, and deleting the lesson you met it in
 * should not take it out of your collection.
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const lessonId = parseInt(req.params.id as string);

    if (isNaN(lessonId)) {
      throw new AppError(400, 'Invalid lesson ID');
    }

    const deleted = await lessonService.deleteLesson(lessonId, req.user.userId);

    if (!deleted) {
      throw new AppError(404, 'Lesson not found');
    }

    res.json({ status: 'success', data: { id: lessonId } });
  } catch (error) {
    next(error);
  }
});

export { router as lessonsRouter };