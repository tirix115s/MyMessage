<script setup lang="ts">
type User = {
  id: string;
  username: string;
};

type Conversation = {
  id: string;
  type: 'direct' | 'group' | 'channel';
  title: string | null;
  lastMessageText: string | null;
  lastMessageCreatedAt?: string | null;
};

const props = defineProps<{
  users: User[];
  conversations: Conversation[];
  activeConversationId: string | null;
  searchQuery: string;
  unreadMap: Record<string, number>;
  onlineUserIds: string[];
}>();

const emit = defineEmits<{
  menu: [];
  search: [value: string];
  openDirect: [userId: string];
  openConversation: [conversationId: string];
}>();

function label(conversation: Conversation) {
  return conversation.title || conversation.type;
}

function isOnline(userId: string) {
  return props.onlineUserIds.includes(userId);
}

function initials(value: string) {
  return value.trim().slice(0, 1).toUpperCase();
}

function formatTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <aside class="tm-sidebar">
    <div class="tm-section" style="padding: 14px;">
      <div style="display: flex; gap: 10px; align-items: center;">
        <button class="tm-icon-btn" @click="emit('menu')">☰</button>
        <input
          class="tm-search"
          :value="searchQuery"
          @input="emit('search', ($event.target as HTMLInputElement).value)"
          placeholder="Поиск"
        />
      </div>
    </div>

    <div class="tm-section" style="padding: 12px 14px;">
      <div class="tm-muted" style="font-size: 13px; margin-bottom: 10px;">Быстрый старт ЛС</div>
      <div class="tm-scroll" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px;">
        <button
          v-for="user in users"
          :key="user.id"
          @click="emit('openDirect', user.id)"
          style="
            min-width: 84px;
            border: none;
            background: transparent;
            color: var(--text);
            text-align: center;
          "
        >
          <div style="position: relative; display: inline-flex;">
            <div class="tm-avatar">{{ initials(user.username) }}</div>
            <span :class="['tm-dot', { online: isOnline(user.id) }]" style="position: absolute; right: 2px; bottom: 2px;" />
          </div>
          <div style="margin-top: 8px; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            {{ user.username }}
          </div>
        </button>
      </div>
    </div>

    <div style="padding: 10px 14px 4px;">
      <div class="tm-muted" style="font-size: 13px;">Чаты</div>
    </div>

    <div class="tm-scroll" style="flex: 1; padding: 8px 10px 12px;">
      <button
        v-for="conversation in conversations"
        :key="conversation.id"
        :class="['tm-chat-list-item', { active: activeConversationId === conversation.id }]"
        @click="emit('openConversation', conversation.id)"
      >
        <div style="display: flex; gap: 12px; align-items: center;">
          <div class="tm-avatar">
            {{ initials(label(conversation)) }}
          </div>

          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center;">
              <div style="font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                {{ label(conversation) }}
              </div>
              <div class="tm-muted" style="font-size: 12px; flex: 0 0 auto;">
                {{ formatTime(conversation.lastMessageCreatedAt) }}
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; gap: 10px; margin-top: 6px; align-items: center;">
              <div
                class="tm-muted"
                style="
                  font-size: 12px;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  min-width: 0;
                "
              >
                {{ conversation.lastMessageText || 'Нет сообщений' }}
              </div>

              <span v-if="(unreadMap[conversation.id] || 0) > 0" class="tm-badge">
                {{ unreadMap[conversation.id] }}
              </span>
            </div>
          </div>
        </div>
      </button>
    </div>
  </aside>
</template>
