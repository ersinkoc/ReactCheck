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
        'src/webui/**/*.ts', // WebUI code, requires HTTP/WebSocket server
        'src/cli/interactive.ts', // Interactive wizard, requires terminal I/O
        'src/cli/index.ts', // CLI entry point, tested via e2e
        'src/index.ts', // Main entry with quickScan, tested via e2e
        'src/types.ts', // Type definitions only
      ],
      thresholds: {
        lines: 98,
        branches: 82,
        functions: 98,
        statements: 98,
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
