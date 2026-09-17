import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// A standalone build (npm run build:standalone) drops the service worker so the
// bundle can be dropped onto any static host or preview sandbox as plain files.
const standalone = process.env.VITE_TARGET === 'standalone';

export default defineConfig({
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    ...(standalone ? [] : [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Punch Receipt',
        short_name: 'Punch',
        description: 'Punch holes through your photos and print them as a receipt.',
        theme_color: '#1a1a1a',
        background_color: '#f4f1ea',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    })]),
  ],
  server: { host: true, port: 5173 },
});
