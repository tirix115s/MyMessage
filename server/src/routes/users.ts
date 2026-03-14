import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getAllUsersExcept } from '../services/users';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const users = await getAllUsersExcept(req.user!.userId);
  return res.json({ users });
});

export default router;
