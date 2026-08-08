import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { SavedVocabulary } from '../types/models';

const router = Router();

const saveVocabularySchema = z.object({
  word: z.string(),
  translation: z.string().optional(),
  explanation: z.string().optional(),
  context: z.string().optional(),
  language: z.string(),
  lessonId: z.number().optional()
});

// Save vocabulary word
router.post('/save', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const validation = saveVocabularySchema.safeParse(req.body);
    
    if (!validation.success) {
      throw new AppError(400, 'Invalid input data');
    }

    const { word, translation, explanation, context, language, lessonId } = validation.data;

    const result = await query<SavedVocabulary>(
      `INSERT INTO saved_vocabulary (
        user_id, lesson_id, word, translation, explanation, context, language
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, word, language) 
      DO UPDATE SET 
        translation = COALESCE($4, saved_vocabulary.translation),
        explanation = COALESCE($5, saved_vocabulary.explanation),
        context = COALESCE($6, saved_vocabulary.context)
      RETURNING *`,
      [req.user.userId, lessonId, word, translation, explanation, context, language]
    );

    res.json({
      status: 'success',
      data: { vocabulary: result[0] }
    });
  } catch (error) {
    next(error);
  }
});

// Get user's saved vocabulary
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const language = req.query.language as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    let queryText = `
      SELECT * FROM saved_vocabulary 
      WHERE user_id = $1
    `;
    const params: any[] = [req.user.userId];

    if (language) {
      queryText += ' AND language = $2';
      params.push(language);
    }

    queryText += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const vocabulary = await query<SavedVocabulary>(queryText, params);

    const countQuery = language 
      ? 'SELECT COUNT(*) FROM saved_vocabulary WHERE user_id = $1 AND language = $2'
      : 'SELECT COUNT(*) FROM saved_vocabulary WHERE user_id = $1';
    
    const countParams = language ? [req.user.userId, language] : [req.user.userId];
    const countResult = await query<{ count: string }>(countQuery, countParams);

    res.json({
      status: 'success',
      data: {
        vocabulary,
        total: parseInt(countResult[0].count)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete saved vocabulary word
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const vocabularyId = parseInt(req.params.id as string);
    
    if (isNaN(vocabularyId)) {
      throw new AppError(400, 'Invalid vocabulary ID');
    }

    const result = await query(
      'DELETE FROM saved_vocabulary WHERE id = $1 AND user_id = $2 RETURNING id',
      [vocabularyId, req.user.userId]
    );

    if (result.length === 0) {
      throw new AppError(404, 'Vocabulary word not found');
    }

    res.json({
      status: 'success',
      message: 'Vocabulary word deleted'
    });
  } catch (error) {
    next(error);
  }
});

export { router as vocabularyRouter };