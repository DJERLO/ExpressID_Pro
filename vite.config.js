import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appUrl = env.VITE_APP_URL;

  return {
    build: {
      minify: 'oxc',
      // Ensure CSS is also minified
      cssMinify: true,
      cssCodeSplit: true,
      target: 'esnext',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          codeSplitting: true,
          // Split heavy libraries into separate vendor chunks so main thread isn't blocked
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@fontsource/material-symbols-outlined')) {
                return 'vendor-fonts';
              }
              if (id.includes('cropperjs')) {
                return 'vendor-cropper';
              }
              if (id.includes('jsPDF')) {
                return 'vendor-jspdf';
              }
              if (id.includes('jszip')) {
                return 'vendor-jszip';
              }
              if (id.includes('@imgly/background-removal')) {
                return 'vendor-background-removal';
              }
              if (id.includes('onnxruntime-web')) {
                return 'vendor-onnx';
              }
              return 'vendor-core';
            }
          },
        },
      },
    },
    esbuild: {
      treeShaking: true,
      target: 'esnext',
      drop: ['console', 'debugger'],
    },
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
          globPatterns: [
            '**/*.{js,css,html,ico,png,svg,wasm,onnx,json,bin,data,woff,woff2, webmanifest}',
            'dist/**/*'
          ],
          maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            {
              // Cache local font files served from /assets/
              urlPattern: /\/assets\/.*\.woff2$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'local-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            
            {
              // Lazy-cache model assets dynamically after user action
              urlPattern: /\.(?:wasm|onnx|bin|data)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'expressid-ai-models',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 60 // 60 Days
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
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  };
});