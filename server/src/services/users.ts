import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/mysql';

export type DbUser = {
  id: string;
  username: string;
  password_hash: string;
  created_at?: string;
};

export type PublicUser = {
  id: string;
  username: string;
  created_at?: string;
};

export async function findUserByUsername(username: string): Promise<DbUser | null> {
  const [rows] = await pool.query(
    'SELECT id, username, password_hash, created_at FROM users WHERE username = ? LIMIT 1',
    [username]
  );

  const list = rows as DbUser[];
  return list[0] ?? null;
}

export async function getAllUsersExcept(userId: string): Promise<PublicUser[]> {
  const [rows] = await pool.query(
    'SELECT id, username, created_at FROM users WHERE id <> ? ORDER BY username ASC',
    [userId]
  );

  return rows as PublicUser[];
}

export async function createUser(username: string, password: string) {
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    'INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
    [id, username, passwordHash]
  );

  return { id, username };
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
