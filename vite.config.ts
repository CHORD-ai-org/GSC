import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // changeOrigin:false keeps the browser Host so the API's same-origin
      // check (O1-7) sees Origin === Host and allows the dev frontend.
      '/api': { target: 'http://127.0.0.1:8788', changeOrigin: false },
    },
  },
  build: {
    outDir: 'dist',
  },
});
