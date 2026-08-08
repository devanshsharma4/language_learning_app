import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../../config/database';
import { env } from '../../config/env';
import { User } from '../../types/models';
import { AppError } from '../../middleware/errorHandler';

const SALT_ROUNDS = 10;
const JWT_EXPIRY = '7d';

export interface AuthPayload {
  userId: number;
  email: string;
}

export class AuthService {
  async register(email: string, password: string, name?: string): Promise<{ user: Partial<User>; token: string }> {
    const existingUsers = await query<User>(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUsers.length > 0) {
      throw new AppError(409, 'User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const newUsers = await query<User>(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email, passwordHash, name]
    );

    const user = newUsers[0];
    const token = this.generateToken({ userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      },
      token
    };
  }

  async login(email: string, password: string): Promise<{ user: Partial<User>; token: string }> {
    const users = await query<User>(
      'SELECT id, email, password_hash, name, preferred_language FROM users WHERE email = $1',
      [email]
    );

    if (users.length === 0) {
      throw new AppError(401, 'Invalid email or password');
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new AppError(401, 'Invalid email or password');
    }

    const token = this.generateToken({ userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        preferred_language: user.preferred_language
      },
      token
    };
  }

  generateToken(payload: AuthPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
  }

  verifyToken(token: string): AuthPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    } catch (error) {
      throw new AppError(401, 'Invalid or expired token');
    }
  }

  async getUserById(userId: number): Promise<Partial<User> | null> {
    const users = await query<User>(
      'SELECT id, email, name, preferred_language, created_at FROM users WHERE id = $1',
      [userId]
    );

    return users.length > 0 ? users[0] : null;
  }

  async updateUserLanguage(userId: number, language: string): Promise<void> {
    await query(
      'UPDATE users SET preferred_language = $1 WHERE id = $2',
      [language, userId]
    );
  }
}

export const authService = new AuthService();