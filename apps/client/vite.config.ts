import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: {
      '@dwexpense/types': fileURLToPath(new URL('../../libs/types/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 4200,
    host: 'localhost',
  },
});
