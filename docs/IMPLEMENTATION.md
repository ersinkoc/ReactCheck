# ReactCheck - Implementation Guide

## Architecture Overview

ReactCheck follows a multi-process architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Process                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────────┐  ┌──────────────┐   │
│  │  TUI    │  │ Report  │  │  WebSocket  │  │   Puppeteer  │   │
│  │ Renderer│  │Generator│  │   Server    │  │   Launcher   │   │
│  └────┬────┘  └────┬────┘  └──────┬──────┘  └──────┬───────┘   │
│       │            │              │                 │           │
│       └────────────┴──────────────┴─────────────────┘           │
│                           │                                      │
│                    Core Engine                                   │
│       ┌──────────────────┴──────────────────┐                   │
│       │  Stats Collector  │  Chain Analyzer │                   │
│       │  Fix Suggester    │  Session Manager│                   │
│       └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                      WebSocket
                            │
┌─────────────────────────────────────────────────────────────────┐
│                     Browser Process                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Scanner   │  │   Overlay   │  │    React DevTools Hook  │  │
│  │   (inject)  │  │  (Shadow)   │  │       Integration       │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
│         │                │                       │               │
│         └────────────────┴───────────────────────┘               │
│                          │                                       │
│                   Target React App                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Design

### 1. Core Engine (`src/core/`)

#### Scanner (`scanner.ts`)
The scanner is the heart of ReactCheck. It hooks into React's internals to monitor renders.

**Key Design Decisions:**
- Use React DevTools global hook when available
- Fallback to Fiber tree walking for apps without DevTools
- Minimal performance impact through batched updates
- Event emitter pattern for loose coupling

```typescript
// Scanner architecture
class Scanner extends EventEmitter {
  private isRunning: boolean = false;
  private renderBuffer: RenderInfo[] = [];
  private flushInterval: number = 100;

  start(): void {
    this.hookIntoReact();
    this.startFlushLoop();
  }

  private hookIntoReact(): void {
    // Strategy 1: DevTools hook
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      this.useDevToolsHook();
    }
    // Strategy 2: Direct Fiber access
    else {
      this.useFiberWalker();
    }
  }

  private onRender(fiber: Fiber, phase: 'mount' | 'update'): void {
    const renderInfo = this.extractRenderInfo(fiber, phase);
    this.renderBuffer.push(renderInfo);
  }

  private flushBuffer(): void {
    const renders = this.renderBuffer.splice(0);
    renders.forEach(r => this.emit('render', r));
  }
}
```

#### Chain Analyzer (`chain.ts`)
Traces render cascades to find root causes.

**Algorithm:**
1. Collect renders within a 16ms window (one frame)
2. Build parent-child graph from Fiber relationships
3. Find connected components in the graph
4. Trace each chain back to its trigger
5. Identify state/context changes that initiated the chain

```typescript
class ChainAnalyzer {
  private renderWindow: Map<number, RenderInfo[]> = new Map();
  private readonly WINDOW_SIZE = 16; // ms

  addRender(render: RenderInfo): void {
    const windowKey = Math.floor(render.timestamp / this.WINDOW_SIZE);
    const window = this.renderWindow.get(windowKey) || [];
    window.push(render);
    this.renderWindow.set(windowKey, window);

    this.analyzeWindow(windowKey);
  }

  private analyzeWindow(key: number): void {
    const renders = this.renderWindow.get(key);
    if (!renders || renders.length < 2) return;

    const chains = this.buildChains(renders);
    chains.forEach(chain => this.emit('chain', chain));
  }

  private buildChains(renders: RenderInfo[]): RenderChainInfo[] {
    // Group by root component
    // Trace parent relationships
    // Calculate depth and total renders
  }
}
```

#### Fix Suggester (`fix.ts`)
Rule-based analysis engine.

**Rule Engine Design:**
```typescript
interface Rule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  detect: (stats: ComponentStats) => boolean;
  suggest: (stats: ComponentStats) => FixSuggestion;
}

const rules: Rule[] = [
  {
    id: 'unnecessary-rerenders',
    name: 'Unnecessary Re-renders',
    description: 'Component re-renders without prop/state changes',
    severity: 'critical',
    detect: (stats) => stats.unnecessary > stats.renders * 0.5,
    suggest: (stats) => ({
      fix: 'React.memo',
      codeBefore: `export function ${stats.name}(props) {`,
      codeAfter: `export const ${stats.name} = React.memo(function ${stats.name}(props) {`,
      explanation: 'React.memo prevents re-renders when props are unchanged'
    })
  },
  // More rules...
];
```

#### Stats Collector (`stats.ts`)
Aggregates render data into meaningful statistics.

```typescript
class StatsCollector {
  private components: Map<string, ComponentStats> = new Map();

  addRender(render: RenderInfo): void {
    const stats = this.getOrCreate(render.componentName);
    stats.renders++;
    stats.totalRenderTime += render.renderTime;
    if (!render.necessary) stats.unnecessary++;
    this.updateSeverity(stats);
  }

  private updateSeverity(stats: ComponentStats): void {
    if (stats.renders > this.thresholds.critical) {
      stats.severity = 'critical';
    } else if (stats.renders > this.thresholds.warning) {
      stats.severity = 'warning';
    } else {
      stats.severity = 'healthy';
    }
  }

  getSnapshot(): ComponentStats[] {
    return Array.from(this.components.values())
      .sort((a, b) => b.renders - a.renders);
  }
}
```

### 2. CLI (`src/cli/`)

#### Argument Parser (`args.ts`)
Custom argument parser (no external deps).

```typescript
interface ParsedArgs {
  command: 'scan' | 'init' | 'help' | 'version';
  target?: string;
  flags: Map<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    command: 'scan',
    flags: new Map()
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === 'init' || arg === 'help' || arg === '--help') {
      args.command = arg === '--help' ? 'help' : arg;
    } else if (arg === '--version' || arg === '-v') {
      args.command = 'version';
    } else if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args.flags.set(key, value ?? true);
    } else if (!arg.startsWith('-')) {
      args.target = arg;
    }
  }

  return args;
}
```

#### TUI Renderer (`tui/index.ts`)
Terminal UI using ANSI escape codes.

**Key Components:**
- Screen buffer for efficient updates
- Box drawing with Unicode characters
- Color support with fallback
- Keyboard input handling (raw mode)

```typescript
class TUI {
  private buffer: string[][] = [];
  private width: number;
  private height: number;
  private selectedIndex: number = 0;

  constructor() {
    this.width = process.stdout.columns || 80;
    this.height = process.stdout.rows || 24;
    this.initBuffer();
  }

  private initBuffer(): void {
    this.buffer = Array(this.height)
      .fill(null)
      .map(() => Array(this.width).fill(' '));
  }

  render(state: TUIState): void {
    this.clear();
    this.drawHeader(state);
    this.drawComponents(state.components);
    this.drawFooter();
    this.flush();
  }

  private drawBox(x: number, y: number, w: number, h: number, title?: string): void {
    // Unicode box drawing: ┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴ ┼
    this.writeAt(x, y, '┌' + '─'.repeat(w - 2) + '┐');
    for (let i = 1; i < h - 1; i++) {
      this.writeAt(x, y + i, '│' + ' '.repeat(w - 2) + '│');
    }
    this.writeAt(x, y + h - 1, '└' + '─'.repeat(w - 2) + '┘');
    if (title) {
      this.writeAt(x + 2, y, `─ ${title} `);
    }
  }

  private flush(): void {
    process.stdout.write('\x1b[H'); // Move to home
    process.stdout.write(this.buffer.map(row => row.join('')).join('\n'));
  }
}
```

### 3. Browser Modules (`src/browser/`)

#### Injection Script (`inject.ts`)
Script that gets injected into the target page.

**Injection Strategy:**
1. Build as standalone IIFE bundle
2. Inject via Puppeteer's `page.evaluate()` or proxy HTML modification
3. Create shadow DOM for isolation
4. Initialize scanner and overlay

```typescript
// This file is bundled separately for browser injection
(function ReactCheckInjector() {
  // Check if already injected
  if (window.__REACTCHECK_INJECTED__) return;
  window.__REACTCHECK_INJECTED__ = true;

  // Create shadow root for overlay
  const host = document.createElement('div');
  host.id = 'reactcheck-host';
  const shadow = host.attachShadow({ mode: 'closed' });
  document.body.appendChild(host);

  // Initialize WebSocket connection to CLI
  const ws = new WebSocket(`ws://localhost:${__REACTCHECK_PORT__}`);

  // Initialize scanner
  const scanner = new BrowserScanner({
    onRender: (info) => ws.send(JSON.stringify({ type: 'render', payload: info })),
    onChain: (chain) => ws.send(JSON.stringify({ type: 'chain', payload: chain }))
  });

  // Initialize overlay
  const overlay = new Overlay(shadow, scanner);

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    switch (msg.type) {
      case 'start': scanner.start(); break;
      case 'stop': scanner.stop(); break;
      case 'config': scanner.configure(msg.payload); break;
    }
  };

  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'ready',
      payload: { reactVersion: getReactVersion() }
    }));
    scanner.start();
  };
})();
```

#### Overlay (`overlay.ts`)
Visual overlay for render highlighting.

```typescript
class Overlay {
  private shadow: ShadowRoot;
  private highlights: Map<string, HTMLElement> = new Map();
  private toolbar: HTMLElement;

  constructor(shadow: ShadowRoot, scanner: BrowserScanner) {
    this.shadow = shadow;
    this.injectStyles();
    this.createToolbar();

    scanner.on('render', (info) => this.highlightComponent(info));
  }

  private highlightComponent(info: RenderInfo): void {
    const element = this.findDOMNode(info.fiber);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const highlight = this.getOrCreateHighlight(info.componentName);

    highlight.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid ${this.getColor(info)};
      pointer-events: none;
      z-index: 10000;
      transition: opacity 0.3s;
    `;

    // Fade out after animation
    setTimeout(() => {
      highlight.style.opacity = '0';
    }, 500);
  }

  private getColor(info: RenderInfo): string {
    if (!info.necessary) return '#6b7280'; // gray
    if (info.renderCount > 50) return '#ef4444'; // red
    if (info.renderCount > 20) return '#eab308'; // yellow
    return '#22c55e'; // green
  }
}
```

### 4. Server (`src/server/`)

#### WebSocket Server (`websocket.ts`)
Custom WebSocket implementation (no ws dependency).

```typescript
import { createServer, IncomingMessage } from 'http';
import { createHash } from 'crypto';

class WebSocketServer extends EventEmitter {
  private server: ReturnType<typeof createServer>;
  private clients: Set<WebSocket> = new Set();

  constructor(port: number) {
    super();
    this.server = createServer();
    this.server.on('upgrade', this.handleUpgrade.bind(this));
    this.server.listen(port);
  }

  private handleUpgrade(req: IncomingMessage, socket: any): void {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = this.generateAcceptKey(key);
    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '',
      ''
    ].join('\r\n');

    socket.write(headers);

    const client = new WebSocket(socket);
    this.clients.add(client);
    this.emit('connection', client);
  }

  private generateAcceptKey(key: string): string {
    const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    return createHash('sha1')
      .update(key + GUID)
      .digest('base64');
  }

  broadcast(message: string): void {
    this.clients.forEach(client => client.send(message));
  }
}
```

#### Proxy Server (`proxy.ts`)
HTTP proxy that injects scanner script.

```typescript
import { createServer, request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';

class ProxyServer {
  private injectionScript: string;

  constructor(private targetUrl: string, private port: number) {
    this.injectionScript = this.loadInjectionScript();
  }

  start(): void {
    const server = createServer((req, res) => {
      this.proxyRequest(req, res);
    });
    server.listen(this.port);
  }

  private proxyRequest(req: IncomingMessage, res: ServerResponse): void {
    const targetURL = new URL(req.url || '/', this.targetUrl);
    const isHttps = targetURL.protocol === 'https:';
    const requestFn = isHttps ? httpsRequest : httpRequest;

    const proxyReq = requestFn(targetURL, {
      method: req.method,
      headers: req.headers
    }, (proxyRes) => {
      const contentType = proxyRes.headers['content-type'] || '';

      if (contentType.includes('text/html')) {
        this.injectAndRespond(proxyRes, res);
      } else {
        res.writeHead(proxyRes.statusCode!, proxyRes.headers);
        proxyRes.pipe(res);
      }
    });

    req.pipe(proxyReq);
  }

  private injectAndRespond(proxyRes: IncomingMessage, res: ServerResponse): void {
    let body = '';
    proxyRes.on('data', chunk => body += chunk);
    proxyRes.on('end', () => {
      // Inject before </body>
      const injected = body.replace(
        '</body>',
        `<script>${this.injectionScript}</script></body>`
      );

      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Length': Buffer.byteLength(injected)
      });
      res.end(injected);
    });
  }
}
```

#### Browser Launcher (`browser.ts`)
Puppeteer wrapper for launching Chrome.

```typescript
class BrowserLauncher {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async launch(url: string, options: LaunchOptions): Promise<Page> {
    // Dynamic import to keep Puppeteer as optional
    const puppeteer = await import('puppeteer');

    this.browser = await puppeteer.launch({
      headless: options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--window-size=${options.width},${options.height}`
      ]
    });

    this.page = await this.browser.newPage();

    // Inject script before page loads
    await this.page.evaluateOnNewDocument(this.getInjectionScript());

    await this.page.goto(url, { waitUntil: 'networkidle0' });

    return this.page;
  }

  async close(): Promise<void> {
    await this.browser?.close();
  }
}
```

### 5. Report Generator (`src/report/`)

#### HTML Report (`html.ts`)
Self-contained HTML report with embedded assets.

```typescript
class HTMLReportGenerator {
  generate(data: SessionReport): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReactCheck Report - ${data.session.url}</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="container">
    ${this.renderHeader(data)}
    ${this.renderSummary(data.summary)}
    ${this.renderComponents(data.components)}
    ${this.renderChains(data.chains)}
    ${this.renderSuggestions(data.suggestions)}
    ${this.renderTimeline(data.timeline)}
  </div>
  <script>${this.getScript()}</script>
</body>
</html>`;
  }

  private getStyles(): string {
    return `
      :root {
        --bg-primary: #0a0a0a;
        --bg-secondary: #141414;
        --text-primary: #ffffff;
        --text-secondary: #a1a1aa;
        --accent-red: #ef4444;
        --accent-yellow: #eab308;
        --accent-green: #22c55e;
        --accent-blue: #3b82f6;
      }
      /* ... more styles */
    `;
  }
}
```

### 6. Utilities (`src/utils/`)

#### Colors (`colors.ts`)
ANSI color codes for terminal output.

```typescript
const supportsColor = process.stdout.isTTY && process.env.TERM !== 'dumb';

export const colors = {
  reset: supportsColor ? '\x1b[0m' : '',
  bold: supportsColor ? '\x1b[1m' : '',
  dim: supportsColor ? '\x1b[2m' : '',

  red: supportsColor ? '\x1b[31m' : '',
  green: supportsColor ? '\x1b[32m' : '',
  yellow: supportsColor ? '\x1b[33m' : '',
  blue: supportsColor ? '\x1b[34m' : '',
  gray: supportsColor ? '\x1b[90m' : '',

  bgRed: supportsColor ? '\x1b[41m' : '',
  bgGreen: supportsColor ? '\x1b[42m' : '',
  bgYellow: supportsColor ? '\x1b[43m' : ''
};

export function colorize(text: string, ...codes: string[]): string {
  if (!supportsColor) return text;
  return codes.join('') + text + colors.reset;
}
```

#### Logger (`logger.ts`)
Structured logging utility.

```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(prefix: string, level: LogLevel = LogLevel.INFO) {
    this.prefix = prefix;
    this.level = level;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(colors.gray + `[${this.prefix}] ${message}`, ...args, colors.reset);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`[${this.prefix}] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(colors.yellow + `[${this.prefix}] ${message}`, ...args, colors.reset);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(colors.red + `[${this.prefix}] ${message}`, ...args, colors.reset);
    }
  }
}
```

---

## Testing Strategy

### Unit Tests
- Test each module in isolation
- Mock dependencies (WebSocket, DOM, Puppeteer)
- Test edge cases and error conditions

### Integration Tests
- Test CLI argument parsing
- Test WebSocket communication
- Test report generation

### E2E Tests (optional, not for coverage)
- Test with real React app
- Test browser automation
- Test full scan workflow

### Coverage Requirements
- Lines: 100%
- Branches: 100%
- Functions: 100%
- Statements: 100%

---

## Build Configuration

### tsup.config.ts
```typescript
import { defineConfig } from 'tsup';

export default defineConfig([
  // Main library
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true
  },
  // CLI binary
  {
    entry: ['src/cli/index.ts'],
    format: ['esm'],
    outDir: 'dist',
    banner: { js: '#!/usr/bin/env node' }
  },
  // Browser injection script (IIFE)
  {
    entry: ['src/browser/inject.ts'],
    format: ['iife'],
    outDir: 'dist',
    globalName: 'ReactCheckInjector'
  }
]);
```

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100
      },
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/types.ts']
    },
    globals: true,
    environment: 'node'
  }
});
```

---

## Error Handling Patterns

### Graceful Degradation
```typescript
class Scanner {
  start(): void {
    try {
      this.hookIntoReact();
    } catch (e) {
      this.logger.warn('Could not hook into React, using fallback');
      this.useFallbackStrategy();
    }
  }
}
```

### User-Friendly Errors
```typescript
function formatError(error: ReactCheckError): string {
  switch (error.code) {
    case ErrorCode.REACT_NOT_FOUND:
      return `
${colors.red}React not detected on the page${colors.reset}

Make sure:
1. The page contains a React application
2. React is loaded before ReactCheck starts
3. The URL is correct: ${error.details}
`;
    // ... more cases
  }
}
```

---

## Performance Optimizations

1. **Batched Updates**: Buffer render events and flush every 100ms
2. **Efficient DOM Queries**: Cache component-to-DOM mappings
3. **Lazy Loading**: Dynamic import for Puppeteer
4. **Memory Management**: Clean up old render data periodically
5. **Throttled TUI Updates**: Limit redraws to prevent flickering

---

## Security Measures

1. **No Eval**: Never use eval() or Function() constructors
2. **Content Security Policy**: Shadow DOM for overlay isolation
3. **Input Validation**: Validate all CLI arguments
4. **Sandboxed Browser**: Use Puppeteer sandbox mode
5. **No External Requests**: Only communicate with target and localhost
