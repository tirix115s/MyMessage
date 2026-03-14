<script setup lang="ts">
type User = {
  id: string;
  username: string;
};

defineProps<{
  users: User[];
  title: string;
  selectedUserIds: string[];
}>();

const emit = defineEmits<{
  close: [];
  updateTitle: [value: string];
  toggleUser: [userId: string];
  submit: [];
}>();
</script>

<template>
  <div
    style="
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 80;
    "
  >
    <div
      style="
        width: 540px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 40px);
        overflow: hidden;
        background: #17212b;
        border: 1px solid #22303d;
        border-radius: 18px;
        box-shadow: 0 20px 60px rgba(0,0,0,.35);
        display: flex;
        flex-direction: column;
      "
    >
      <div class="tm-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div class="tm-panel-title">Создать группу</div>
          <div class="tm-muted" style="margin-top: 4px;">Выбери название и участников</div>
        </div>
        <button class="tm-icon-btn" @click="emit('close')">✕</button>
      </div>

      <div style="padding: 16px; overflow-y: auto;">
        <input
          class="tm-input"
          :value="title"
          @input="emit('updateTitle', ($event.target as HTMLInputElement).value)"
          placeholder="Название группы"
        />

        <div style="margin-top: 16px; font-weight: bold;">Участники</div>

        <div
          style="
            margin-top: 10px;
            max-height: 320px;
            overflow-y: auto;
            display: grid;
            gap: 10px;
          "
        >
          <label
            v-for="user in users"
            :key="user.id"
            style="
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 12px;
              border-radius: 12px;
              border: 1px solid #22303d;
              background: #101b27;
              cursor: pointer;
            "
          >
            <input
              type="checkbox"
              :checked="selectedUserIds.includes(user.id)"
              @change="emit('toggleUser', user.id)"
            />
            <span>{{ user.username }}</span>
          </label>
        </div>
      </div>

      <div style="padding: 16px; display: flex; gap: 10px; border-top: 1px solid #22303d;">
        <button class="tm-secondary" style="flex: 1;" @click="emit('close')">��тмена</button>
        <button class="tm-primary" style="flex: 1;" @click="emit('submit')">Создать группу</button>
      </div>
    </div>
  </div>
</template>
