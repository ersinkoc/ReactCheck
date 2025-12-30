# ReactCheck - Task List

## Phase 1: Project Setup

### 1.1 Initialize Project Structure
- [ ] Create package.json with all metadata
- [ ] Create tsconfig.json with strict mode
- [ ] Create tsup.config.ts for building
- [ ] Create vitest.config.ts for testing
- [ ] Create .gitignore
- [ ] Create .prettierrc
- [ ] Create eslint.config.js
- [ ] Create directory structure

### 1.2 Create Type Definitions
- [ ] Create src/types.ts with all interfaces
- [ ] Create src/types/events.ts for event types
- [ ] Create src/types/config.ts for configuration types
- [ ] Create src/types/report.ts for report types

---

## Phase 2: Core Engine

### 2.1 Utilities (Foundation)
- [ ] Implement src/utils/colors.ts - ANSI color codes
- [ ] Implement src/utils/logger.ts - Logging utility
- [ ] Implement src/utils/format.ts - Number/time formatting
- [ ] Implement src/utils/fs.ts - File system helpers
- [ ] Implement src/utils/event-emitter.ts - Custom EventEmitter
- [ ] Write tests for all utilities (100% coverage)

### 2.2 Statistics Collector
- [ ] Implement src/core/stats.ts - Component statistics
- [ ] Implement severity calculation
- [ ] Implement snapshot generation
- [ ] Write tests (100% coverage)

### 2.3 Chain Analyzer
- [ ] Implement src/core/chain.ts - Render chain detection
- [ ] Implement window-based grouping algorithm
- [ ] Implement parent-child relationship tracking
- [ ] Implement root cause detection
- [ ] Write tests (100% coverage)

### 2.4 Fix Suggester
- [ ] Implement src/core/fix.ts - Fix suggestion engine
- [ ] Implement React.memo rule
- [ ] Implement useMemo rule
- [ ] Implement useCallback rule
- [ ] Implement context-split rule
- [ ] Implement state-colocation rule
- [ ] Implement component-extraction rule
- [ ] Implement code generation for suggestions
- [ ] Write tests (100% coverage)

### 2.5 Scanner Core
- [ ] Implement src/core/scanner.ts - Base scanner class
- [ ] Implement render info extraction
- [ ] Implement unnecessary render detection
- [ ] Implement FPS monitoring
- [ ] Write tests (100% coverage)

### 2.6 Fiber Utilities
- [ ] Implement src/core/fiber.ts - React Fiber helpers
- [ ] Implement Fiber tree walking
- [ ] Implement component name extraction
- [ ] Implement props/state comparison
- [ ] Write tests (100% coverage)

---

## Phase 3: CLI Implementation

### 3.1 Argument Parser
- [ ] Implement src/cli/args.ts - Command line parser
- [ ] Support positional arguments (URL)
- [ ] Support flags (--proxy, --tui, etc.)
- [ ] Support value flags (--format=html)
- [ ] Implement help text generation
- [ ] Write tests (100% coverage)

### 3.2 Configuration Loader
- [ ] Implement src/cli/config.ts - Config file loader
- [ ] Support JavaScript config files
- [ ] Support JSON config files
- [ ] Implement config merging
- [ ] Implement config validation
- [ ] Write tests (100% coverage)

### 3.3 Commands
- [ ] Implement src/cli/commands/scan.ts - Main scan command
- [ ] Implement src/cli/commands/init.ts - Config initialization
- [ ] Implement src/cli/commands/report.ts - Report command
- [ ] Write tests (100% coverage)

### 3.4 TUI Components
- [ ] Implement src/cli/tui/screen.ts - Screen buffer management
- [ ] Implement src/cli/tui/box.ts - Box drawing utility
- [ ] Implement src/cli/tui/list.ts - Scrollable list component
- [ ] Implement src/cli/tui/progress.ts - Progress bar component
- [ ] Implement src/cli/tui/input.ts - Keyboard input handling
- [ ] Write tests (100% coverage)

### 3.5 TUI Main
- [ ] Implement src/cli/tui/index.ts - Main TUI renderer
- [ ] Implement header section
- [ ] Implement component list section
- [ ] Implement details panel
- [ ] Implement footer with shortcuts
- [ ] Implement state management
- [ ] Write tests (100% coverage)

### 3.6 CLI Entry Point
- [ ] Implement src/cli/index.ts - CLI main class
- [ ] Implement command routing
- [ ] Implement error handling
- [ ] Implement graceful shutdown
- [ ] Write tests (100% coverage)

---

## Phase 4: Browser Modules

### 4.1 Browser Scanner
- [ ] Implement src/browser/scanner.ts - Browser-side scanner
- [ ] Implement React DevTools hook integration
- [ ] Implement fallback Fiber walker
- [ ] Implement render event emission
- [ ] Write tests (100% coverage)

### 4.2 Overlay
- [ ] Implement src/browser/overlay.ts - Visual overlay
- [ ] Implement highlight rendering
- [ ] Implement badge rendering
- [ ] Implement animation system
- [ ] Write tests (100% coverage)

### 4.3 Toolbar
- [ ] Implement src/browser/toolbar.ts - Floating toolbar
- [ ] Implement drag functionality
- [ ] Implement button controls
- [ ] Implement settings panel
- [ ] Write tests (100% coverage)

### 4.4 Injection Script
- [ ] Implement src/browser/inject.ts - Main injection script
- [ ] Implement WebSocket client
- [ ] Implement message protocol
- [ ] Implement shadow DOM setup
- [ ] Write tests (100% coverage)

---

## Phase 5: Server Modules

### 5.1 WebSocket Server
- [ ] Implement src/server/websocket.ts - WS server
- [ ] Implement HTTP upgrade handling
- [ ] Implement frame parsing
- [ ] Implement message encoding/decoding
- [ ] Implement client management
- [ ] Write tests (100% coverage)

### 5.2 Proxy Server
- [ ] Implement src/server/proxy.ts - HTTP proxy
- [ ] Implement request forwarding
- [ ] Implement HTML injection
- [ ] Implement HTTPS support
- [ ] Write tests (100% coverage)

### 5.3 Browser Launcher
- [ ] Implement src/server/browser.ts - Puppeteer wrapper
- [ ] Implement browser launch options
- [ ] Implement script injection
- [ ] Implement page navigation
- [ ] Implement cleanup
- [ ] Write tests (100% coverage)

---

## Phase 6: Report Generation

### 6.1 Report Core
- [ ] Implement src/report/index.ts - Report generator
- [ ] Implement data aggregation
- [ ] Implement format selection
- [ ] Write tests (100% coverage)

### 6.2 JSON Report
- [ ] Implement src/report/json.ts - JSON formatter
- [ ] Implement full data serialization
- [ ] Write tests (100% coverage)

### 6.3 Markdown Report
- [ ] Implement src/report/markdown.ts - Markdown formatter
- [ ] Implement summary table
- [ ] Implement code blocks
- [ ] Write tests (100% coverage)

### 6.4 HTML Report
- [ ] Implement src/report/html.ts - HTML formatter
- [ ] Implement template rendering
- [ ] Implement CSS styles (embedded)
- [ ] Implement JavaScript (embedded)
- [ ] Implement charts
- [ ] Write tests (100% coverage)

---

## Phase 7: Framework Detection

### 7.1 Detection Engine
- [ ] Implement src/detect/framework.ts - Framework detector
- [ ] Implement Next.js detection
- [ ] Implement Remix detection
- [ ] Implement Vite detection
- [ ] Implement CRA detection
- [ ] Implement Gatsby detection
- [ ] Write tests (100% coverage)

### 7.2 Framework Suggestions
- [ ] Implement src/detect/suggestions.ts - Framework-specific tips
- [ ] Implement Next.js tips
- [ ] Implement Remix tips
- [ ] Implement Vite tips
- [ ] Write tests (100% coverage)

---

## Phase 8: Main Entry Point

### 8.1 Main API
- [ ] Implement src/index.ts - Main export
- [ ] Implement ReactCheck class
- [ ] Implement event handling
- [ ] Implement session management
- [ ] Write tests (100% coverage)

---

## Phase 9: Integration Testing

### 9.1 CLI Integration Tests
- [ ] Test CLI argument parsing
- [ ] Test config file loading
- [ ] Test init command
- [ ] Test error handling

### 9.2 Communication Tests
- [ ] Test WebSocket protocol
- [ ] Test proxy injection
- [ ] Test browser communication

### 9.3 Report Tests
- [ ] Test HTML report validity
- [ ] Test JSON report schema
- [ ] Test Markdown formatting

---

## Phase 10: Documentation

### 10.1 README
- [ ] Write README.md with all sections
- [ ] Include installation instructions
- [ ] Include usage examples
- [ ] Include API reference
- [ ] Include configuration guide

### 10.2 CHANGELOG
- [ ] Create CHANGELOG.md
- [ ] Document initial features

### 10.3 Website
- [ ] Create website/index.html - Landing page
- [ ] Create website/docs/getting-started.html
- [ ] Create website/docs/cli-reference.html
- [ ] Create website/docs/api-reference.html
- [ ] Create website/docs/fix-suggestions.html
- [ ] Create website/docs/examples.html
- [ ] Create website/assets/styles.css
- [ ] Create website/assets/script.js

---

## Phase 11: Examples

### 11.1 Basic Example
- [ ] Create examples/basic/README.md

### 11.2 Next.js Example
- [ ] Create examples/nextjs/README.md

### 11.3 CI/CD Example
- [ ] Create examples/ci-cd/README.md

### 11.4 Programmatic Example
- [ ] Create examples/programmatic/index.ts

---

## Phase 12: Final Verification

### 12.1 Quality Checks
- [ ] Run full test suite
- [ ] Verify 100% coverage
- [ ] Run ESLint
- [ ] Run Prettier
- [ ] Run TypeScript compiler

### 12.2 Build Verification
- [ ] Build package
- [ ] Test npx execution
- [ ] Test package exports
- [ ] Test CLI binary

### 12.3 Documentation Review
- [ ] Review all documentation
- [ ] Test website locally
- [ ] Verify all links

---

## Task Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Core)
    ↓
Phase 3 (CLI) ←→ Phase 4 (Browser) ←→ Phase 5 (Server)
    ↓
Phase 6 (Reports)
    ↓
Phase 7 (Framework)
    ↓
Phase 8 (Main Entry)
    ↓
Phase 9 (Integration Tests)
    ↓
Phase 10 (Docs) + Phase 11 (Examples)
    ↓
Phase 12 (Verification)
```

---

## Estimated Task Count

- Phase 1: 8 tasks
- Phase 2: 24 tasks
- Phase 3: 24 tasks
- Phase 4: 16 tasks
- Phase 5: 12 tasks
- Phase 6: 12 tasks
- Phase 7: 8 tasks
- Phase 8: 4 tasks
- Phase 9: 8 tasks
- Phase 10: 12 tasks
- Phase 11: 4 tasks
- Phase 12: 8 tasks

**Total: 140 tasks**
