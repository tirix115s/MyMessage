import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/mysql';

export type ConversationType = 'direct' | 'group' | 'channel';
export type ParticipantRole = 'owner' | 'admin' | 'member';

export type ConversationListItem = {
  id: string;
  type: ConversationType;
  title: string | null;
  createdAt: string;
  lastMessageText: string | null;
  lastMessageCreatedAt: string | null;
  unreadCount: number;
};

export type ConversationParticipant = {
  userId: string;
  username: string;
  role: ParticipantRole;
  joinedAt: string;
};

export async function createDirectConversation(currentUserId: string, otherUserId: string) {
  const [existingRows] = await pool.query(
    `
    SELECT c.id
    FROM conversations c
    JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
    JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
    WHERE c.type = 'direct'
      AND cp1.user_id = ?
      AND cp2.user_id = ?
    LIMIT 1
    `,
    [currentUserId, otherUserId]
  );

  const existing = existingRows as Array<{ id: string }>;
  if (existing[0]) {
    return existing[0];
  }

  const id = uuidv4();

  await pool.query(
    `
    INSERT INTO conversations (id, type, title, owner_user_id)
    VALUES (?, 'direct', NULL, NULL)
    `,
    [id]
  );

  await pool.query(
    `
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES
      (?, ?, 'member'),
      (?, ?, 'member')
    `,
    [id, currentUserId, id, otherUserId]
  );

  await ensureConversationReadState(id, currentUserId);
  await ensureConversationReadState(id, otherUserId);

  return { id };
}

export async function createGroupConversation(
  ownerUserId: string,
  title: string,
  participantIds: string[]
) {
  const id = uuidv4();

  await pool.query(
    `
    INSERT INTO conversations (id, type, title, owner_user_id)
    VALUES (?, 'group', ?, ?)
    `,
    [id, title, ownerUserId]
  );

  const uniqueParticipantIds = Array.from(new Set([ownerUserId, ...participantIds]));

  const values = uniqueParticipantIds
    .map((userId) => [id, userId, userId === ownerUserId ? 'owner' : 'member'])
    .flat();

  const placeholders = uniqueParticipantIds
    .map(() => '(?, ?, ?)')
    .join(', ');

  await pool.query(
    `
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES ${placeholders}
    `,
    values
  );

  for (const userId of uniqueParticipantIds) {
    await ensureConversationReadState(id, userId);
  }

  return { id };
}

export async function createChannelConversation(ownerUserId: string, title: string) {
  const id = uuidv4();

  await pool.query(
    `
    INSERT INTO conversations (id, type, title, owner_user_id)
    VALUES (?, 'channel', ?, ?)
    `,
    [id, title, ownerUserId]
  );

  await pool.query(
    `
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (?, ?, 'owner')
    `,
    [id, ownerUserId]
  );

  await ensureConversationReadState(id, ownerUserId);

  return { id };
}

export async function getUserConversations(userId: string): Promise<ConversationListItem[]> {
  const [rows] = await pool.query(
    `
    SELECT
      c.id,
      c.type,
      CASE
        WHEN c.type = 'direct' THEN (
          SELECT u.username
          FROM conversation_participants cp_other
          JOIN users u ON u.id = cp_other.user_id
          WHERE cp_other.conversation_id = c.id
            AND cp_other.user_id <> ?
          LIMIT 1
        )
        ELSE c.title
      END AS title,
      c.created_at AS createdAt,
      (
        SELECT m.text
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS lastMessageText,
      (
        SELECT m.created_at
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS lastMessageCreatedAt,
      (
        SELECT COUNT(*)
        FROM messages m2
        LEFT JOIN conversation_reads cr
          ON cr.conversation_id = c.id
         AND cr.user_id = ?
        WHERE m2.conversation_id = c.id
          AND m2.user_id <> ?
          AND (
            cr.last_read_at IS NULL
            OR m2.created_at > cr.last_read_at
          )
      ) AS unreadCount
    FROM conversations c
    JOIN conversation_participants cp ON cp.conversation_id = c.id
    WHERE cp.user_id = ?
    ORDER BY COALESCE(
      (
        SELECT MAX(m.created_at)
        FROM messages m
        WHERE m.conversation_id = c.id
      ),
      c.created_at
    ) DESC
    `,
    [userId, userId, userId, userId]
  );

  return rows as ConversationListItem[];
}

export async function ensureUserInConversation(userId: string, conversationId: string) {
  const [rows] = await pool.query(
    `
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = ? AND user_id = ?
    LIMIT 1
    `,
    [conversationId, userId]
  );

  const list = rows as Array<{ 1: number }>;
  return Boolean(list.length);
}

export async function getConversationById(conversationId: string) {
  const [rows] = await pool.query(
    `
    SELECT id, type, title, owner_user_id AS ownerUserId, created_at AS createdAt
    FROM conversations
    WHERE id = ?
    LIMIT 1
    `,
    [conversationId]
  );

  const list = rows as Array<{
    id: string;
    type: ConversationType;
    title: string | null;
    ownerUserId: string | null;
    createdAt: string;
  }>;

  return list[0] ?? null;
}

export async function getConversationParticipants(
  conversationId: string
): Promise<ConversationParticipant[]> {
  const [rows] = await pool.query(
    `
    SELECT
      cp.user_id AS userId,
      u.username AS username,
      cp.role AS role,
      cp.joined_at AS joinedAt
    FROM conversation_participants cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.conversation_id = ?
    ORDER BY
      CASE cp.role
        WHEN 'owner' THEN 1
        WHEN 'admin' THEN 2
        ELSE 3
      END,
      u.username ASC
    `,
    [conversationId]
  );

  return rows as ConversationParticipant[];
}

export async function getUserRoleInConversation(
  userId: string,
  conversationId: string
): Promise<ParticipantRole | null> {
  const [rows] = await pool.query(
    `
    SELECT role
    FROM conversation_participants
    WHERE conversation_id = ? AND user_id = ?
    LIMIT 1
    `,
    [conversationId, userId]
  );

  const list = rows as Array<{ role: ParticipantRole }>;
  return list[0]?.role ?? null;
}

export async function addParticipantToConversation(
  conversationId: string,
  userId: string,
  role: ParticipantRole = 'member'
) {
  await pool.query(
    `
    INSERT IGNORE INTO conversation_participants (conversation_id, user_id, role)
    VALUES (?, ?, ?)
    `,
    [conversationId, userId, role]
  );

  await ensureConversationReadState(conversationId, userId);
}

export async function updateParticipantRole(
  conversationId: string,
  userId: string,
  role: ParticipantRole
) {
  await pool.query(
    `
    UPDATE conversation_participants
    SET role = ?
    WHERE conversation_id = ? AND user_id = ?
    `,
    [role, conversationId, userId]
  );
}

export async function ensureConversationReadState(conversationId: string, userId: string) {
  await pool.query(
    `
    INSERT IGNORE INTO conversation_reads (conversation_id, user_id, last_read_message_id, last_read_at)
    VALUES (?, ?, NULL, NULL)
    `,
    [conversationId, userId]
  );
}

export async function markConversationAsRead(conversationId: string, userId: string) {
  await ensureConversationReadState(conversationId, userId);

  const [rows] = await pool.query(
    `
    SELECT id, created_at
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [conversationId]
  );

  const list = rows as Array<{ id: string; created_at: string }>;
  const latest = list[0];

  if (!latest) {
    await pool.query(
      `
      UPDATE conversation_reads
      SET last_read_message_id = NULL,
          last_read_at = NOW()
      WHERE conversation_id = ? AND user_id = ?
      `,
      [conversationId, userId]
    );
    return;
  }

  await pool.query(
    `
    UPDATE conversation_reads
    SET last_read_message_id = ?,
        last_read_at = ?
    WHERE conversation_id = ? AND user_id = ?
    `,
    [latest.id, latest.created_at, conversationId, userId]
  );
}
