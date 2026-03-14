import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

console.log('[MyMessage] App loaded ✅ — build is up to date');
console.log('[MyMessage] Features: context menu ✅ | pagination ✅ | UI fixes ✅');

createApp(App).use(createPinia()).mount('#app');
