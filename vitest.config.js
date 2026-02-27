import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Enable jsdom environment for DOM testing
    environment: 'jsdom',

    // Global test setup
    setupFiles: ['./tests/setup.js'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
        'scorecards/_template.html',
        'icons/',
        'shared/pwa.js', // Tested via E2E
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // Test file patterns
    include: ['tests/**/*.test.js'],

    // Watch mode configuration
    watch: false, // Set to true for watch mode

    // Global test timeout
    testTimeout: 10000,

    // Reporters
    reporters: ['verbose'],
  },
});
