import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: false,
  },
  // Shared snow plaza real-time server (npm run plaza)
  '/plaza-ws': {
    target: 'ws://127.0.0.1:3002',
    ws: true,
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: apiProxy,
  },
  preview: { proxy: apiProxy },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
