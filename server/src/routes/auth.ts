import { Router } from 'express';
import { z } from 'zod';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { createUser, findUserByUsername, verifyPassword } from '../services/users';
import { env } from '../config/env';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(128),
});

function createAccessToken(payload: { userId: string; username: string }) {
  const secret = env.jwtAccessSecret as Secret;
  const expiresIn = env.jwtAccessExpiresIn as SignOptions['expiresIn'];
  return jwt.sign(payload, secret, { expiresIn });
}

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const { username, password } = parsed.data;

  const existing = await findUserByUsername(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const user = await createUser(username, password);
  const token = createAccessToken({ userId: user.id, username: user.username });

  return res.json({ token, user });
});

const loginSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(1).max(128),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const { username, password } = parsed.data;
  const user = await findUserByUsername(username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = createAccessToken({ userId: user.id, username: user.username });

  return res.json({
    token,
    user: { id: user.id, username: user.username },
  });
});

export default router;
