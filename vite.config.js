import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,onnx}'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024
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