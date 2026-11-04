/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // Sin prefijo VITE_: no entra al bundle. Solo lo usa el proxy de desarrollo.
  const backendUrl = loadEnv(mode, process.cwd(), '').BACKEND_URL || 'http://localhost:8000'

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'favicon-32x32.png', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: 'TransLogix AI',
          short_name: 'TransLogix',
          description: 'Asistente de atención al cliente de TransLogix',
          lang: 'es-CO',
          theme_color: '#0f172a',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Solo se cachea el caparazón de la app: el asistente nunca responde sin conexión.
          navigateFallbackDenylist: [/^\/api\//],
          globIgnores: ['mockServiceWorker.js'],
        },
      }),
    ],
    server: {
      // 5173 fijo: es el origen que el backend permite por CORS por defecto.
      port: 5173,
      strictPort: true,
      // /api/v1/... → backend. Así en desarrollo no hay CORS de por medio.
      proxy: { '/api': { target: backendUrl, changeOrigin: true } },
    },
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
