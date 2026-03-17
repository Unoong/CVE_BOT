import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Windows CMD QuickEdit Mode 비활성화 (클릭 시 멈춤 현상 방지)
if (process.platform === 'win32') {
  try {
    const { exec } = require('child_process');
    exec('mode con: cols=120 lines=30', () => {});
  } catch (e) {}
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // 외부 접근 허용
    port: 3001,       // Caddy가 3000 사용 → Vite는 3001
    strictPort: true,
    hmr: {
      protocol: 'wss',
      host: 'www.ds-aiplatform.com',
      port: 3000
    },
    proxy: {
      '/api': {
        target: 'http://localhost:32577',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
