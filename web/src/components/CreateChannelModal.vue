<script setup lang="ts">
defineProps<{
  title: string;
}>();

const emit = defineEmits<{
  close: [];
  updateTitle: [value: string];
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
        width: 460px;
        max-width: calc(100vw - 40px);
        background: #17212b;
        border: 1px solid #22303d;
        border-radius: 18px;
        box-shadow: 0 20px 60px rgba(0,0,0,.35);
        overflow: hidden;
      "
    >
      <div class="tm-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div class="tm-panel-title">Создать канал</div>
          <div class="tm-muted" style="margin-top: 4px;">Введите название канала</div>
        </div>
        <button class="tm-icon-btn" @click="emit('close')">✕</button>
      </div>

      <div style="padding: 16px;">
        <input
          class="tm-input"
          :value="title"
          @input="emit('updateTitle', ($event.target as HTMLInputElement).value)"
          placeholder="Название канала"
        />
      </div>

      <div style="padding: 16px; display: flex; gap: 10px; border-top: 1px solid #22303d;">
        <button class="tm-secondary" style="flex: 1;" @click="emit('close')">Отмена</button>
        <button class="tm-primary" style="flex: 1;" @click="emit('submit')">Создать канал</button>
      </div>
    </div>
  </div>
</template>
