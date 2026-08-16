import { createApp } from 'vue';
import App from './App.vue';
import './styles/main.css';

if (import.meta.env.DEV) {
  // 内容配置校验仅开发期需要：动态导入让 zod 不进生产包
  // （静态导入会连带整库 ~45KB min 进首屏 bundle）
  void import('./config/schema').then(({ validateContent }) => {
    const issues = validateContent();
    if (issues.length) {
      console.warn('[VowelLab] 内容配置校验未通过：', issues);
    }
  });
}

createApp(App).mount('#app');
