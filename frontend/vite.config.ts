import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // Während der Entwicklung leitet Vite alle /api-Anfragen an das Deno-Backend weiter.
    // Für den Browser ist es derselbe Ursprung, deshalb ist kein CORS nötig.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
