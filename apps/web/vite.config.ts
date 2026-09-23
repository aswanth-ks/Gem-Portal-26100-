import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// TODO: extend with env-driven proxy config once the gateway contract stabilizes.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
