"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessage = createMessage;
exports.getMessagesByConversation = getMessagesByConversation;
exports.getMessagesAroundId = getMessagesAroundId;
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
async function getMessagesByConversation(conversationId, currentUserId, limit = 30, beforeCreatedAt, afterCreatedAt) {
    const [conversationRows] = await mysql_1.pool.query(`
    SELECT type
    FROM conversations
    WHERE id = ?
    LIMIT 1
    `, [conversationId]);
    const conversationList = conversationRows;
    const conversation = conversationList[0];
    const baseSelect = `
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
    let hasMoreOlder = false;
    let hasMoreNewer = false;
    let messages;
    if (afterCreatedAt) {
        // Load newer messages in ascending order
        let query = baseSelect + ` AND m.created_at > ? ORDER BY m.created_at ASC LIMIT ?`;
        params.push(afterCreatedAt);
        params.push(limit + 1);
        const [rows] = await mysql_1.pool.query(query, params);
        const rawRows = rows;
        hasMoreNewer = rawRows.length > limit;
        messages = rawRows.slice(0, limit).map(mapMessageRow);
    }
    else if (beforeCreatedAt) {
        // Load older messages in descending order, then reverse
        let query = baseSelect + ` AND m.created_at < ? ORDER BY m.created_at DESC LIMIT ?`;
        params.push(beforeCreatedAt);
        params.push(limit + 1);
        const [rows] = await mysql_1.pool.query(query, params);
        const rawRows = rows;
        hasMoreOlder = rawRows.length > limit;
        messages = rawRows.slice(0, limit).map(mapMessageRow).reverse();
    }
    else {
        // Load latest messages in descending order, then reverse
        let query = baseSelect + ` ORDER BY m.created_at DESC LIMIT ?`;
        params.push(limit + 1);
        const [rows] = await mysql_1.pool.query(query, params);
        const rawRows = rows;
        hasMoreOlder = rawRows.length > limit;
        hasMoreNewer = false;
        messages = rawRows.slice(0, limit).map(mapMessageRow).reverse();
    }
    const [readRows] = await mysql_1.pool.query(`
    SELECT
      cr.user_id AS userId,
      cr.last_read_at AS lastReadAt
    FROM conversation_reads cr
    WHERE cr.conversation_id = ?
    `, [conversationId]);
    const reads = readRows;
    const messagesWithRead = messages.map((message) => {
        if (message.userId !== currentUserId) {
            return { ...message, isRead: false };
        }
        const createdAt = new Date(message.createdAt).getTime();
        const otherReads = reads.filter((item) => item.userId !== currentUserId &&
            item.lastReadAt &&
            new Date(item.lastReadAt).getTime() >= createdAt);
        return { ...message, isRead: otherReads.length > 0 };
    });
    return { messages: messagesWithRead, hasMoreOlder, hasMoreNewer };
}
async function getMessagesAroundId(conversationId, currentUserId, messageId, count = 30) {
    // Get the target message
    const [targetRows] = await mysql_1.pool.query(`
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
    WHERE m.id = ? AND m.conversation_id = ?
    LIMIT 1
    `, [messageId, conversationId]);
    const targetList = targetRows;
    if (!targetList[0]) {
        return { messages: [], hasMoreOlder: false, hasMoreNewer: false };
    }
    const targetMessage = mapMessageRow(targetList[0]);
    const targetCreatedAt = targetMessage.createdAt;
    const baseSelect = `
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
    // Load messages before target
    const [olderRows] = await mysql_1.pool.query(baseSelect + ` AND m.created_at < ? ORDER BY m.created_at DESC LIMIT ?`, [conversationId, targetCreatedAt, count + 1]);
    const olderRaw = olderRows;
    const hasMoreOlder = olderRaw.length > count;
    const olderMessages = olderRaw.slice(0, count).map(mapMessageRow).reverse();
    // Load messages after target
    const [newerRows] = await mysql_1.pool.query(baseSelect + ` AND m.created_at > ? ORDER BY m.created_at ASC LIMIT ?`, [conversationId, targetCreatedAt, count + 1]);
    const newerRaw = newerRows;
    const hasMoreNewer = newerRaw.length > count;
    const newerMessages = newerRaw.slice(0, count).map(mapMessageRow);
    const allMessages = [...olderMessages, targetMessage, ...newerMessages];
    // Apply isRead logic
    const [readRows] = await mysql_1.pool.query(`
    SELECT
      cr.user_id AS userId,
      cr.last_read_at AS lastReadAt
    FROM conversation_reads cr
    WHERE cr.conversation_id = ?
    `, [conversationId]);
    const reads = readRows;
    const messagesWithRead = allMessages.map((message) => {
        if (message.userId !== currentUserId) {
            return { ...message, isRead: false };
        }
        const createdAt = new Date(message.createdAt).getTime();
        const otherReads = reads.filter((item) => item.userId !== currentUserId &&
            item.lastReadAt &&
            new Date(item.lastReadAt).getTime() >= createdAt);
        return { ...message, isRead: otherReads.length > 0 };
    });
    return { messages: messagesWithRead, hasMoreOlder, hasMoreNewer };
}
