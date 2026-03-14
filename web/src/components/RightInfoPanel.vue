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

type User = {
  id: string;
  username: string;
};

const props = defineProps<{
  activeConversation: Conversation | null;
  participants: Participant[];
  availableUsersToAdd: User[];
  selectedParticipantToAdd: string;
  canManageParticipants: boolean;
  canChangeRoles: boolean;
  currentUsername: string;
}>();

const emit = defineEmits<{
  close: [];
  updateSelectedParticipant: [value: string];
  addParticipant: [];
  changeRole: [userId: string, role: 'owner' | 'admin' | 'member'];
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
  <aside class="tm-info">
    <div class="tm-header" style="display: flex; align-items: center; justify-content: space-between;">
      <div>
        <div class="tm-panel-title">Информация</div>
        <div class="tm-muted" style="margin-top: 4px;">{{ label(activeConversation) }}</div>
      </div>
      <button class="tm-icon-btn" @click="emit('close')">✕</button>
    </div>

    <div v-if="activeConversation" class="tm-scroll" style="flex: 1;">
      <div class="tm-info-card" style="text-align: center;">
        <div class="tm-avatar large" style="margin: 0 auto;">
          {{ initials(label(activeConversation)) }}
        </div>
        <div style="margin-top: 12px; font-size: 20px; font-weight: bold;">
          {{ label(activeConversation) }}
        </div>
        <div class="tm-muted" style="margin-top: 6px;">
          {{ typeLabel(activeConversation.type) }} · {{ participants.length }} участников
        </div>
      </div>

      <div class="tm-info-card">
        <div style="font-weight: bold; margin-bottom: 10px;">Быстрые действия</div>
        <div class="tm-action-grid">
          <button class="tm-action-btn">Закрепить</button>
          <button class="tm-action-btn">Отключить звук</button>
          <button class="tm-action-btn">Медиа</button>
          <button class="tm-action-btn">Ссылки</button>
        </div>
      </div>

      <div v-if="activeConversation.type === 'direct'" class="tm-info-card">
        <div style="font-weight: bold; margin-bottom: 10px;">О личном чате</div>
        <div class="tm-muted">
          Личный диалог между двумя пользователями. Управление ролями и добавление участников здесь недоступно.
        </div>
      </div>

      <div v-if="activeConversation.type !== 'direct'" class="tm-info-card">
        <div style="font-weight: bold; margin-bottom: 10px;">Правила доступа</div>
        <div class="tm-muted" v-if="activeConversation.type === 'group'">
          В группе участники могут писать сообщения. Owner/admin могут управлять составом участников.
        </div>
        <div class="tm-muted" v-else>
          В канале обычные участники читают сообщения, а owner/admin могут публиковать посты.
        </div>
      </div>

      <div
        v-if="activeConversation.type !== 'direct' && canManageParticipants"
        class="tm-info-card"
      >
        <div style="font-weight: bold; margin-bottom: 10px;">Добавить участника</div>
        <select
          class="tm-input"
          :value="selectedParticipantToAdd"
          @change="emit('updateSelectedParticipant', ($event.target as HTMLSelectElement).value)"
          style="margin-bottom: 8px;"
        >
          <option value="">Выбери пользователя</option>
          <option
            v-for="user in availableUsersToAdd"
            :key="user.id"
            :value="user.id"
          >
            {{ user.username }}
          </option>
        </select>

        <button class="tm-secondary" style="width: 100%;" @click="emit('addParticipant')">
          Добавить
        </button>
      </div>

      <div
        v-else-if="activeConversation.type !== 'direct'"
        class="tm-info-card"
      >
        <div style="font-weight: bold; margin-bottom: 10px;">Управление участниками</div>
        <div class="tm-muted">
          У тебя нет прав на добавление участников в этот чат.
        </div>
      </div>

      <div class="tm-info-card">
        <div style="font-weight: bold; margin-bottom: 12px;">
          {{ activeConversation.type === 'channel' ? 'Подписчики и админы' : 'Участники' }}
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

          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; gap: 12px; align-items: start;">
              <div>
                <div style="font-weight: bold;">
                  {{ participant.username }}
                  <span
                    v-if="participant.username === currentUsername"
                    class="tm-muted"
                    style="font-weight: normal;"
                  >
                    (ты)
                  </span>
                </div>
                <div class="tm-muted" style="margin-top: 4px; font-size: 12px;">
                  {{ formatTime(participant.joinedAt) }}
                </div>
              </div>

              <div style="color: #7cc3ff; text-transform: capitalize; font-size: 13px;">
                {{ participant.role }}
              </div>
            </div>

            <select
              v-if="activeConversation.type !== 'direct' && canChangeRoles"
              class="tm-input"
              :value="participant.role"
              @change="emit('changeRole', participant.userId, ($event.target as HTMLSelectElement).value as 'owner' | 'admin' | 'member')"
              style="margin-top: 10px;"
            >
              <option value="owner">owner</option>
              <option value="admin">admin</option>
              <option value="member">member</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="tm-scroll" style="flex: 1; padding: 16px;">
      <div class="tm-muted">Выбери чат, чтобы увидеть детали.</div>
    </div>
  </aside>
</template>
