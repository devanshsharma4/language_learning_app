import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth/authService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { authLimiter } from '../middleware/rateLimit';
import { LANGUAGES } from './lessons';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Reuses the lesson route's enum rather than repeating the list, which had
// already drifted into two hand-maintained copies.
const languageSchema = z.object({
  language: z.enum(LANGUAGES)
});

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    
    if (!validation.success) {
      throw new AppError(400, 'Invalid input data');
    }

    const { email, password, name } = validation.data;
    const result = await authService.register(email, password, name);
    
    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
      throw new AppError(400, 'Invalid input data');
    }

    const { email, password } = validation.data;
    const result = await authService.login(email, password);
    
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const user = await authService.getUserById(req.user.userId);
    
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

router.put('/language', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    // safeParse rather than destructuring req.body: Express 5 leaves req.body
    // undefined when the Content-Type is not JSON, so `const { language } =
    // req.body` threw a TypeError and returned 500 instead of this 400.
    const validation = languageSchema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError(400, 'Invalid language');
    }

    await authService.updateUserLanguage(req.user.userId, validation.data.language);
    
    res.json({
      status: 'success',
      message: 'Language preference updated'
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };