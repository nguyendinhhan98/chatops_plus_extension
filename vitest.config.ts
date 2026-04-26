import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Allow .js imports to resolve .ts files (ESM Node16 pattern)
    extensions: ['.ts', '.js'],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
