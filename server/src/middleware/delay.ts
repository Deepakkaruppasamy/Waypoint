import { RequestHandler } from 'express';
import { config } from '../config';

/**
 * Artificial latency, controlled by the caller.
 *
 *   GET /api/records?delay=2000   -> responds after about two seconds
 *
 * The client uses this to demonstrate asynchronous loading states. The value
 * is capped so nobody can hold a connection open for minutes.
 */
export const delay: RequestHandler = (req, _res, next) => {
  const requested = Number(req.query.delay);
  if (!Number.isFinite(requested) || requested <= 0) {
    next();
    return;
  }
  const waitMs = Math.min(requested, config.maxDelayMs);
  setTimeout(next, waitMs);
};
