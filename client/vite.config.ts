import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@data': fileURLToPath(new URL('../shared/data', import.meta.url)) },
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    proxy: { '/api': 'http://localhost:8080' },
  },
  test: { include: ['src/**/*.test.ts'] },
});
