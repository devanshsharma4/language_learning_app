import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { Note } from '../types/models';

const router = Router();

const createNoteSchema = z.object({
  lessonId: z.number(),
  content: z.string().min(1)
});

const updateNoteSchema = z.object({
  content: z.string().min(1)
});

// Get user's notes (with lesson metadata)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const lessonId = req.query.lessonId ? parseInt(req.query.lessonId as string) : null;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    let queryText = `
      SELECT n.*, l.article_title, l.language, l.difficulty
      FROM notes n
      JOIN lessons l ON l.id = n.lesson_id
      WHERE n.user_id = $1
    `;
    const params: any[] = [req.user.userId];

    if (lessonId) {
      queryText += ' AND n.lesson_id = $2';
      params.push(lessonId);
    }

    queryText += ' ORDER BY n.updated_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const notes = await query<any>(queryText, params);

    const countQuery = lessonId
      ? 'SELECT COUNT(*) FROM notes WHERE user_id = $1 AND lesson_id = $2'
      : 'SELECT COUNT(*) FROM notes WHERE user_id = $1';
    const countParams = lessonId ? [req.user.userId, lessonId] : [req.user.userId];
    const countResult = await query<{ count: string }>(countQuery, countParams);

    res.json({
      status: 'success',
      data: {
        notes,
        total: parseInt(countResult[0].count)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get notes + vocabulary for a specific lesson
router.get('/lesson/:lessonId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const lessonId = parseInt(req.params.lessonId as string);
    if (isNaN(lessonId)) {
      throw new AppError(400, 'Invalid lesson ID');
    }

    // Verify lesson belongs to user
    const lessons = await query<any>(
      'SELECT id, article_title, language, difficulty FROM lessons WHERE id = $1 AND user_id = $2',
      [lessonId, req.user.userId]
    );

    if (lessons.length === 0) {
      throw new AppError(404, 'Lesson not found');
    }

    const [notes, vocabulary] = await Promise.all([
      query<Note>(
        'SELECT * FROM notes WHERE lesson_id = $1 AND user_id = $2 ORDER BY created_at DESC',
        [lessonId, req.user.userId]
      ),
      query<any>(
        'SELECT * FROM saved_vocabulary WHERE lesson_id = $1 AND user_id = $2 ORDER BY created_at DESC',
        [lessonId, req.user.userId]
      )
    ]);

    res.json({
      status: 'success',
      data: {
        lesson: lessons[0],
        notes,
        vocabulary
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create a note
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const validation = createNoteSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'Invalid input data');
    }

    const { lessonId, content } = validation.data;

    // Verify lesson belongs to user
    const lessons = await query<any>(
      'SELECT id FROM lessons WHERE id = $1 AND user_id = $2',
      [lessonId, req.user.userId]
    );

    if (lessons.length === 0) {
      throw new AppError(404, 'Lesson not found');
    }

    const result = await query<Note>(
      `INSERT INTO notes (user_id, lesson_id, content)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.userId, lessonId, content]
    );

    res.json({
      status: 'success',
      data: { note: result[0] }
    });
  } catch (error) {
    next(error);
  }
});

// Update a note
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const noteId = parseInt(req.params.id as string);
    if (isNaN(noteId)) {
      throw new AppError(400, 'Invalid note ID');
    }

    const validation = updateNoteSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'Invalid input data');
    }

    const result = await query<Note>(
      `UPDATE notes SET content = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [validation.data.content, noteId, req.user.userId]
    );

    if (result.length === 0) {
      throw new AppError(404, 'Note not found');
    }

    res.json({
      status: 'success',
      data: { note: result[0] }
    });
  } catch (error) {
    next(error);
  }
});

// Delete a note
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const noteId = parseInt(req.params.id as string);
    if (isNaN(noteId)) {
      throw new AppError(400, 'Invalid note ID');
    }

    const result = await query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
      [noteId, req.user.userId]
    );

    if (result.length === 0) {
      throw new AppError(404, 'Note not found');
    }

    res.json({
      status: 'success',
      message: 'Note deleted'
    });
  } catch (error) {
    next(error);
  }
});

export { router as notesRouter };
