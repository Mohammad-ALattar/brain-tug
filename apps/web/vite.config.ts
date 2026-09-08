import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Exposed on the LAN so a phone can join the dev server directly, which is
    // the only way to test the student pad on a real touch screen.
    host: true,
    /**
     * Proxy the socket to the game server so the client can talk to the page
     * origin in development exactly as it does in production. Without this the
     * dev setup would need a `VITE_SERVER_URL` in a `.env` file, and the two
     * environments would take different code paths for connecting.
     *
     * `ws: true` is the important part: Socket.IO upgrades to a websocket, and
     * without it the game silently falls back to long-polling and feels laggy.
     */
    proxy: {
      '/socket.io': {
        target: `http://localhost:${process.env.SERVER_PORT ?? 3001}`,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
