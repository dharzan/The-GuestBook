import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/message': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/voice-message': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/voice-messages': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
