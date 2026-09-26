import { z } from 'zod';

/**
 * Shared, clamped pagination for list endpoints.
 *
 * Every list route used `parseInt(req.query.limit) || 20`, which had two holes:
 * `?limit=99999999` dumped the whole table in one query, and `?offset=-1` reached
 * Postgres as `OFFSET -1`, which errors and surfaced as an unhandled 500.
 *
 * Coerced rather than rejected: a bad page size is not worth failing a request
 * over, so out-of-range values clamp to the nearest sane bound.
 */
export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;

const paginationSchema = z.object({
  limit: z.coerce.number().int().catch(DEFAULT_LIMIT),
  offset: z.coerce.number().int().catch(0),
});

export function parsePagination(query: unknown): { limit: number; offset: number } {
  const { limit, offset } = paginationSchema.parse(query ?? {});

  return {
    limit: Math.min(MAX_LIMIT, Math.max(1, limit)),
    offset: Math.max(0, offset),
  };
}
