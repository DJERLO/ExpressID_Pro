import { defineConfig, loadEnv } from 'vite'; // 1. Added loadEnv here
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appUrl = env.VITE_APP_URL; // Example: http://localhost:5173 use .env file

  return {
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'favicon.svg',
          'favicon-96x96.png',
          'apple-touch-icon.png'
        ],
        manifest: {
          name: 'ExpressID Pro',
          short_name: 'ExpressID',
          description: 'Print-Ready ID Photo & Layout Engine',
          theme_color: '#090d16',
          background_color: '#090d16',
          display: 'standalone',
          icons: [
            {
              src: '/web-app-manifest-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/web-app-manifest-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/web-app-manifest-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          screenshots: [
            {
              src: '/screenshot1.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'ExpressID Pro Desktop Canvas & Photo Layout Engine'
            },
            {
              src: '/screenshot2.png',
              sizes: '428x928',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'ExpressID Pro Mobile View'
            },
            {
              src: '/screenshot3.png',
              sizes: '428x928',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'ExpressID Pro Mobile View'
            }
          ]
        },
        workbox: {
          // Include heavy files like WASM/ONNX if you want them available offline, 
          // though keep an eye on caching limits.
          globPatterns: [
            '**/*.{js,css,html,ico,png,svg,wasm,onnx,json,bin,data,woff,woff2}',
            'dist/**/*'
          ],
          maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
          
          // Crucial for SPA routing on Vercel so offline reloads don't hit 404s
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/],
          
          runtimeCaching: [
            {
              // Cache ExpressID models
              urlPattern: /\/dist\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'imgly-models-cache',
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
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
  };
});