import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8010',
        changeOrigin: false,  // Host header'ı koru → FastAPI redirect'i proxy üzerinden yönlendirir
      },
      '/uploads': {
        target: 'http://localhost:8010',
        changeOrigin: false,
      },
    },
  },
})
