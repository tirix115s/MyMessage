import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/mysql';

export type MessageReplySnippet = {
  id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
  isRead?: boolean;
  replyTo: MessageReplySnippet | null;
};

type MessageRow = {
  id: string;
  conversationId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
  replyToId: string | null;
  replyToUserId: string | null;
  replyToUsername: string | null;
  replyToText: string | null;
  replyToCreatedAt: string | null;
};

function mapMessageRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    userId: row.userId,
    username: row.username,
    text: row.text,
    createdAt: row.createdAt,
    replyTo: row.replyToId
      ? {
          id: row.replyToId,
          userId: row.replyToUserId || '',
          username: row.replyToUsername || 'Unknown',
          text: row.replyToText || '',
          createdAt: row.replyToCreatedAt || row.createdAt,
        }
      : null,
  };
}

export async function createMessage(
  conversationId: string,
  userId: string,
  text: string,
  replyToMessageId?: string | null
): Promise<ChatMessage> {
  const id = uuidv4();

  let validReplyToMessageId: string | null = null;

  if (replyToMessageId) {
    const [replyRows] = await pool.query(
      `
      SELECT id
      FROM messages
      WHERE id = ? AND conversation_id = ?
      LIMIT 1
      `,
      [replyToMessageId, conversationId]
    );

    const replyList = replyRows as Array<{ id: string }>;
    if (replyList[0]) {
      validReplyToMessageId = replyList[0].id;
    }
  }

  await pool.query(
    `
    INSERT INTO messages (id, conversation_id, user_id, text, reply_to_message_id)
    VALUES (?, ?, ?, ?, ?)
    `,
    [id, conversationId, userId, text, validReplyToMessageId]
  );

  const [rows] = await pool.query(
    `
    SELECT
      m.id,
      m.conversation_id AS conversationId,
      m.user_id AS userId,
      u.username AS username,
      m.text,
      m.created_at AS createdAt,
      rm.id AS replyToId,
      rm.user_id AS replyToUserId,
      ru.username AS replyToUsername,
      rm.text AS replyToText,
      rm.created_at AS replyToCreatedAt
    FROM messages m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN messages rm ON rm.id = m.reply_to_message_id
    LEFT JOIN users ru ON ru.id = rm.user_id
    WHERE m.id = ?
    LIMIT 1
    `,
    [id]
  );

  const list = rows as MessageRow[];
  return {
    ...mapMessageRow(list[0]),
    isRead: false,
  };
}

export async function getMessagesByConversation(
  conversationId: string,
  currentUserId: string,
  limit = 30,
  beforeCreatedAt?: string
): Promise<ChatMessage[]> {
  const [conversationRows] = await pool.query(
    `
    SELECT type
    FROM conversations
    WHERE id = ?
    LIMIT 1
    `,
    [conversationId]
  );

  const conversationList = conversationRows as Array<{ type: 'direct' | 'group' | 'channel' }>;
  const conversation = conversationList[0];

  let query = `
    SELECT
      m.id,
      m.conversation_id AS conversationId,
      m.user_id AS userId,
      u.username AS username,
      m.text,
      m.created_at AS createdAt,
      rm.id AS replyToId,
      rm.user_id AS replyToUserId,
      ru.username AS replyToUsername,
      rm.text AS replyToText,
      rm.created_at AS replyToCreatedAt
    FROM messages m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN messages rm ON rm.id = m.reply_to_message_id
    LEFT JOIN users ru ON ru.id = rm.user_id
    WHERE m.conversation_id = ?
  `;

  const params: Array<string | number> = [conversationId];

  if (beforeCreatedAt) {
    query += ` AND m.created_at < ? `;
    params.push(beforeCreatedAt);
  }

  query += `
    ORDER BY m.created_at DESC
    LIMIT ?
  `;
  params.push(limit);

  const [rows] = await pool.query(query, params);
  let messages = (rows as MessageRow[]).map(mapMessageRow);

  messages = messages.reverse();

  const [readRows] = await pool.query(
    `
    SELECT
      cr.user_id AS userId,
      cr.last_read_at AS lastReadAt
    FROM conversation_reads cr
    WHERE cr.conversation_id = ?
    `,
    [conversationId]
  );

  const reads = readRows as Array<{ userId: string; lastReadAt: string | null }>;

  return messages.map((message) => {
    if (message.userId !== currentUserId) {
      return {
        ...message,
        isRead: false,
      };
    }

    const createdAt = new Date(message.createdAt).getTime();

    const otherReads = reads.filter(
      (item) =>
        item.userId !== currentUserId &&
        item.lastReadAt &&
        new Date(item.lastReadAt).getTime() >= createdAt
    );

    let isRead = false;

    if (conversation?.type === 'direct') {
      isRead = otherReads.length > 0;
    } else {
      isRead = otherReads.length > 0;
    }

    return {
      ...message,
      isRead,
    };
  });
}
