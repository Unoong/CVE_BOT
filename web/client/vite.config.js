import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // 외부 접근 허용
    port: 3001,       // Caddy가 3000 사용 → Vite는 3001
    strictPort: true,
    // Caddy(3000) 뒤에서 HMR: 브라우저는 wss://도메인:3000 으로 접속,
    // Vite 서버는 3001에서만 listen (공인 IP:3000 bind 금지 → EADDRNOTAVAIL 방지)
    hmr: {
      protocol: 'wss',
      host: 'www.ds-aiplatform.com',
      clientPort: 3000,
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
