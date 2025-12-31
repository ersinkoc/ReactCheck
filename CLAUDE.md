# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReactCheck (`@oxog/react-check`) is a zero-dependency React performance scanning tool that detects unnecessary component re-renders, traces render chains to identify root causes, and provides actionable fix suggestions. It offers TUI, WebUI dashboard, and browser overlay interfaces.

## Build & Development Commands

```bash
npm run build           # Build all outputs (lib + CLI + browser inject)
npm run dev             # Watch mode during development
npm run test            # Run tests once
npm run test:watch      # Watch mode for tests
npm run test:coverage   # Coverage report (95%+ required)
npm run lint            # ESLint static analysis
npm run lint:fix        # Auto-fix lint issues
npm run typecheck       # TypeScript strict mode check
npm run demo            # Start demo app + scanner
npm run demo:scan       # Scan demo with TUI
npm run demo:scan:webui # Scan demo with WebUI
```

## Architecture

### Core Modules (`src/core/`)
- **scanner.ts**: Main render tracking engine, extends EventEmitter, coordinates StatsCollector, ChainAnalyzer, and FixSuggester
- **chain.ts**: Render chain detection with 16ms window (one frame at 60fps), groups renders and traces cascades to root triggers
- **fix.ts**: Rule-based fix suggestion engine (React.memo, useMemo, useCallback, context-split, state-colocation, component-extraction)
- **fiber.ts**: React fiber tree utilities for accessing internals, walking trees, and detecting component changes
- **stats.ts**: Per-component performance statistics collector

### Browser Injection (`src/browser/`)
- **inject.ts**: IIFE entry point for browser-side code
- **scanner.ts**: BrowserScanner using React DevTools hook with fiber tree walking fallback
- **overlay.ts**: Shadow DOM visual overlay with flash effects, render badges, severity coloring

### CLI (`src/cli/`)
- **commands/scan.ts**: Main scan command with Puppeteer browser control
- **tui/**: Terminal UI components (screen, list, input, box drawing)
- **args.ts**: Argument parsing, **config.ts**: Config file loading

### Server (`src/server/`)
- **websocket.ts**: WebSocket server for CLI-browser communication
- **browser.ts**: Puppeteer wrapper (BrowserLauncher) with auto-install
- **proxy.ts**: HTTP proxy for script injection

### Reports (`src/report/`)
- HTML (interactive dashboard), JSON (machine-readable), Markdown (GitHub-friendly)

### WebUI (`src/webui/`)
- HTTP + WebSocket server with HTML dashboard template generation

## Key Types (src/types.ts)

- `RenderInfo`: Single component render details
- `RenderChainInfo`: Cascade of renders with root cause
- `ComponentStats`: Per-component metrics
- `SessionReport`: Complete scan results
- `BrowserMessage` / `CLIMessage`: WebSocket protocol

## Development Constraints

- **Zero runtime dependencies** - All functionality implemented from scratch
- **TypeScript strict mode** required
- **95%+ test coverage** required (browser code excluded from metrics)
- **No `any` types** in production code

## Build Outputs

- `dist/index.js` & `dist/index.cjs` - Main library (CJS/ESM)
- `dist/cli.js` - CLI binary
- `dist/browser-inject.js` - Browser IIFE injection script

## Implementation Notes

- Puppeteer auto-installs if missing, then restarts the process
- Primary render detection via React DevTools global hook, falls back to direct fiber tree walking
- Renders are batched (size: 10, delay: 100ms) to reduce WebSocket message frequency
- Configuration via `.reactcheckrc.json` files
