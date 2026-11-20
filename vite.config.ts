import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  test: {
    clearMocks: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    passWithNoTests: false,
    reporters: ['default'],
  },
});
