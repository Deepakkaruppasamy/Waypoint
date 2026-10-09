import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { DataStore } from '../storage';

export function recordRoutes(store: DataStore): Router {
  const router = Router();
  router.use(requireAuth(store));

  /**
   * GET /api/records
   *
   * The same endpoint returns different data depending on who calls it:
   *   - Admin:        every record, including "Admin" level ones
   *   - General User: only their own records at "General" level
   */
  router.get('/', async (req, res) => {
    const user = req.currentUser!;
    const all = await store.listRecords();

    const visible =
      user.role === 'Admin'
        ? all
        : all.filter((r) => r.ownerId === user.userId && r.accessLevel === 'General');

    visible.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    res.json({
      items: visible,
      access: {
        role: user.role,
        scope: user.role === 'Admin' ? 'all' : 'own',
        visibleCount: visible.length,
        totalCount: all.length,
      },
    });
  });

  return router;
}
