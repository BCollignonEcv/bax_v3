import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-64x64.png', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'BAX',
        short_name: 'BAX',
        description: 'Notre petit QG à deux.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F6F1EB',
        theme_color: '#F6F1EB',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Photos (URL signées) : la clé de cache ignore le jeton, qui change à chaque signature.
            urlPattern: ({ url }) => url.pathname.includes('/storage/v1/object/sign/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'bax-photos',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
              plugins: [
                {
                  cacheKeyWillBeUsed: async ({ request }) => {
                    const url = new URL(request.url)
                    url.search = ''
                    return url.href
                  },
                },
              ],
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
