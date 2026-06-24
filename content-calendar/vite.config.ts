/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build-time env (no @types/node in this package, so declare what we read).
declare const process: { env: Record<string, string | undefined> };

// Vite + Vitest configuration.
// The same config powers the dev server (`npm run dev`) and the test runner
// (`npm test`) so the test environment matches production module resolution.
export default defineConfig({
  // The desktop app loads the built index.html from disk (file://), where
  // absolute asset paths like "/assets/..." resolve to the filesystem root and
  // fail (blank window). Build with VITE_DESKTOP=1 to emit relative paths.
  base: process.env.VITE_DESKTOP === '1' ? './' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: false,
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts'],
    },
  },
});
