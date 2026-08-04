import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'ExpressID Pro',
        short_name: 'ExpressID',
        description: 'Print-Ready ID Photo & Layout Engine',
        theme_color: '#090d16',
        background_color: '#090d16',
        display: 'standalone',
        // icons: [
        //   {
        //     src: '/pwa-192x192.png',
        //     sizes: '192x192',
        //     type: 'image/png'
        //   },
        //   {
        //     src: '/pwa-512x512.png',
        //     sizes: '512x512',
        //     type: 'image/png'
        //   }
        // ]
      },
      workbox: {
        // Include heavy files like WASM/ONNX if you want them available offline, 
        // though keep an eye on caching limits.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,onnx,json}'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
        
        // Crucial for SPA routing on Vercel so offline reloads don't hit 404s
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        
        runtimeCaching: [
          {
            // Cache external assets or fonts if any
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    headers: {
      // Enables SharedArrayBuffer so WASM can use multi-threading across CPU cores
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});