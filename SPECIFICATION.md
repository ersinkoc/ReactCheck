# ReactCheck - Package Specification

## Overview

**Package Name:** `@oxog/react-check`
**Version:** 1.0.0
**License:** MIT
**Author:** ersinkoc
**Repository:** https://github.com/ersinkoc/reactcheck
**Documentation:** https://ersinkoc.github.io/reactcheck

ReactCheck is a zero-dependency CLI tool and runtime analyzer that detects performance bottlenecks in React applications. It provides actionable fix suggestions with copy-paste ready code snippets, visualizes render chains, and outputs results to browser overlay, terminal TUI, and exportable reports.

---

## Core Principles

### 1. Zero Dependencies
- No runtime dependencies allowed
- Only devDependencies for build, test, and tooling
- All functionality implemented from scratch

### 2. TypeScript Strict Mode
- Full strict mode enabled
- No implicit any
- Strict null checks
- Unchecked indexed access

### 3. 100% Test Coverage
- Every line tested
- Every branch tested
- All tests must pass

---

## Feature Specifications

### 1. Smart Scanner

The scanner runs in the browser and monitors React component renders in real-time.

**Capabilities:**
- Live render tracking with visual overlay
- Unnecessary render detection (component re-rendered but output unchanged)
- FPS monitoring with configurable thresholds
- Per-component render count tracking
- Render duration measurement in milliseconds
- Support for React 16+ (class and functional components)

**Technical Approach:**
- Hook into React DevTools global hook (`__REACT_DEVTOOLS_GLOBAL_HOOK__`)
- Intercept Fiber tree updates
- Track commit phases and render timings
- Communicate with CLI via WebSocket

**Scanner Events:**
```typescript
interface ScannerEvents {
  'render': (info: RenderInfo) => void;
  'unnecessary-render': (info: RenderInfo) => void;
  'fps-drop': (fps: number) => void;
  'component-mount': (name: string) => void;
  'component-unmount': (name: string) => void;
}
```

### 2. Render Chain Detective

Traces cascading renders to identify root causes.

**Capabilities:**
- Build component dependency tree
- Track state/prop change triggers
- Visualize render chains
- Identify root cause components
- Detect context-triggered mass re-renders

**Chain Analysis Algorithm:**
1. Monitor each render event with timestamp
2. Group renders within 16ms window (one frame)
3. Build parent-child relationships from Fiber tree
4. Trace back to find the originating state change
5. Calculate chain depth and total affected renders

**Output Format:**
```typescript
interface RenderChainInfo {
  trigger: string;        // e.g., 'UserContext.value'
  chain: string[];        // ['App', 'Layout', 'Sidebar', 'UserMenu']
  depth: number;          // 4
  totalRenders: number;   // 23
  rootCause: string;      // 'App'
  timestamp: number;
}
```

### 3. Fix Suggester

Rule-based system that analyzes render patterns and suggests optimizations.

**Supported Fix Types:**

| Fix Type | Trigger Condition | Solution |
|----------|-------------------|----------|
| `React.memo` | Component re-renders with unchanged props | Wrap with React.memo() |
| `useMemo` | Expensive computation in render | Memoize with useMemo() |
| `useCallback` | Function prop causes child re-renders | Stabilize with useCallback() |
| `context-split` | Context update triggers unrelated re-renders | Split context by concern |
| `state-colocation` | State too high in tree | Move state closer to usage |
| `component-extraction` | Part of component updates frequently | Extract to separate component |

**Suggestion Output:**
```typescript
interface FixSuggestion {
  componentName: string;
  severity: 'critical' | 'warning' | 'info';
  issue: string;
  cause: string;
  fix: FixType;
  codeBefore: string;
  codeAfter: string;
  explanation: string;
  impact: string;       // Expected improvement
}
```

**Severity Thresholds:**
- Critical: >50 renders or >100ms total render time
- Warning: >20 renders or >50ms total render time
- Info: Optimization opportunity detected

### 4. CLI Interface

Full-featured command-line interface with multiple modes.

**Commands:**

```
react-check <url> [options]     Main scan command
react-check init                Create default config file
react-check --version           Show version
react-check --help              Show help
```

**Scan Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--proxy` | Start proxy server for manual browser | false |
| `--tui` | Terminal UI only (no browser) | false |
| `--silent` | Headless mode for CI/CD | false |
| `--report` | Generate reports | false |
| `--format=<type>` | Report format: html, json, md, all | all |
| `--output=<dir>` | Report output directory | ./reactcheck-reports |
| `--fix` | Show fix suggestions | false |
| `--verbose` | Include detailed cause + full code | false |
| `--config=<path>` | Config file path | ./reactcheck.config.js |
| `--port=<number>` | WebSocket server port | 3099 |
| `--threshold-critical=<n>` | Critical threshold | 50 |
| `--threshold-warning=<n>` | Warning threshold | 20 |
| `--fps-threshold=<n>` | FPS drop threshold | 30 |

**Exit Codes:**
- 0: Success, no critical issues
- 1: Critical issues found
- 2: Configuration error
- 3: Connection error

### 5. Terminal TUI

Interactive terminal interface with real-time updates.

**Layout Sections:**
1. Header: Target URL, session duration, FPS
2. Critical Issues: Components with severe problems
3. Warnings: Components needing attention
4. Healthy: Components performing well
5. Footer: Keyboard shortcuts

**Keyboard Navigation:**
- `j/k` or `↑/↓`: Navigate list
- `Enter`: Expand component details
- `f`: Show fix suggestion for selected
- `c`: Show render chain for selected
- `r`: Generate report
- `p`: Pause/resume scanning
- `s`: Settings panel
- `q`: Quit

**Color Scheme:**
- Red (#ef4444): Critical issues
- Yellow (#eab308): Warnings
- Green (#22c55e): Healthy
- Blue (#3b82f6): Interactive elements
- Gray (#6b7280): Secondary text

**Update Frequency:**
- Stats update: 100ms
- UI redraw: 250ms
- Chain analysis: 500ms

### 6. Browser Overlay

Visual overlay injected into the target application.

**Features:**
- Render highlighting with colored borders
- Floating draggable toolbar
- Click-to-inspect component details
- Render count badges
- Animation speed control

**Highlight Colors:**
- Red border: Critical (>50 renders)
- Yellow border: Warning (>20 renders)
- Green border: Normal
- Gray border: Unnecessary render

**Toolbar Controls:**
- Play/Pause scanning
- Clear render counts
- Toggle highlights
- Animation speed: slow/fast/off
- Collapse/expand toolbar
- Settings

**Overlay Injection:**
- Create shadow DOM for isolation
- CSS variables for theming
- Non-blocking render loop
- Automatic cleanup on disconnect

### 7. Report Generator

Export session data in multiple formats.

**HTML Report:**
- Standalone single HTML file
- Embedded CSS and JavaScript
- Interactive collapsible sections
- Search/filter components
- Render timeline chart
- Component breakdown pie chart
- Dark theme with print styles
- Responsive design

**JSON Report:**
```typescript
interface JSONReport {
  version: string;
  generated: string;
  session: {
    url: string;
    duration: number;
    timestamp: string;
  };
  summary: {
    totalComponents: number;
    totalRenders: number;
    criticalIssues: number;
    warnings: number;
    healthy: number;
    avgFps: number;
  };
  components: ComponentStats[];
  chains: RenderChainInfo[];
  timeline: TimelineEvent[];
  framework: FrameworkInfo | null;
  suggestions: FixSuggestion[];
}
```

**Markdown Report:**
- GitHub-flavored markdown
- Summary table
- Issues by severity
- Code suggestions in fenced blocks
- Suitable for PR comments

### 8. Framework Detection

Automatically detect React meta-frameworks and provide specific suggestions.

**Supported Frameworks:**

| Framework | Detection Method | Specific Tips |
|-----------|------------------|---------------|
| Next.js | `next` in dependencies | RSC boundaries, use client directive, SSR hydration |
| Remix | `@remix-run/react` in deps | Loader optimization, action batching |
| Vite | `vite` in devDeps | HMR optimization, plugin config |
| Create React App | `react-scripts` in deps | Bundle analysis, eject considerations |
| Gatsby | `gatsby` in dependencies | Static generation, image optimization |

**Detection Output:**
```typescript
interface FrameworkInfo {
  name: string;
  version: string;
  features: string[];
  tips: string[];
}
```

---

## Configuration

### Config File Format

`reactcheck.config.js`:
```javascript
module.exports = {
  // Extend another config
  extends: './base.config.js',

  // Components to include (glob patterns)
  include: ['src/components/**/*'],

  // Components to exclude
  exclude: ['**/*.test.*', '**/node_modules/**'],

  // Severity thresholds
  thresholds: {
    critical: 50,
    warning: 20,
    fps: 30
  },

  // Report settings
  report: {
    formats: ['html', 'json'],
    output: './reports',
    includeSourceCode: true
  },

  // Custom rules
  rules: {
    'no-inline-functions': 'warn',
    'prefer-memo': 'error',
    'context-size': ['warn', { maxConsumers: 10 }]
  }
};
```

---

## Communication Protocol

### WebSocket Messages

**Browser → CLI:**
```typescript
type BrowserMessage =
  | { type: 'render'; payload: RenderInfo }
  | { type: 'chain'; payload: RenderChainInfo }
  | { type: 'fps'; payload: number }
  | { type: 'component-tree'; payload: ComponentNode[] }
  | { type: 'ready'; payload: { reactVersion: string } };
```

**CLI → Browser:**
```typescript
type CLIMessage =
  | { type: 'start' }
  | { type: 'stop' }
  | { type: 'reset' }
  | { type: 'config'; payload: ScannerConfig }
  | { type: 'highlight'; payload: { component: string; enabled: boolean } };
```

---

## Build Outputs

### Package Exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./scanner": {
      "import": "./dist/scanner.mjs",
      "require": "./dist/scanner.cjs",
      "types": "./dist/scanner.d.ts"
    },
    "./chain": {
      "import": "./dist/chain.mjs",
      "require": "./dist/chain.cjs",
      "types": "./dist/chain.d.ts"
    },
    "./fix": {
      "import": "./dist/fix.mjs",
      "require": "./dist/fix.cjs",
      "types": "./dist/fix.d.ts"
    }
  },
  "bin": {
    "react-check": "./dist/cli.mjs",
    "reactcheck": "./dist/cli.mjs"
  }
}
```

---

## Performance Requirements

- Scanner overhead: <5% CPU increase
- Memory usage: <50MB additional
- WebSocket latency: <10ms
- TUI refresh: 60fps capable
- Report generation: <2s for 1000 components

---

## Browser Compatibility

- Chrome 90+
- Firefox 90+
- Edge 90+
- Safari 15+ (limited Puppeteer support)

---

## Node.js Requirements

- Node.js 18+ (LTS)
- ES2022 features used
- Native fetch API

---

## Security Considerations

- No external network requests except target URL
- No telemetry or analytics
- No data collection
- Sandbox mode for Puppeteer
- CSP-compatible overlay injection

---

## Error Handling

### Error Types

```typescript
class ReactCheckError extends Error {
  code: ErrorCode;
  details?: unknown;
}

enum ErrorCode {
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  REACT_NOT_FOUND = 'REACT_NOT_FOUND',
  BROWSER_LAUNCH_FAILED = 'BROWSER_LAUNCH_FAILED',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  REPORT_WRITE_FAILED = 'REPORT_WRITE_FAILED'
}
```

---

## Version History Target

- 1.0.0: Initial release with all core features
- Future: VS Code extension, ESLint plugin, GitHub Action

---

## Success Criteria

1. `npx @oxog/react-check localhost:3000` works out of the box
2. Browser opens with render highlighting
3. TUI shows real-time stats
4. Fix suggestions are actionable
5. Reports are comprehensive
6. Zero runtime dependencies
7. 100% test coverage
8. TypeScript strict mode passes
9. Documentation site is complete
