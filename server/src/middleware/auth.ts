import { RequestHandler } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { forbidden, unauthorized } from '../errors';
import { Role, StoredUser } from '../models';
import { DataStore } from '../storage';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by requireAuth: the signed-in user, freshly loaded from storage. */
    currentUser?: StoredUser;
  }
}

interface TokenPayload {
  sub: string;
}

/** Creates a signed token (JWT) that proves who the caller is on later requests. */
export function signToken(user: StoredUser): string {
  const options: SignOptions = { expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ sub: user.id } satisfies TokenPayload, config.jwtSecret, options);
}

/**
 * Rejects the request unless it carries a valid "Authorization: Bearer <token>" header.
 *
 * The user is re-read from storage on every request, so a role change or a
 * deleted account takes effect immediately instead of when the token expires.
 */
export function requireAuth(store: DataStore): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthorized();

    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, config.jwtSecret) as unknown as TokenPayload;
    } catch {
      throw unauthorized('Your session has expired. Please sign in again.');
    }

    const user = await store.findUserById(payload.sub);
    if (!user) throw unauthorized('This account no longer exists.');

    req.currentUser = user;
    next();
  };
}

/** Use after requireAuth. Lets the request through only for the given role. */
export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    if (req.currentUser?.role !== role) throw forbidden(`This action needs the ${role} role.`);
    next();
  };
}
