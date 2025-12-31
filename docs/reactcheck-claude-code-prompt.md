# ReactCheck - Zero-Dependency NPM Package

## Package Identity

- **NPM Package**: `@oxog/react-check`
- **GitHub Repository**: `https://github.com/ersinkoc/reactcheck`
- **Documentation Site**: `https://ersinkoc.github.io/reactcheck`
- **License**: MIT
- **Author**: ersinkoc

**NO social media, Discord, email, or external links.**

## Package Description

Scan, diagnose, and fix React performance issues.

ReactCheck is a powerful CLI tool and runtime analyzer that detects performance bottlenecks in React applications. Unlike basic profilers that only show problems, ReactCheck provides actionable fix suggestions with copy-paste ready code snippets. It visualizes render chains to show exactly which component triggered which re-render, and outputs results simultaneously to browser overlay, interactive terminal TUI, and exportable reports.

---

## NON-NEGOTIABLE RULES

These rules are ABSOLUTE and must be followed without exception:

### 1. ZERO DEPENDENCIES
```json
{
  "dependencies": {}  // MUST BE EMPTY - NO EXCEPTIONS
}
```
Implement EVERYTHING from scratch. No runtime dependencies allowed.

**Allowed devDependencies only:**
```json
{
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "tsup": "^8.0.0",
    "@types/node": "^20.0.0",
    "prettier": "^3.0.0",
    "eslint": "^9.0.0",
    "puppeteer": "^23.0.0"
  }
}
```

Note: Puppeteer is a devDependency for the CLI browser automation feature. The core analysis engine must work without it.

### 2. 100% TEST COVERAGE
- Every line of code must be tested
- Every branch must be tested
- All tests must pass (100% success rate)
- Use Vitest for testing

### 3. DEVELOPMENT WORKFLOW
Create these documents FIRST, before any code:
1. **SPECIFICATION.md** - Complete package specification
2. **IMPLEMENTATION.md** - Architecture and design decisions
3. **TASKS.md** - Ordered task list with dependencies

Only after these documents are complete, implement the code following TASKS.md sequentially.

### 4. TYPESCRIPT STRICT MODE
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 5. NO EXTERNAL LINKS
- ❌ No social media (Twitter, LinkedIn, etc.)
- ❌ No Discord/Slack links
- ❌ No email addresses
- ❌ No donation/sponsor links
- ✅ Only GitHub repo and GitHub Pages allowed

---

## CORE FEATURES

### 1. Smart Scanner
Real-time performance monitoring that runs in the browser and communicates with the CLI.

**Capabilities:**
- Live render tracking with visual overlay (highlight components on render)
- Unnecessary render detection (component re-rendered but DOM unchanged)
- FPS drop alerts with threshold configuration
- Per-component render count tracking
- Render duration measurement (ms)

**API Example:**
```typescript
// Browser injection script (auto-injected by CLI)
import { ReactCheckScanner } from '@oxog/react-check/scanner';

const scanner = new ReactCheckScanner({
  onRender: (component, renderInfo) => {
    // Send to CLI via WebSocket
  },
  trackUnnecessary: true,
  fpsThreshold: 30,
  highlightRenders: true,
  animationSpeed: 'fast'
});

scanner.start();
```

### 2. Render Chain Detective
Traces the cascade of renders to find the root cause.

**Capabilities:**
- Build dependency tree of component relationships
- Track which state/prop change triggered the chain
- Visualize chain: `Button → Card → List → App`
- Identify the "root cause" component
- Detect context-triggered mass re-renders

**API Example:**
```typescript
import { RenderChain } from '@oxog/react-check/chain';

const chain = new RenderChain();

chain.onChainDetected((chainInfo) => {
  console.log(chainInfo);
  // {
  //   trigger: 'UserContext.value',
  //   chain: ['App', 'Layout', 'Sidebar', 'UserMenu', 'Avatar'],
  //   depth: 5,
  //   totalRenders: 23,
  //   rootCause: 'App'
  // }
});
```

### 3. Fix Suggester
AI-like rule-based system that suggests specific fixes with code.

**Supported Fix Types:**
- `React.memo()` for unnecessary re-renders
- `useMemo()` for expensive computations
- `useCallback()` for function prop stability
- Context splitting for over-subscribed contexts
- State colocation suggestions
- Component extraction recommendations

**API Example:**
```typescript
import { FixSuggester } from '@oxog/react-check/fix';

const suggester = new FixSuggester();

const suggestion = suggester.analyze({
  componentName: 'ProductCard',
  renderCount: 127,
  expectedRenders: 12,
  propsChanged: false,
  stateChanged: false,
  parentRerendered: true
});

// Returns:
// {
//   severity: 'critical',
//   issue: 'Unnecessary re-renders due to parent updates',
//   fix: 'React.memo',
//   cause: 'Parent component "ProductList" re-renders on every state change',
//   codeBefore: 'export function ProductCard({ product }) { ... }',
//   codeAfter: 'export const ProductCard = React.memo(function ProductCard({ product }) { ... })',
//   explanation: 'React.memo will skip re-rendering when props are unchanged'
// }
```

### 4. CLI Interface
Full-featured command-line interface with multiple modes.

**Commands:**
```bash
# Basic usage - opens browser, starts scanning
npx @oxog/react-check localhost:3000
npx @oxog/react-check https://myapp.dev

# Proxy mode - inject into your own browser
npx @oxog/react-check localhost:3000 --proxy
# → Starts proxy on port 3001, open localhost:3001 in your browser

# Output modes
npx @oxog/react-check localhost:3000 --tui        # Terminal UI only
npx @oxog/react-check localhost:3000 --silent     # Headless (CI/CD)

# Reporting
npx @oxog/react-check localhost:3000 --report                    # Generate all formats
npx @oxog/react-check localhost:3000 --report --format=html      # HTML only
npx @oxog/react-check localhost:3000 --report --format=json      # JSON only  
npx @oxog/react-check localhost:3000 --report --format=md        # Markdown only
npx @oxog/react-check localhost:3000 --report --output=./reports # Custom output dir

# Fix suggestions
npx @oxog/react-check localhost:3000 --fix                # Show fix suggestions
npx @oxog/react-check localhost:3000 --fix --verbose      # Include cause + full code

# Configuration
npx @oxog/react-check localhost:3000 --config ./reactcheck.config.js
npx @oxog/react-check init  # Create default config file
```

### 5. Terminal TUI
Interactive terminal interface with real-time updates.

**Features:**
- Live render count per component (sorted by severity)
- FPS meter
- Render chain visualization (tree view)
- Fix suggestions panel
- Keyboard navigation (j/k to scroll, Enter to expand, q to quit)
- Color-coded severity (🔴 Critical, 🟡 Warning, 🟢 Healthy)

**Layout:**
```
┌─ ReactCheck ──────────────────────────────────────────────────────┐
│ Target: localhost:3000 | Session: 2m 34s | FPS: 58              │
├───────────────────────────────────────────────────────────────────┤
│ 🔴 CRITICAL (3)                                                   │
│ ├── ProductCard          127 renders  (expected: 12)    [Enter]  │
│ ├── SearchInput           89 renders  (debounce needed) [Enter]  │
│ └── CartTotal             67 renders  (context issue)   [Enter]  │
│                                                                   │
│ 🟡 WARNING (8)                                                    │
│ ├── Header                23 renders                             │
│ ├── Navigation            19 renders                             │
│ └── ... 6 more                                                   │
│                                                                   │
│ 🟢 HEALTHY (36)                                                   │
│ └── 36 components performing well                                │
├───────────────────────────────────────────────────────────────────┤
│ [j/k] Navigate  [Enter] Expand  [f] Fix  [c] Chain  [r] Report  │
│ [p] Pause       [s] Settings    [q] Quit                         │
└───────────────────────────────────────────────────────────────────┘
```

### 6. Browser Overlay
Visual overlay injected into the target application.

**Features:**
- Highlight renders with colored outlines
  - 🔴 Red: Critical (>50 renders)
  - 🟡 Yellow: Warning (>20 renders)
  - 🟢 Green: Normal
  - ⚪ Gray: Unnecessary render
- Floating toolbar (draggable, collapsible)
- Click component to see details
- Render count badges on components
- Animation speed control (slow/fast/off)

### 7. Report Generator
Export session data in multiple formats.

**HTML Report:**
- Beautiful, standalone HTML file
- Interactive (collapsible sections, search)
- Charts (render timeline, component breakdown)
- Dark theme
- Print-friendly

**JSON Report:**
```json
{
  "session": {
    "url": "localhost:3000",
    "duration": 154000,
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "summary": {
    "totalComponents": 47,
    "totalRenders": 1247,
    "criticalIssues": 3,
    "warnings": 8,
    "healthy": 36
  },
  "components": [
    {
      "name": "ProductCard",
      "renders": 127,
      "expectedRenders": 12,
      "severity": "critical",
      "fix": {
        "type": "React.memo",
        "code": "..."
      },
      "chain": ["App", "ProductList", "ProductCard"]
    }
  ]
}
```

**Markdown Report:**
```markdown
# ReactCheck Report

**URL:** localhost:3000  
**Duration:** 2m 34s  
**Date:** 2024-01-15

## Summary
- Total Components: 47
- Total Renders: 1,247
- Critical Issues: 3
- Warnings: 8

## Critical Issues

### ProductCard (127 renders)
- **Expected:** 12 renders
- **Cause:** Parent re-renders propagating
- **Fix:** Add React.memo()
...
```

### 8. Framework Detection
Automatically detect and provide framework-specific suggestions.

**Supported Frameworks:**
- **Next.js** → SSR hydration tips, RSC optimization, use client boundaries
- **Remix** → Loader optimization, action batching
- **Vite** → HMR optimization, plugin suggestions
- **CRA** → Bundle analysis tips
- **Gatsby** → Static generation optimization

**Detection:**
```typescript
import { detectFramework } from '@oxog/react-check/detect';

const framework = detectFramework('./package.json');
// { name: 'next', version: '14.0.0', features: ['app-router', 'rsc'] }
```

---

## API DESIGN

### Main Export
```typescript
// Programmatic API (for integration)
import { ReactCheck } from '@oxog/react-check';

const checker = new ReactCheck({
  target: 'localhost:3000',
  mode: 'browser', // 'browser' | 'proxy' | 'headless'
  fix: true,
  report: {
    enabled: true,
    formats: ['html', 'json', 'md'],
    output: './reports'
  },
  tui: true,
  overlay: {
    enabled: true,
    highlightRenders: true,
    animationSpeed: 'fast'
  },
  thresholds: {
    critical: 50,
    warning: 20,
    fps: 30
  }
});

// Start scanning
await checker.start();

// Listen to events
checker.on('render', (data) => { ... });
checker.on('chain', (data) => { ... });
checker.on('fix', (suggestion) => { ... });
checker.on('fps-drop', (fps) => { ... });

// Get current state
const snapshot = checker.getSnapshot();

// Generate report
const report = await checker.generateReport();

// Stop
await checker.stop();
```

### Type Definitions
```typescript
// Core types
export interface RenderInfo {
  componentName: string;
  renderCount: number;
  renderTime: number; // ms
  phase: 'mount' | 'update';
  necessary: boolean;
  timestamp: number;
}

export interface RenderChainInfo {
  trigger: string; // What caused the chain
  chain: string[]; // Component names in order
  depth: number;
  totalRenders: number;
  rootCause: string;
}

export interface FixSuggestion {
  componentName: string;
  severity: 'critical' | 'warning' | 'info';
  issue: string;
  cause: string;
  fix: FixType;
  codeBefore: string;
  codeAfter: string;
  explanation: string;
}

export type FixType = 
  | 'React.memo'
  | 'useMemo'
  | 'useCallback'
  | 'context-split'
  | 'state-colocation'
  | 'component-extraction';

export interface ComponentStats {
  name: string;
  renders: number;
  expectedRenders: number;
  avgRenderTime: number;
  maxRenderTime: number;
  unnecessary: number;
  severity: 'critical' | 'warning' | 'healthy';
  chain: string[];
  fixes: FixSuggestion[];
}

export interface SessionReport {
  session: SessionInfo;
  summary: SessionSummary;
  components: ComponentStats[];
  chains: RenderChainInfo[];
  timeline: TimelineEvent[];
  framework: FrameworkInfo | null;
}

export interface ReactCheckOptions {
  target: string;
  mode: 'browser' | 'proxy' | 'headless';
  fix: boolean;
  verbose: boolean;
  report: ReportOptions;
  tui: boolean;
  overlay: OverlayOptions;
  thresholds: ThresholdOptions;
  framework: FrameworkOptions;
}

// CLI configuration file
export interface ReactCheckConfig {
  extends?: string;
  include?: string[];
  exclude?: string[];
  thresholds?: ThresholdOptions;
  report?: ReportOptions;
  rules?: RuleOptions;
}
```

### CLI Binary
```typescript
// bin/react-check.ts
#!/usr/bin/env node

import { CLI } from '../src/cli';

const cli = new CLI(process.argv.slice(2));
cli.run();
```

---

## TECHNICAL REQUIREMENTS

- **Runtime**: Node.js (CLI) + Browser (scanner injection)
- **Module Format**: ESM + CJS (dual package)
- **Node.js Version**: >= 18
- **React Support**: 16+ (class and functional components)
- **TypeScript Version**: >= 5.0
- **Browser Support**: Chrome, Firefox, Edge (Chromium-based preferred for Puppeteer)

---

## PROJECT STRUCTURE

```
reactcheck/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── types.ts                 # Type definitions
│   ├── cli/
│   │   ├── index.ts             # CLI entry
│   │   ├── commands/
│   │   │   ├── scan.ts          # Main scan command
│   │   │   ├── init.ts          # Config initialization
│   │   │   └── report.ts        # Report generation
│   │   ├── tui/
│   │   │   ├── index.ts         # TUI renderer
│   │   │   ├── components/      # TUI components
│   │   │   └── input.ts         # Keyboard handling
│   │   └── args.ts              # Argument parser
│   ├── core/
│   │   ├── scanner.ts           # React scanner engine
│   │   ├── chain.ts             # Render chain analyzer
│   │   ├── fix.ts               # Fix suggester
│   │   ├── stats.ts             # Statistics collector
│   │   └── fiber.ts             # React Fiber utilities
│   ├── browser/
│   │   ├── inject.ts            # Browser injection script
│   │   ├── overlay.ts           # Visual overlay
│   │   ├── toolbar.ts           # Floating toolbar
│   │   └── highlight.ts         # Render highlighting
│   ├── server/
│   │   ├── proxy.ts             # Proxy server
│   │   ├── websocket.ts         # WebSocket communication
│   │   └── browser.ts           # Puppeteer launcher
│   ├── report/
│   │   ├── index.ts             # Report generator
│   │   ├── html.ts              # HTML report
│   │   ├── json.ts              # JSON report
│   │   ├── markdown.ts          # Markdown report
│   │   └── templates/           # HTML templates
│   ├── detect/
│   │   ├── framework.ts         # Framework detection
│   │   └── suggestions.ts       # Framework-specific tips
│   └── utils/
│       ├── logger.ts            # Logging utility
│       ├── colors.ts            # Terminal colors
│       ├── fs.ts                # File system helpers
│       └── format.ts            # Formatting utilities
├── tests/
│   ├── unit/
│   │   ├── scanner.test.ts
│   │   ├── chain.test.ts
│   │   ├── fix.test.ts
│   │   └── ...
│   ├── integration/
│   │   ├── cli.test.ts
│   │   ├── proxy.test.ts
│   │   └── report.test.ts
│   └── fixtures/
│       ├── react-app/           # Test React app
│       └── mock-data/
├── examples/
│   ├── basic/
│   │   └── README.md
│   ├── nextjs/
│   │   └── README.md
│   ├── ci-cd/
│   │   └── README.md
│   └── programmatic/
│       └── index.ts
├── website/                     # GitHub Pages documentation
│   ├── index.html
│   ├── docs/
│   │   ├── getting-started.html
│   │   ├── api/
│   │   ├── examples/
│   │   └── playground/
│   └── assets/
├── SPECIFICATION.md
├── IMPLEMENTATION.md
├── TASKS.md
├── README.md
├── CHANGELOG.md
├── LICENSE
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── .gitignore
```

---

## DOCUMENTATION WEBSITE

Build a complete documentation site in `/website` using:
- **Tailwind CSS** (via CDN)
- **Alpine.js** (via CDN)
- **Prism.js** for syntax highlighting

### Required Pages:
1. **Landing page** - Hero with terminal animation, feature highlights, quick install
2. **Getting Started** - Installation, first scan, understanding output
3. **CLI Reference** - All commands and flags documented
4. **API Reference** - Programmatic API documentation
5. **Fix Suggestions** - All fix types explained with examples
6. **Examples** - Next.js, Remix, Vite, CI/CD integration
7. **Playground** - Interactive demo (if possible with mock data)

### Design:
- Dark theme (matches terminal aesthetic)
- Terminal-style code blocks
- Animated terminal demo on landing page
- Copy-to-clipboard for all commands
- Mobile responsive

### Color Palette:
```css
--bg-primary: #0a0a0a;
--bg-secondary: #141414;
--accent-red: #ef4444;      /* Critical */
--accent-yellow: #eab308;   /* Warning */
--accent-green: #22c55e;    /* Healthy */
--accent-blue: #3b82f6;     /* Links/Actions */
```

---

## IMPLEMENTATION CHECKLIST

Before starting implementation:
- [ ] Create SPECIFICATION.md with complete package spec
- [ ] Create IMPLEMENTATION.md with architecture design
- [ ] Create TASKS.md with ordered task list

During implementation:
- [ ] Follow TASKS.md sequentially
- [ ] Maintain 100% test coverage throughout
- [ ] Write JSDoc for all public APIs
- [ ] Create examples for each feature

Before completion:
- [ ] All tests passing (100% success)
- [ ] Coverage report shows 100%
- [ ] README.md complete with all sections
- [ ] CHANGELOG.md initialized
- [ ] Website functional and deployed
- [ ] Package builds without errors
- [ ] CLI works: `npx @oxog/react-check localhost:3000`

---

## COMPETITION ANALYSIS

ReactCheck improves upon React Scan in these ways:

| Feature | React Scan | ReactCheck |
|---------|------------|------------|
| Render detection | ✅ | ✅ |
| Unnecessary render tracking | ✅ (with overhead warning) | ✅ (optimized) |
| **Fix suggestions** | ❌ | ✅ with code snippets |
| **Render chain analysis** | ❌ | ✅ root cause detection |
| **Terminal TUI** | ❌ | ✅ interactive |
| Browser overlay | ✅ | ✅ enhanced |
| **Multi-format reports** | ❌ | ✅ HTML/JSON/MD |
| **Framework detection** | ❌ | ✅ specific tips |
| CI/CD mode | Limited | ✅ --silent + exit codes |
| Proxy mode | ❌ | ✅ use your own browser |

---

## BEGIN IMPLEMENTATION

Start by creating SPECIFICATION.md with the complete package specification based on the features and API design above. Then proceed with IMPLEMENTATION.md and TASKS.md before writing any actual code.

Remember: This package will be published to NPM. It must be production-ready, zero-dependency, fully tested, and professionally documented.

**Target outcome:** When a developer runs `npx @oxog/react-check localhost:3000`, they should:
1. See a browser open with their app
2. See real-time render highlights as they interact
3. See a beautiful TUI in their terminal with live stats
4. Get actionable fix suggestions with copy-paste code
5. Generate a comprehensive report when done

Make ReactCheck the go-to tool for React performance debugging.
