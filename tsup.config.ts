import { defineConfig } from 'tsup';

export default defineConfig([
  // Main library entry
  {
    entry: {
      index: 'src/index.ts',
      scanner: 'src/core/scanner.ts',
      chain: 'src/core/chain.ts',
      fix: 'src/core/fix.ts',
      detect: 'src/detect/framework.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    minify: false,
    external: ['puppeteer'],
  },
  // CLI binary
  {
    entry: {
      cli: 'src/cli/index.ts',
    },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    minify: false,
    external: ['puppeteer'],
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
  // Browser injection script (IIFE for browser)
  {
    entry: {
      'browser-inject': 'src/browser/inject.ts',
    },
    format: ['iife'],
    dts: false,
    sourcemap: false,
    splitting: false,
    treeshake: true,
    minify: true,
    globalName: 'ReactCheckInjector',
    platform: 'browser',
    target: 'es2020',
  },
]);
