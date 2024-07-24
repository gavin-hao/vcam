import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
// import { ipcMain } from 'electron'
import fs from 'fs';
import path from 'node:path';
import 'element-plus/dist/index.css';
createApp(App)
  .mount('#app')
  .$nextTick(() => {
    // Use contextBridge
    window.ipcRenderer.on('main-process-message', (_event, message) => {
      console.log(message, 9999);
    });
  });
