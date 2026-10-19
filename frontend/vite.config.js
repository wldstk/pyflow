import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Keep REACT_APP_* working so existing .env files need no changes.
  envPrefix: ['VITE_', 'REACT_APP_'],
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  preview: {
    port: 3000,
  },
  build: {
    outDir: 'build',
  },
});
