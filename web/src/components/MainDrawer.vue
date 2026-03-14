<script setup lang="ts">
defineProps<{
  currentUsername: string;
}>();

const emit = defineEmits<{
  close: [];
  createGroup: [];
  createChannel: [];
  logout: [];
}>();
</script>

<template>
  <div class="tm-drawer">
    <div class="tm-section" style="padding: 24px 20px;">
      <div style="font-size: 22px; font-weight: bold;">{{ currentUsername }}</div>
      <div class="tm-muted" style="margin-top: 6px;">MyMessage Desktop</div>
    </div>

    <div style="padding: 10px;">
      <button class="tm-card-btn" @click="emit('createGroup')">Создать группу</button>
      <button class="tm-card-btn" @click="emit('createChannel')">Создать канал</button>
      <button class="tm-card-btn">Контакты</button>
      <button class="tm-card-btn">Избранное</button>
      <button class="tm-card-btn">Настройки</button>
    </div>

    <div style="margin-top: auto; padding: 10px;">
      <button class="tm-card-btn" @click="emit('logout')" style="color: #ffb7c5;">Выйти</button>
      <button class="tm-card-btn" @click="emit('close')">Закрыть</button>
    </div>
  </div>
</template>
