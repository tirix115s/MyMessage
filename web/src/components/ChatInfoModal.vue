<script setup lang="ts">
type Conversation = {
  id: string;
  type: 'direct' | 'group' | 'channel';
  title: string | null;
};

type Participant = {
  userId: string;
  username: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
};

defineProps<{
  activeConversation: Conversation | null;
  participants: Participant[];
}>();

const emit = defineEmits<{
  close: [];
}>();

function label(conversation: Conversation | null) {
  if (!conversation) return 'Информация';
  return conversation.title || conversation.type;
}

function initials(value: string) {
  return value.trim().slice(0, 1).toUpperCase();
}

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

function typeLabel(type?: string) {
  if (type === 'direct') return 'Личный чат';
  if (type === 'group') return 'Группа';
  if (type === 'channel') return 'Канал';
  return 'Чат';
}
</script>

<template>
  <div
    style="
      position: fixed;
      inset: 0;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 60px;
      z-index: 80;
    "
  >
    <div
      style="
        width: 560px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 100px);
        overflow: hidden;
        background: linear-gradient(180deg, #1c2836 0%, #182431 100%);
        border: 1px solid #22303d;
        border-radius: 22px;
        box-shadow: 0 20px 60px rgba(0,0,0,.42);
        display: flex;
        flex-direction: column;
      "
    >
      <div class="tm-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div class="tm-avatar large">
            {{ initials(label(activeConversation)) }}
          </div>

          <div>
            <div style="font-size: 28px; font-weight: bold;">{{ label(activeConversation) }}</div>
            <div class="tm-muted" style="margin-top: 6px;">
              {{ participants.length }} участников · {{ typeLabel(activeConversation?.type) }}
            </div>
          </div>
        </div>

        <button class="tm-icon-btn" @click="emit('close')">✕</button>
      </div>

      <div style="padding: 16px; overflow-y: auto;">
        <div class="tm-info-card" style="margin: 0 0 14px 0;">
          <div class="tm-action-grid">
            <button class="tm-action-btn">Звук</button>
            <button class="tm-action-btn">Покинуть</button>
            <button class="tm-action-btn">Медиа</button>
            <button class="tm-action-btn">Ещё</button>
          </div>
        </div>

        <div class="tm-info-card" style="margin: 0 0 14px 0;">
          <div style="font-weight: bold; margin-bottom: 10px;">О чате</div>
          <div class="tm-muted" v-if="activeConversation?.type === 'direct'">
            Это личный диалог между двумя пользователями.
          </div>
          <div class="tm-muted" v-else-if="activeConversation?.type === 'group'">
            Это групповая беседа. Здесь позже можно добавить описание, invite link и настройки доступа.
          </div>
          <div class="tm-muted" v-else>
            Это канал. Обычные участники читают, а owner/admin публикуют сообщения.
          </div>
        </div>

        <div class="tm-info-card" style="margin: 0 0 14px 0;">
          <div style="font-weight: bold; margin-bottom: 10px;">Медиа и ссылки</div>
          <div class="tm-action-grid">
            <button class="tm-action-btn">428 фото</button>
            <button class="tm-action-btn">4 видео</button>
            <button class="tm-action-btn">48 ссылок</button>
            <button class="tm-action-btn">30 GIF</button>
          </div>
        </div>

        <div class="tm-info-card" style="margin: 0;">
          <div style="font-weight: bold; margin-bottom: 12px;">
            {{ activeConversation?.type === 'channel' ? 'Подписчики и админы' : 'Участники' }}
          </div>

          <div
            v-for="participant in participants"
            :key="participant.userId"
            style="
              display: flex;
              gap: 12px;
              padding: 12px 0;
              border-bottom: 1px solid #22303d;
            "
          >
            <div class="tm-avatar">
              {{ initials(participant.username) }}
            </div>

            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; gap: 12px;">
                <div>
                  <div style="font-weight: bold;">{{ participant.username }}</div>
                  <div class="tm-muted" style="margin-top: 4px; font-size: 12px;">
                    {{ formatTime(participant.joinedAt) }}
                  </div>
                </div>
                <div
                  v-if="activeConversation?.type !== 'direct'"
                  style="color: #7cc3ff; text-transform: capitalize;"
                >
                  {{ participant.role }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
