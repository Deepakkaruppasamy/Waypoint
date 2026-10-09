import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { unauthorized } from '../errors';
import { requireAuth, signToken } from '../middleware/auth';
import { ROLES, toPublicUser } from '../models';
import { DataStore } from '../storage';

const loginSchema = z.object({
  userId: z.string().trim().toLowerCase().min(1, 'User ID is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(ROLES, { error: 'Choose a role' }),
});

export function authRoutes(store: DataStore): Router {
  const router = Router();

  /** POST /api/auth/login - checks user id, password and role, returns a token. */
  router.post('/login', async (req, res) => {
    const { userId, password, role } = loginSchema.parse(req.body);

    const user = await store.findUserByUserId(userId);
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

    // One message for every failure, so the response never reveals which part was wrong.
    if (!user || !passwordMatches || user.role !== role) {
      throw unauthorized('The user ID, password or role is incorrect.');
    }

    res.json({ token: signToken(user), user: toPublicUser(user) });
  });

  /** GET /api/auth/me - details of the signed-in user. */
  router.get('/me', requireAuth(store), (req, res) => {
    res.json(toPublicUser(req.currentUser!));
  });

  return router;
}
