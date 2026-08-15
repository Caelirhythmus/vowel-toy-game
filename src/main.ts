import { createApp } from 'vue';
import App from './App.vue';
import { validateContent } from './config/schema';
import './styles/main.css';

if (import.meta.env.DEV) {
  const issues = validateContent();
  if (issues.length) {
    console.warn('[VowelLab] 内容配置校验未通过：', issues);
  }
}

createApp(App).mount('#app');
