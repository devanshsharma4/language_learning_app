import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { lessonService } from '../services/lesson/lessonService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const createLessonSchema = z.object({
  language: z.enum(['spanish', 'french', 'japanese', 'korean']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  articleText: z.string().optional(),
  articleUrl: z.string().url().optional()
}).refine(data => data.articleText || data.articleUrl, {
  message: 'Either articleText or articleUrl must be provided'
});

const submitResponseSchema = z.object({
  mcqAnswers: z.array(z.object({
    questionId: z.string(),
    selectedOption: z.number().int().min(0).max(3)
  })),
  shortAnswerResponses: z.array(z.object({
    questionId: z.string(),
    answer: z.string()
  })),
  writingResponses: z.array(z.object({
    promptId: z.string(),
    response: z.string()
  }))
});

// Create a new lesson
router.post('/create', authenticate, async (req: AuthRequest, res, next) => {
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

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

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
router.post('/:id/submit', authenticate, async (req: AuthRequest, res, next) => {
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

export { router as lessonsRouter };