import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit';
import type { Request, Response } from 'express';
import type { AuthRequest } from './auth';

/**
 * Rate limits.
 *
 * `POST /api/lessons/create` is the one that matters: each request fans out to
 * four Claude calls, so an authenticated user holding the button runs up real,
 * unbounded API spend. Authentication is not a spend limit.
 *
 * These are keyed on the authenticated user id rather than IP, because the cost
 * is incurred per account -- one user behind a shared NAT should not be throttled
 * by a stranger, and one user on many IPs should not escape the cap.
 */

/**
 * Per-user key, falling back to IP for unauthenticated routes.
 *
 * The IP branch goes through `ipKeyGenerator`, which buckets IPv6 addresses by
 * their /64 prefix. Keying on the raw address would let an IPv6 client rotate
 * through the trillions of addresses in its own prefix and never hit a limit.
 */
function userOrIpKey(req: Request): string {
  const userId = (req as AuthRequest).user?.userId;
  return userId ? `user:${userId}` : `ip:${ipKeyGenerator(req.ip ?? '')}`;
}

const shared: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
};

function limitExceeded(message: string) {
  return (_req: Request, res: Response) => {
    res.status(429).json({ error: message });
  };
}

/**
 * The expensive one. 10 lessons/hour is generous for real study -- each lesson
 * takes many minutes to work through -- while capping worst-case spend per
 * account at 40 Claude calls an hour.
 */
export const lessonCreationLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  handler: limitExceeded(
    'You have created a lot of lessons recently. Please wait a little while before creating another.',
  ),
});

/** Grading also calls the model, but only once, so it can be looser. */
export const submissionLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 60,
  handler: limitExceeded('Too many submissions. Please wait a moment and try again.'),
});

/**
 * Login and registration, keyed on IP since there is no user yet. Slows
 * credential stuffing without getting in a real user's way.
 */
export const authLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  handler: limitExceeded('Too many attempts. Please wait a few minutes and try again.'),
});

/** Backstop over everything else, so no endpoint is entirely unbounded. */
export const globalLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  handler: limitExceeded('Too many requests. Please slow down.'),
});
