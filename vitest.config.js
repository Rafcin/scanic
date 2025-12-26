import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js', 'test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.js'],
    },
  },
  resolve: {
    alias: {
      '../wasm_blur/pkg/wasm_blur.js': path.resolve(__dirname, 'tests/__mocks__/wasm_blur.js'),
    },
  },
});
