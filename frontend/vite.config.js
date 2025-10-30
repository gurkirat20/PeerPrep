import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://172.20.10.2:3001',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'https://172.20.10.2:3001',
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
    https:{
      key: fs.readFileSync(path.join(__dirname, '172.20.10.2+1-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, '172.20.10.2+1.pem')),
    }
  },
})
