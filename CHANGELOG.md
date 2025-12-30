# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-31

### Added

- **WebUI Dashboard**: Real-time web-based dashboard for monitoring React performance
  - Live updating summary cards (components, renders, FPS, issues)
  - Sortable/filterable component list with severity indicators
  - Real-time render events stream
  - Render chain visualization
  - WebSocket-based live updates
  - Auto-opens in default browser
  - `--webui` flag to enable dashboard
  - `--webui-port` option for custom port (default: 3100)

- **Demo Scripts**: Added npm scripts for running demo React app
  - `npm run demo` - Install and start demo app
  - `npm run demo:dev` - Start demo development server
  - `npm run demo:scan` - Build and scan demo app with TUI
  - `npm run demo:scan:webui` - Build and scan demo app with WebUI

### Fixed

- TUI now correctly displays real-time data via data provider pattern
- Force full screen redraws for proper TUI updates

## [1.0.2] - 2025-12-30

### Fixed

- Install React DevTools hook before React loads for proper detection

## [1.0.1] - 2025-12-30

### Fixed

- Check listener count before emitting specific key events

## [1.0.0] - 2025-12-30

### Added

- Initial release
- Real-time render detection via React DevTools hook
- Render chain analysis for cascade effect detection
- Fix suggestions (memo, useMemo, useCallback, context splitting)
- Multiple report formats (HTML, JSON, Markdown)
- Framework detection (Next.js, Remix, Vite, CRA, Gatsby)
- Interactive TUI for terminal-based monitoring
- Browser overlay for visual component statistics
- Zero-dependency core functionality
- CLI commands: scan, report, detect
