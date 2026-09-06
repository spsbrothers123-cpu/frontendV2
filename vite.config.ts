import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Fixed so it always matches backend/.env's CORS_ORIGINS (localhost:5173).
    port: 5173,
    strictPort: true,
  },
})
