import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { badRequest, conflict, notFound } from '../errors';
import { requireAuth, requireRole } from '../middleware/auth';
import { ROLES, StoredUser, toPublicUser } from '../models';
import { DataStore } from '../storage';

const password = z
  .string()
  .min(8, 'Password needs at least 8 characters')
  .regex(/[A-Za-z]/, 'Password needs a letter')
  .regex(/[0-9]/, 'Password needs a number');

const createUserSchema = z.object({
  userId: z
    .string()
    .trim()
    .toLowerCase() // "Deepak" and "deepak" are the same account
    .min(3, 'User ID needs at least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Use letters, numbers, dot, dash or underscore'),
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.email('Enter a valid email address'),
  department: z.string().trim().min(1, 'Department is required').max(60),
  role: z.enum(ROLES),
  password,
});

// When editing, every field is optional and the user id cannot change.
const updateUserSchema = createUserSchema.omit({ userId: true }).partial();

/** Every route here is for administrators only. */
export function userRoutes(store: DataStore): Router {
  const router = Router();
  router.use(requireAuth(store), requireRole('Admin'));

  async function countAdmins(): Promise<number> {
    const users = await store.listUsers();
    return users.filter((u) => u.role === 'Admin').length;
  }

  /** GET /api/users */
  router.get('/', async (_req, res) => {
    const users = await store.listUsers();
    res.json(users.map(toPublicUser));
  });

  /** POST /api/users */
  router.post('/', async (req, res) => {
    const input = createUserSchema.parse(req.body);

    if (await store.findUserByUserId(input.userId)) {
      throw conflict(`The user ID "${input.userId}" is already taken.`);
    }

    const user: StoredUser = {
      id: randomUUID(),
      userId: input.userId,
      name: input.name,
      email: input.email,
      department: input.department,
      role: input.role,
      passwordHash: await bcrypt.hash(input.password, 10),
      createdAt: new Date().toISOString(),
    };
    await store.insertUser(user);
    res.status(201).json(toPublicUser(user));
  });

  /** PUT /api/users/:id */
  router.put('/:id', async (req, res) => {
    const input = updateUserSchema.parse(req.body);
    const existing = await store.findUserById(req.params.id);
    if (!existing) throw notFound('User not found.');

    const losesAdmin = existing.role === 'Admin' && input.role === 'General User';
    if (losesAdmin && (await countAdmins()) === 1) {
      throw badRequest('At least one administrator must remain.');
    }

    const { password: newPassword, ...fields } = input;
    const changes: Partial<StoredUser> = { ...fields };
    if (newPassword) changes.passwordHash = await bcrypt.hash(newPassword, 10);

    const updated = await store.updateUser(existing.id, changes);
    res.json(toPublicUser(updated!));
  });

  /** DELETE /api/users/:id */
  router.delete('/:id', async (req, res) => {
    const existing = await store.findUserById(req.params.id);
    if (!existing) throw notFound('User not found.');

    if (existing.id === req.currentUser!.id) {
      throw badRequest('You cannot delete the account you are signed in with.');
    }
    if (existing.role === 'Admin' && (await countAdmins()) === 1) {
      throw badRequest('At least one administrator must remain.');
    }

    await store.deleteUser(existing.id);
    await store.deleteRecordsByOwner(existing.userId);
    res.status(204).end();
  });

  return router;
}
