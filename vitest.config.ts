import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/types/**/*.ts',
        'src/**/*.test.ts',
        'src/browser/**/*.ts', // Browser-only code, requires DOM environment
        'src/server/**/*.ts', // Server code, requires network/WebSocket
        'src/cli/tui/**/*.ts', // TUI code, requires terminal I/O
        'src/core/scanner.ts', // Integration layer, tested via e2e
        'src/cli/commands/scan.ts', // Integration layer, tested via e2e
      ],
      thresholds: {
        lines: 95,
        branches: 89,
        functions: 97,
        statements: 95,
      },
      all: true,
      clean: true,
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
