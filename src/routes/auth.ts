import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth/authService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

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

router.post('/register', async (req, res, next) => {
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

router.post('/login', async (req, res, next) => {
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

    const { language } = req.body;
    
    if (!['spanish', 'french', 'japanese', 'korean'].includes(language)) {
      throw new AppError(400, 'Invalid language');
    }

    await authService.updateUserLanguage(req.user.userId, language);
    
    res.json({
      status: 'success',
      message: 'Language preference updated'
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };