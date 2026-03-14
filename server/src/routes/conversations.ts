import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import {
  addParticipantToConversation,
  createChannelConversation,
  createDirectConversation,
  createGroupConversation,
  ensureUserInConversation,
  getConversationById,
  getConversationParticipants,
  getUserConversations,
  getUserRoleInConversation,
  markConversationAsRead,
  updateParticipantRole,
} from '../services/conversations';
import { getMessagesByConversation } from '../services/messages';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const conversations = await getUserConversations(req.user!.userId);
  return res.json({ conversations });
});

router.post('/direct', requireAuth, async (req, res) => {
  const schema = z.object({
    userId: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const result = await createDirectConversation(req.user!.userId, parsed.data.userId);
  return res.json(result);
});

router.post('/group', requireAuth, async (req, res) => {
  const schema = z.object({
    title: z.string().min(1).max(255),
    participantIds: z.array(z.string().min(1)).default([]),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const result = await createGroupConversation(
    req.user!.userId,
    parsed.data.title,
    parsed.data.participantIds
  );

  return res.json(result);
});

router.post('/channel', requireAuth, async (req, res) => {
  const schema = z.object({
    title: z.string().min(1).max(255),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const result = await createChannelConversation(req.user!.userId, parsed.data.title);
  return res.json(result);
});

router.get('/:id/messages', requireAuth, async (req, res) => {
  const rawId = req.params.id;
  const conversationId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId required' });
  }

  const allowed = await ensureUserInConversation(req.user!.userId, conversationId);

  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const beforeRaw = Array.isArray(req.query.before) ? req.query.before[0] : req.query.before;

  const limit = Math.min(Math.max(Number(limitRaw || 30), 1), 100);
  const before = beforeRaw ? String(beforeRaw) : undefined;

  const messages = await getMessagesByConversation(
    conversationId,
    req.user!.userId,
    limit,
    before
  );

  return res.json({
    messages,
    hasMore: messages.length === limit,
  });
});

router.post('/:id/read', requireAuth, async (req, res) => {
  const rawId = req.params.id;
  const conversationId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId required' });
  }

  const allowed = await ensureUserInConversation(req.user!.userId, conversationId);
  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await markConversationAsRead(conversationId, req.user!.userId);
  return res.json({ ok: true });
});

router.get('/:id/participants', requireAuth, async (req, res) => {
  const rawId = req.params.id;
  const conversationId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId required' });
  }

  const allowed = await ensureUserInConversation(req.user!.userId, conversationId);
  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const participants = await getConversationParticipants(conversationId);
  return res.json({ participants });
});

router.post('/:id/participants', requireAuth, async (req, res) => {
  const rawId = req.params.id;
  const conversationId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId required' });
  }

  const schema = z.object({
    userId: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const requesterRole = await getUserRoleInConversation(req.user!.userId, conversationId);

  if (conversation.type === 'direct') {
    return res.status(400).json({ error: 'Cannot add participants to direct conversation' });
  }

  if (requesterRole !== 'owner' && requesterRole !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await addParticipantToConversation(conversationId, parsed.data.userId, 'member');
  return res.json({ ok: true });
});

router.patch('/:id/participants/:userId', requireAuth, async (req, res) => {
  const rawConversationId = req.params.id;
  const rawTargetUserId = req.params.userId;

  const conversationId = Array.isArray(rawConversationId) ? rawConversationId[0] : rawConversationId;
  const targetUserId = Array.isArray(rawTargetUserId) ? rawTargetUserId[0] : rawTargetUserId;

  if (!conversationId || !targetUserId) {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const schema = z.object({
    role: z.enum(['owner', 'admin', 'member']),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  if (conversation.type === 'direct') {
    return res.status(400).json({ error: 'Direct conversation has no editable roles' });
  }

  const requesterRole = await getUserRoleInConversation(req.user!.userId, conversationId);

  if (requesterRole !== 'owner') {
    return res.status(403).json({ error: 'Only owner can change roles' });
  }

  await updateParticipantRole(conversationId, targetUserId, parsed.data.role);
  return res.json({ ok: true });
});

export default router;
