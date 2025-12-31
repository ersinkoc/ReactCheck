# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2025-12-31

### Fixed

- SSL/HTTPS support: Browser now ignores certificate errors for self-signed certs
- Improved scan stability: Better signal handling for Windows and non-TTY environments
- TUI now properly detects TTY availability and falls back gracefully

## [1.1.1] - 2025-12-31

### Added

- Comprehensive documentation for TUI keyboard shortcuts
- Browser overlay documentation with toggle instructions
- Website documentation updates for WebUI and overlay features

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

- **Browser Overlay Enhancements**: Visual feedback for component renders
  - Flash effect with colored background on each render
  - Pulsing border highlight shows render boundaries
  - Render badges showing component name and count
  - Severity-based colors (critical=red, warning=yellow, healthy=green)
  - Toggle overlay on/off with `o` key in TUI
  - Console access via `__REACTCHECK__.toggleOverlay()`

- **TUI Keyboard Shortcuts**:
  - `o` - Toggle browser overlay on/off
  - `j/k` or arrows - Navigate component list
  - `Enter` - View component details
  - `f` - Show fix suggestions
  - `c` - Show render chain view
  - `r` - Generate report
  - `p` - Pause/resume scanning
  - `q` - Quit

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
