# ReactCheck

A zero-dependency React performance scanner that detects unnecessary re-renders, analyzes render chains, and provides actionable fix suggestions.

## Features

- **Real-time Render Detection**: Monitor React component renders in real-time via React DevTools hook
- **Render Chain Analysis**: Trace cascade effects and identify root causes of performance issues
- **Fix Suggestions**: Get actionable code suggestions (memo, useMemo, useCallback, context splitting)
- **Multiple Report Formats**: Export reports as HTML, JSON, or Markdown
- **Framework Detection**: Automatic detection and framework-specific tips for Next.js, Remix, Vite, CRA, Gatsby
- **Interactive TUI**: Terminal-based UI for real-time monitoring
- **WebUI Dashboard**: Real-time web dashboard with live updates
- **Browser Overlay**: Visual overlay showing component render statistics
- **Zero Dependencies**: Core functionality has no external dependencies

## Installation

```bash
npm install @oxog/react-check
```

For CLI usage with browser automation:

```bash
npm install @oxog/react-check puppeteer
```

## Quick Start

### CLI Usage

Scan a React application:

```bash
npx react-check scan http://localhost:3000
```

With options:

```bash
npx react-check scan http://localhost:3000 \
  --duration 60000 \
  --output ./reports \
  --format html,json \
  --headless
```

With WebUI dashboard:

```bash
npx react-check scan http://localhost:3000 --webui
```

WebUI + custom port:

```bash
npx react-check scan http://localhost:3000 --webui --webui-port 8080
```

### Programmatic Usage

```typescript
import { createScanner, generateHTMLReport } from '@oxog/react-check';

// Create a scanner instance
const scanner = createScanner({
  thresholds: { critical: 50, warning: 20 },
  include: ['MyComponent*'],
  exclude: ['DebugPanel'],
});

// Listen for render events
scanner.on('render', (info) => {
  console.log(`${info.componentName} rendered in ${info.renderTime}ms`);
});

// Start scanning
scanner.start();

// Later: get report and generate HTML
const report = scanner.getReport();
const html = generateHTMLReport(report);
```

### Quick Scan API

```typescript
import { quickScan } from '@oxog/react-check';

const report = await quickScan('http://localhost:3000', {
  duration: 30000,
  headless: true,
  output: './reports',
  formats: ['html', 'json'],
});

console.log(`Found ${report.summary.criticalIssues} critical issues`);
```

## CLI Commands

### `scan <url>`

Scan a React application for performance issues.

```bash
react-check scan <url> [options]

Options:
  -d, --duration <ms>     Scan duration in milliseconds (default: 30000)
  -o, --output <dir>      Output directory for reports
  -f, --format <formats>  Report formats: html,json,md (default: html,json)
  -t, --threshold <n>     Render count threshold for warnings (default: 20)
  -c, --critical <n>      Render count threshold for critical (default: 50)
  --headless              Run browser in headless mode
  --include <patterns>    Component patterns to include
  --exclude <patterns>    Component patterns to exclude
  --no-tui                Disable TUI, use simple output
  -W, --webui             Enable WebUI dashboard
  --webui-port <port>     WebUI dashboard port (default: 3100)
```

### `report <input>`

Generate reports from a JSON scan result.

```bash
react-check report scan-results.json --format html,md --output ./reports
```

### `detect [path]`

Detect the React framework in use.

```bash
react-check detect ./my-react-app
```

## Demo

Run the included demo React app to test ReactCheck:

```bash
# Start demo app (runs on http://localhost:5173)
npm run demo

# In another terminal, scan with TUI
npm run demo:scan

# Or scan with WebUI dashboard
npm run demo:scan:webui
```

## WebUI Dashboard

The WebUI dashboard provides a real-time web interface for monitoring React performance:

- **Live Summary**: Components, renders, FPS, and issue counts update in real-time
- **Component List**: Sortable and filterable table with severity indicators
- **Render Events**: Live stream of render events as they occur
- **Render Chains**: Visualization of cascade render chains
- **Auto-open**: Dashboard opens automatically in your default browser

```bash
# Enable WebUI alongside TUI
react-check scan http://localhost:3000 --webui

# Custom WebUI port
react-check scan http://localhost:3000 --webui --webui-port 8080

# WebUI only (no TUI)
react-check scan http://localhost:3000 --webui --silent
```

## Report Formats

### HTML Report

Interactive HTML report with:
- Summary dashboard
- Component performance table with sorting
- Render chain visualization
- Fix suggestions with code examples

### JSON Report

Machine-readable JSON format:

```json
{
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:30:00Z",
  "summary": {
    "totalComponents": 42,
    "totalRenders": 1250,
    "criticalIssues": 3,
    "warnings": 8,
    "healthy": 31
  },
  "components": [...],
  "chains": [...],
  "suggestions": [...]
}
```

### Markdown Report

GitHub-friendly Markdown report suitable for issue tracking or documentation.

## Configuration

### Scanner Options

```typescript
interface ScannerConfig {
  // Render count thresholds
  thresholds: {
    warning: number;   // Default: 20
    critical: number;  // Default: 50
  };
  // Component name patterns to include
  include?: string[];
  // Component name patterns to exclude
  exclude?: string[];
  // Enable render chain analysis
  chainAnalysis?: boolean;
  // Window size for render grouping (ms)
  windowSize?: number;
}
```

### Fix Categories

ReactCheck provides fix suggestions in these categories:

- **React.memo**: Wrap components that receive stable props
- **useMemo**: Memoize expensive computed values
- **useCallback**: Memoize callback functions passed to children
- **Context Splitting**: Split large contexts to reduce re-render scope
- **State Colocation**: Move state closer to where it's used

## API Reference

### Core Classes

#### `Scanner`

Main scanning engine.

```typescript
const scanner = new Scanner(config);
scanner.on('render', handler);
scanner.on('chain', handler);
scanner.on('fps-drop', handler);
scanner.start();
scanner.stop();
const report = scanner.getReport();
```

#### `ChainAnalyzer`

Analyzes render chains and cascade effects.

```typescript
const analyzer = new ChainAnalyzer({ windowSize: 100 });
analyzer.addRender(renderInfo, parentName);
const chains = analyzer.getChains();
```

#### `FixSuggester`

Generates fix suggestions based on component statistics.

```typescript
const suggester = new FixSuggester();
const suggestions = suggester.analyze(componentStats);
```

### Utility Functions

```typescript
// Report generation
generateHTMLReport(report);
generateJSONReport(report);
generateMarkdownReport(report);

// Framework detection
detectFramework(packageJsonPath?);
detectFrameworkFromWindow(window);
getFrameworkTips(framework);

// Formatting utilities
formatDuration(ms);
formatBytes(bytes);
formatPercent(value);
formatRenderTime(ms);
```

## Browser Integration

### Manual Injection

```typescript
import { BrowserScanner, Overlay } from '@oxog/react-check';

const scanner = new BrowserScanner(window, config);
const overlay = new Overlay(config);

scanner.on('render', (info) => {
  overlay.update(info);
});

scanner.start();
overlay.show();
```

### Proxy Server

```typescript
import { ProxyServer, WebSocketServer } from '@oxog/react-check';

const wsServer = new WebSocketServer(3099);
const proxy = new ProxyServer({
  target: 'http://localhost:3000',
  port: 8080,
  wsPort: 3099,
});

await wsServer.start();
await proxy.start();

// Open http://localhost:8080 in browser
```

## Framework Support

ReactCheck automatically detects and provides tailored tips for:

| Framework | Features Detected |
|-----------|------------------|
| Next.js   | App Router, Pages Router, RSC |
| Remix     | Routes, loaders |
| Vite      | HMR, React plugin |
| Create React App | react-scripts |
| Gatsby    | gatsby-* packages |

## Architecture

```
src/
├── core/           # Core scanning engine
│   ├── scanner.ts  # Main scanner
│   ├── chain.ts    # Render chain analyzer
│   ├── fix.ts      # Fix suggester
│   ├── stats.ts    # Statistics collector
│   └── fiber.ts    # React fiber utilities
├── browser/        # Browser-side modules
│   ├── scanner.ts  # Browser scanner
│   └── overlay.ts  # Visual overlay
├── server/         # Node.js server modules
│   ├── websocket.ts # WebSocket server
│   ├── proxy.ts     # HTTP proxy
│   └── browser.ts   # Puppeteer wrapper
├── report/         # Report generators
│   ├── html.ts     # HTML report
│   ├── json.ts     # JSON report
│   └── markdown.ts # Markdown report
├── detect/         # Framework detection
│   └── framework.ts
├── cli/            # CLI implementation
│   ├── index.ts    # CLI entry
│   └── tui/        # Terminal UI
├── webui/          # Web dashboard
│   ├── server.ts   # HTTP + WebSocket server
│   └── dashboard.ts # Dashboard HTML generator
└── utils/          # Shared utilities
    ├── colors.ts   # ANSI colors
    ├── format.ts   # Formatters
    ├── fs.ts       # File system
    └── logger.ts   # Logging
```

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Run build: `npm run build`
6. Submit a pull request
