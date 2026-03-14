"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessage = createMessage;
exports.getMessagesByConversation = getMessagesByConversation;
const uuid_1 = require("uuid");
const mysql_1 = require("../db/mysql");
function mapMessageRow(row) {
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
async function createMessage(conversationId, userId, text, replyToMessageId) {
    const id = (0, uuid_1.v4)();
    let validReplyToMessageId = null;
    if (replyToMessageId) {
        const [replyRows] = await mysql_1.pool.query(`
      SELECT id
      FROM messages
      WHERE id = ? AND conversation_id = ?
      LIMIT 1
      `, [replyToMessageId, conversationId]);
        const replyList = replyRows;
        if (replyList[0]) {
            validReplyToMessageId = replyList[0].id;
        }
    }
    await mysql_1.pool.query(`
    INSERT INTO messages (id, conversation_id, user_id, text, reply_to_message_id)
    VALUES (?, ?, ?, ?, ?)
    `, [id, conversationId, userId, text, validReplyToMessageId]);
    const [rows] = await mysql_1.pool.query(`
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
    `, [id]);
    const list = rows;
    return {
        ...mapMessageRow(list[0]),
        isRead: false,
    };
}
async function getMessagesByConversation(conversationId, currentUserId, limit = 30, beforeCreatedAt) {
    const [conversationRows] = await mysql_1.pool.query(`
    SELECT type
    FROM conversations
    WHERE id = ?
    LIMIT 1
    `, [conversationId]);
    const conversationList = conversationRows;
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
    const params = [conversationId];
    if (beforeCreatedAt) {
        query += ` AND m.created_at < ? `;
        params.push(beforeCreatedAt);
    }
    query += `
    ORDER BY m.created_at DESC
    LIMIT ?
  `;
    params.push(limit);
    const [rows] = await mysql_1.pool.query(query, params);
    let messages = rows.map(mapMessageRow);
    messages = messages.reverse();
    const [readRows] = await mysql_1.pool.query(`
    SELECT
      cr.user_id AS userId,
      cr.last_read_at AS lastReadAt
    FROM conversation_reads cr
    WHERE cr.conversation_id = ?
    `, [conversationId]);
    const reads = readRows;
    return messages.map((message) => {
        if (message.userId !== currentUserId) {
            return {
                ...message,
                isRead: false,
            };
        }
        const createdAt = new Date(message.createdAt).getTime();
        const otherReads = reads.filter((item) => item.userId !== currentUserId &&
            item.lastReadAt &&
            new Date(item.lastReadAt).getTime() >= createdAt);
        let isRead = false;
        if (conversation?.type === 'direct') {
            isRead = otherReads.length > 0;
        }
        else {
            isRead = otherReads.length > 0;
        }
        return {
            ...message,
            isRead,
        };
    });
}
