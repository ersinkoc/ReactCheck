/**
 * Scan command implementation
 * @packageDocumentation
 */

import type {
  ReactCheckOptions,
  SessionReport,
  ComponentStats,
  FixSuggestion,
  RenderChainInfo,
  SessionInfo,
  RenderInfo,
  BrowserMessage,
} from '../../types.js';
import type { ParsedArgs } from '../args.js';
import { getStringFlag, getBooleanFlag, getNumberFlag, normalizeTarget } from '../args.js';
import { loadConfig, configToOptions } from '../config.js';
import { Scanner } from '../../core/scanner.js';
import { TUI } from '../tui/index.js';
import { Logger, LogLevel } from '../../utils/logger.js';
import { generateId, formatDuration, formatDate } from '../../utils/format.js';
import { colors, semantic } from '../../utils/colors.js';
import { WebSocketServer, handleBrowserMessages } from '../../server/websocket.js';
import { BrowserLauncher, isPuppeteerAvailable } from '../../server/browser.js';
import { readTextFile } from '../../utils/fs.js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { WebUIServer } from '../../webui/server.js';
import { exec } from 'node:child_process';

const logger = new Logger({ prefix: 'scan', level: LogLevel.INFO });

/**
 * Scan command options derived from CLI args
 */
export interface ScanOptions {
  /** Target URL */
  target: string;
  /** Use proxy mode */
  proxy: boolean;
  /** TUI only mode */
  tui: boolean;
  /** Silent/headless mode */
  silent: boolean;
  /** Generate reports */
  report: boolean;
  /** Report format */
  format: 'html' | 'json' | 'md' | 'all';
  /** Report output directory */
  output: string;
  /** Show fix suggestions */
  fix: boolean;
  /** Verbose output */
  verbose: boolean;
  /** WebSocket port */
  port: number;
  /** Critical threshold */
  thresholdCritical: number;
  /** Warning threshold */
  thresholdWarning: number;
  /** FPS threshold */
  fpsThreshold: number;
  /** Headless browser */
  headless: boolean;
  /** Max duration in seconds */
  duration?: number;
  /** Watch mode */
  watch: boolean;
  /** Config file path */
  configPath?: string;
  /** Enable WebUI dashboard */
  webui: boolean;
  /** WebUI port */
  webuiPort: number;
}

/**
 * Parse scan options from CLI args
 * @param args - Parsed CLI arguments
 * @returns Scan options
 */
export function parseScanOptions(args: ParsedArgs): ScanOptions {
  return {
    target: normalizeTarget(args.target ?? 'localhost:3000'),
    proxy: getBooleanFlag(args, 'proxy'),
    tui: getBooleanFlag(args, 'tui'),
    silent: getBooleanFlag(args, 'silent'),
    report: getBooleanFlag(args, 'report'),
    format: (getStringFlag(args, 'format') as ScanOptions['format']) ?? 'all',
    output: getStringFlag(args, 'output') ?? './reactcheck-reports',
    fix: getBooleanFlag(args, 'fix'),
    verbose: getBooleanFlag(args, 'verbose'),
    port: getNumberFlag(args, 'port') ?? 3099,
    thresholdCritical: getNumberFlag(args, 'threshold-critical') ?? 50,
    thresholdWarning: getNumberFlag(args, 'threshold-warning') ?? 20,
    fpsThreshold: getNumberFlag(args, 'fps-threshold') ?? 30,
    headless: getBooleanFlag(args, 'headless'),
    duration: getNumberFlag(args, 'duration'),
    watch: getBooleanFlag(args, 'watch'),
    configPath: getStringFlag(args, 'config'),
    webui: getBooleanFlag(args, 'webui'),
    webuiPort: getNumberFlag(args, 'webui-port') ?? 3100,
  };
}

/** WebSocket client interface */
interface WSClient {
  send: (data: string) => void;
  on: (event: string, handler: () => void) => void;
}

/**
 * Scan session state
 */
interface ScanSession {
  /** Session ID */
  id: string;
  /** Start time */
  startTime: number;
  /** Scanner instance */
  scanner: Scanner;
  /** TUI instance */
  tui: TUI | null;
  /** WebSocket server */
  wsServer: WebSocketServer | null;
  /** Browser launcher */
  browser: BrowserLauncher | null;
  /** WebUI server */
  webui: WebUIServer | null;
  /** Options */
  options: ScanOptions;
  /** Whether session is active */
  active: boolean;
  /** Render chains collected */
  chains: RenderChainInfo[];
  /** Fix suggestions collected */
  suggestions: FixSuggestion[];
  /** Whether overlay is enabled on browser */
  overlayEnabled: boolean;
  /** Connected browser clients for sending messages */
  browserClients: Set<WSClient>;
}

/**
 * Get browser injection script
 */
async function getInjectionScript(wsPort: number): Promise<string> {
  try {
    // Try to load from dist folder
    // CLI is bundled as single file: dist/cli.js
    // Injection script is: dist/browser-inject.global.js
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = dirname(currentFile);
    // Same directory as cli.js
    const scriptPath = resolve(currentDir, 'browser-inject.global.js');

    logger.debug(`Loading injection script from: ${scriptPath}`);
    const script = await readTextFile(scriptPath);
    // Prepend the port configuration
    return `window.__REACTCHECK_PORT__ = ${wsPort};\n${script}`;
  } catch (error) {
    logger.debug(`Failed to load injection script: ${error}`);
    // Fallback: return minimal injection script
    logger.warn('Could not load injection script, using minimal version');
    return `
      window.__REACTCHECK_PORT__ = ${wsPort};
      window.__REACTCHECK_INJECTED__ = true;

      // Install React DevTools hook
      if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const hook = {
          renderers: new Map(),
          supportsFiber: true,
          inject: function(renderer) {
            const id = this.renderers.size + 1;
            this.renderers.set(id, renderer);
            return id;
          },
          onCommitFiberRoot: function(id, root) {
            // Will be overwritten by full script
          },
          onCommitFiberUnmount: function() {},
        };
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;
        console.log('[ReactCheck] DevTools hook installed (minimal)');
      }
    `;
  }
}

/**
 * Run the scan command
 * @param args - Parsed CLI arguments
 * @returns Exit code
 */
export async function runScanCommand(args: ParsedArgs): Promise<number> {
  const options = parseScanOptions(args);

  // Load config file
  const { config, configPath, fromFile } = await loadConfig(options.configPath);
  if (fromFile) {
    logger.info(`Using config: ${configPath}`);
  }

  // Merge config with CLI options
  const configOptions = configToOptions(config);
  const mergedOptions: ScanOptions = {
    ...options,
    thresholdCritical: options.thresholdCritical ?? configOptions.thresholds.critical,
    thresholdWarning: options.thresholdWarning ?? configOptions.thresholds.warning,
    fpsThreshold: options.fpsThreshold ?? configOptions.thresholds.fps,
    output: options.output ?? configOptions.report.output,
  };

  // Create session
  const session: ScanSession = {
    id: generateId('scan'),
    startTime: Date.now(),
    scanner: new Scanner({
      thresholds: {
        critical: mergedOptions.thresholdCritical,
        warning: mergedOptions.thresholdWarning,
        fps: mergedOptions.fpsThreshold,
      },
    }),
    tui: null,
    wsServer: null,
    browser: null,
    webui: null,
    options: mergedOptions,
    active: true,
    chains: [],
    suggestions: [],
    overlayEnabled: true,
    browserClients: new Set(),
  };

  // Set up scanner event handlers
  setupScannerEvents(session);

  // Start TUI if not silent and not proxy mode and stdin is a TTY
  const useTUI = !mergedOptions.silent && !mergedOptions.proxy && process.stdin.isTTY;
  if (useTUI) {
    session.tui = new TUI(mergedOptions.target);
    setupTUIEvents(session);
    // Set up data polling - TUI will poll scanner data on each render
    session.tui.setDataProvider(() => ({
      components: session.scanner.getSnapshot(),
      summary: session.scanner.getSummary(),
      fps: session.scanner.getFps(),
    }));
    session.tui.start();
  } else if (!mergedOptions.silent && !mergedOptions.proxy && !process.stdin.isTTY) {
    logger.warn('TTY not available, TUI disabled. Use --silent for non-interactive mode.');
  }

  // Start WebUI if enabled
  if (mergedOptions.webui) {
    session.webui = new WebUIServer(mergedOptions.webuiPort, mergedOptions.target);
    setupWebUIEvents(session);
  }

  // Print startup message (only when not using TUI)
  if (!useTUI) {
    logger.info(`Starting scan of ${mergedOptions.target}`);
  }

  // Disable logger after TUI starts to prevent display corruption
  // But allow initial messages to be logged first
  if (useTUI) {
    logger.setLevel(LogLevel.SILENT);
  }

  try {
    // Start WebSocket server
    session.wsServer = new WebSocketServer(mergedOptions.port);
    await session.wsServer.start();
    logger.info(`WebSocket server listening on port ${mergedOptions.port}`);

    // Handle browser connections
    session.wsServer.on('connection', (client) => {
      logger.info('Browser connected');

      // Add client to session for overlay toggle
      session.browserClients.add(client);

      handleBrowserMessages(client, (message: BrowserMessage) => {
        switch (message.type) {
          case 'render':
            // Forward render info to scanner
            session.scanner.addRender(message.payload as RenderInfo);
            break;
          case 'ready':
            logger.info(`React detected: ${(message.payload as { reactVersion: string }).reactVersion}`);
            // Send start command
            client.send(JSON.stringify({ type: 'start' }));
            // Send current overlay state
            client.send(JSON.stringify({ type: 'toggle-overlay', payload: { enabled: session.overlayEnabled } }));
            break;
          case 'error':
            logger.error('Browser error:', (message.payload as { message: string }).message);
            break;
        }
      });

      client.on('close', () => {
        logger.info('Browser disconnected');
        session.browserClients.delete(client);
      });
    });

    // Start the scanner
    session.scanner.start();

    // Start WebUI server if enabled
    if (session.webui) {
      const webuiPort = await session.webui.start();
      session.webui.setScanning(true);
      const webuiUrl = session.webui.getUrl();
      logger.info(`WebUI dashboard: ${webuiUrl}`);

      // Open browser automatically
      openBrowser(webuiUrl);
    }

    // Check if proxy mode
    if (mergedOptions.proxy) {
      // Proxy mode - user opens their own browser
      // eslint-disable-next-line no-console
      console.log('');
      // eslint-disable-next-line no-console
      console.log(colors.cyan + colors.bold + '╔═══════════════════════════════════════════════════════════╗' + colors.reset);
      // eslint-disable-next-line no-console
      console.log(colors.cyan + colors.bold + '║                    PROXY MODE ACTIVE                      ║' + colors.reset);
      // eslint-disable-next-line no-console
      console.log(colors.cyan + colors.bold + '╚═══════════════════════════════════════════════════════════╝' + colors.reset);
      // eslint-disable-next-line no-console
      console.log('');
      // eslint-disable-next-line no-console
      console.log(`  Add this script to your HTML before React loads:`);
      // eslint-disable-next-line no-console
      console.log('');
      // eslint-disable-next-line no-console
      console.log(colors.yellow + `  <script>window.__REACTCHECK_PORT__ = ${mergedOptions.port};</script>` + colors.reset);
      // eslint-disable-next-line no-console
      console.log(colors.yellow + `  <script src="http://localhost:${mergedOptions.port + 1}/reactcheck.js"></script>` + colors.reset);
      // eslint-disable-next-line no-console
      console.log('');
      // eslint-disable-next-line no-console
      console.log(`  Or open: ${colors.cyan}${mergedOptions.target}${colors.reset}`);
      // eslint-disable-next-line no-console
      console.log('');
      // eslint-disable-next-line no-console
      console.log(`  Press ${colors.bold}Ctrl+C${colors.reset} to stop scanning`);
      // eslint-disable-next-line no-console
      console.log('');
    } else {
      // Browser mode - launch Puppeteer
      const hasPuppeteer = await isPuppeteerAvailable();

      if (!hasPuppeteer) {
        logger.error('Puppeteer is not installed. Install it with: npm install puppeteer');
        logger.info('Alternatively, use --proxy mode to scan with your own browser');
        await session.wsServer.stop();
        return 2;
      }

      // Get injection script
      const injectionScript = await getInjectionScript(mergedOptions.port);

      // Launch browser
      session.browser = new BrowserLauncher({
        url: mergedOptions.target,
        headless: mergedOptions.headless,
        wsPort: mergedOptions.port,
      });

      session.browser.setInjectionScript(injectionScript);

      session.browser.on('console', ({ type, text }) => {
        if (text.includes('[ReactCheck]')) {
          logger.info(`Browser: ${text}`);
        }
      });

      session.browser.on('error', (error) => {
        logger.error('Browser error:', error.message);
      });

      logger.info('Launching browser...');
      await session.browser.launch();
      logger.info('Browser launched, scanning...');
    }

    // Wait based on mode
    if (mergedOptions.duration) {
      // Wait for specified duration
      await new Promise((resolve) => setTimeout(resolve, mergedOptions.duration! * 1000));
      session.active = false;
    } else if (session.tui) {
      // Wait for TUI quit event
      await waitForQuit(session);
    } else {
      // Watch mode or interactive - wait for signal
      await waitForSignal();
      session.active = false;
    }

    // Cleanup
    await cleanupSession(session);

    // Generate report if requested
    if (mergedOptions.report) {
      const report = generateReport(session);
      await saveReport(report, mergedOptions);
    }

    // Print summary
    printSummary(session);

    // Print fix suggestions if requested
    if (mergedOptions.fix && !mergedOptions.silent) {
      printFixSuggestions(session.suggestions);
    }

    // Return exit code based on issues found
    const summary = session.scanner.getSummary();
    return summary.criticalIssues > 0 ? 1 : 0;
  } catch (error) {
    await cleanupSession(session);

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Provide helpful error messages for common issues
    if (errorMessage.includes('ERR_CONNECTION_REFUSED')) {
      logger.error(`Could not connect to ${mergedOptions.target}`);
      logger.info('Make sure your React application is running at that address.');
      logger.info('Example: npm start  or  npm run dev');
    } else if (errorMessage.includes('EADDRINUSE')) {
      logger.error(`Port ${mergedOptions.port} is already in use`);
      logger.info('Try using a different port with --port <number>');
    } else if (errorMessage.includes('ERR_CERT')) {
      logger.error('SSL certificate error');
      logger.info('ReactCheck now supports self-signed certificates by default.');
    } else {
      logger.error('Scan failed:', errorMessage);
    }

    return 2;
  }
}

/**
 * Cleanup session resources
 */
async function cleanupSession(session: ScanSession): Promise<void> {
  // Stop scanner
  session.scanner.stop();

  // Stop TUI
  if (session.tui) {
    session.tui.stop();
  }

  // Stop WebUI
  if (session.webui) {
    session.webui.stop();
  }

  // Close browser
  if (session.browser) {
    await session.browser.close();
  }

  // Stop WebSocket server
  if (session.wsServer) {
    await session.wsServer.stop();
  }
}

/**
 * Set up scanner event handlers
 */
function setupScannerEvents(session: ScanSession): void {
  const { scanner } = session;

  scanner.on('render', () => {
    // Access session.tui directly to get current value (not snapshot from destructuring)
    if (session.tui) {
      const snapshot = scanner.getSnapshot();
      const summary = scanner.getSummary();
      session.tui.update({
        components: snapshot,
        summary: summary,
        fps: scanner.getFps(),
      });
    }
  });

  scanner.on('chain', (chain) => {
    session.chains.push(chain);
    if (session.tui) {
      session.tui.update({ chains: session.chains.slice(-10) });
    }
  });

  scanner.on('fix', (suggestion) => {
    // Avoid duplicates
    if (!session.suggestions.some((s) =>
      s.componentName === suggestion.componentName && s.fix === suggestion.fix
    )) {
      session.suggestions.push(suggestion);
      if (session.tui) {
        session.tui.update({ suggestions: session.suggestions });
      }
    }
  });

  scanner.on('fps-drop', (fps) => {
    if (session.options.verbose) {
      logger.warn(`FPS dropped to ${fps}`);
    }
  });

  scanner.on('severityChange', ({ component, to }) => {
    if (session.options.verbose && to === 'critical') {
      logger.warn(`Component ${component} reached critical severity`);
    }
  });
}

/**
 * Set up TUI event handlers
 */
function setupTUIEvents(session: ScanSession): void {
  const { tui, scanner } = session;
  if (!tui) return;

  tui.on('togglePause', () => {
    if (scanner.isRunning()) {
      scanner.stop();
      tui.update({ paused: true });
    } else {
      scanner.start();
      tui.update({ paused: false });
    }
  });

  tui.on('generateReport', async () => {
    const report = generateReport(session);
    await saveReport(report, session.options);
    // Show notification (would need TUI enhancement)
  });

  tui.on('selectComponent', (component) => {
    // Analyze component for suggestions
    const suggestions = scanner.analyzeComponent(component.name);
    session.suggestions.push(...suggestions.filter((s) =>
      !session.suggestions.some((ex) =>
        ex.componentName === s.componentName && ex.fix === s.fix
      )
    ));
    tui.update({ suggestions: session.suggestions });
  });

  tui.on('toggleOverlay', () => {
    // Toggle overlay state
    session.overlayEnabled = !session.overlayEnabled;
    tui.update({ overlayEnabled: session.overlayEnabled });

    // Send toggle message to all connected browsers
    const message = JSON.stringify({
      type: 'toggle-overlay',
      payload: { enabled: session.overlayEnabled },
    });

    for (const client of session.browserClients) {
      try {
        client.send(message);
      } catch {
        // Client may have disconnected
      }
    }
  });
}

/**
 * Wait for TUI quit event
 */
async function waitForQuit(session: ScanSession): Promise<void> {
  return new Promise((resolve) => {
    if (session.tui) {
      session.tui.on('quit', () => {
        session.active = false;
        resolve();
      });
    }
  });
}

/**
 * Wait for interrupt signal or user input
 */
async function waitForSignal(): Promise<void> {
  return new Promise((resolve) => {
    // On Windows, SIGINT/SIGTERM may not work reliably
    // Also listen for stdin close
    process.once('SIGINT', () => resolve());
    process.once('SIGTERM', () => resolve());

    // Keep process alive by preventing stdin from ending
    if (process.stdin.isTTY) {
      process.stdin.resume();
    }

    // Also resolve on stdin end (Ctrl+C on Windows)
    process.stdin.once('end', () => resolve());
  });
}

/**
 * Generate session report
 */
function generateReport(session: ScanSession): SessionReport {
  const { scanner, options, chains, suggestions } = session;
  const exported = scanner.export();

  const sessionInfo: SessionInfo = {
    url: options.target,
    duration: scanner.getSessionDuration(),
    timestamp: formatDate(new Date(session.startTime)),
    id: session.id,
  };

  return {
    version: '1.0.0',
    generated: formatDate(),
    session: sessionInfo,
    summary: exported.stats.summary,
    components: exported.stats.components,
    chains,
    timeline: [], // Would be populated by scanner events
    framework: null, // Would be populated by framework detection
    suggestions,
  };
}

/**
 * Save report to files
 */
async function saveReport(report: SessionReport, options: ScanOptions): Promise<void> {
  const { ensureDir, writeTextFile, joinPath } = await import('../../utils/fs.js');
  const { generateHTMLReport } = await import('../../report/html.js');
  const { generateJSONReport } = await import('../../report/json.js');
  const { generateMarkdownReport } = await import('../../report/markdown.js');

  await ensureDir(options.output);

  const timestamp = Date.now();
  const formats = options.format === 'all' ? ['html', 'json', 'md'] : [options.format];

  for (const format of formats) {
    let content: string;
    let extension: string;

    switch (format) {
      case 'html':
        content = generateHTMLReport(report);
        extension = 'html';
        break;
      case 'json':
        content = generateJSONReport(report);
        extension = 'json';
        break;
      case 'md':
        content = generateMarkdownReport(report);
        extension = 'md';
        break;
      default:
        continue;
    }

    const filename = `reactcheck-report-${timestamp}.${extension}`;
    const filepath = joinPath(options.output, filename);
    await writeTextFile(filepath, content);
    logger.info(`Report saved: ${filepath}`);
  }
}

/**
 * Print session summary
 */
function printSummary(session: ScanSession): void {
  const { scanner, options } = session;
  const summary = scanner.getSummary();
  const duration = scanner.getSessionDuration();

  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log(colors.bold + '═'.repeat(50) + colors.reset);
  // eslint-disable-next-line no-console
  console.log(colors.bold + '  ReactCheck Scan Summary' + colors.reset);
  // eslint-disable-next-line no-console
  console.log(colors.bold + '═'.repeat(50) + colors.reset);
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log(`  Target:     ${options.target}`);
  // eslint-disable-next-line no-console
  console.log(`  Duration:   ${formatDuration(duration)}`);
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log(`  Components: ${summary.totalComponents}`);
  // eslint-disable-next-line no-console
  console.log(`  Renders:    ${summary.totalRenders}`);
  // eslint-disable-next-line no-console
  console.log(`  Avg FPS:    ${summary.avgFps}`);
  // eslint-disable-next-line no-console
  console.log('');

  if (summary.criticalIssues > 0) {
    // eslint-disable-next-line no-console
    console.log(semantic.critical(`  🔴 Critical Issues: ${summary.criticalIssues}`));
  }
  if (summary.warnings > 0) {
    // eslint-disable-next-line no-console
    console.log(semantic.warning(`  🟡 Warnings: ${summary.warnings}`));
  }
  // eslint-disable-next-line no-console
  console.log(semantic.healthy(`  🟢 Healthy: ${summary.healthy}`));
  // eslint-disable-next-line no-console
  console.log('');
}

/**
 * Print fix suggestions
 */
function printFixSuggestions(suggestions: FixSuggestion[]): void {
  if (suggestions.length === 0) {
    // eslint-disable-next-line no-console
    console.log(colors.gray + '  No fix suggestions.' + colors.reset);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(colors.bold + '  Fix Suggestions:' + colors.reset);
  // eslint-disable-next-line no-console
  console.log('');

  const criticals = suggestions.filter((s) => s.severity === 'critical');
  const warnings = suggestions.filter((s) => s.severity === 'warning');

  const toShow = [...criticals.slice(0, 3), ...warnings.slice(0, 2)];

  for (const suggestion of toShow) {
    const color = suggestion.severity === 'critical' ? colors.red : colors.yellow;
    // eslint-disable-next-line no-console
    console.log(`  ${color}${suggestion.componentName}${colors.reset}: ${suggestion.fix}`);
    // eslint-disable-next-line no-console
    console.log(`    ${colors.gray}${suggestion.issue}${colors.reset}`);
    // eslint-disable-next-line no-console
    console.log('');
  }

  if (suggestions.length > toShow.length) {
    // eslint-disable-next-line no-console
    console.log(colors.gray + `  ... and ${suggestions.length - toShow.length} more suggestions` + colors.reset);
    // eslint-disable-next-line no-console
    console.log('');
  }
}

/**
 * Set up WebUI event handlers
 */
function setupWebUIEvents(session: ScanSession): void {
  const { scanner, webui } = session;
  if (!webui) return;

  // Forward scanner events to WebUI
  scanner.on('render', (render: RenderInfo) => {
    webui.addRenderEvent(render);
    webui.updateSummary(scanner.getSummary());
    webui.updateComponents(scanner.getSnapshot());
    webui.updateFps(scanner.getFps());
  });

  scanner.on('chain', (chain) => {
    webui.addChain(chain);
  });

  scanner.on('severityChange', ({ component }) => {
    const stats = scanner.getSnapshot().find(c => c.name === component);
    if (stats) {
      webui.updateComponent(stats);
    }
  });
}

/**
 * Open browser with URL
 */
function openBrowser(url: string): void {
  const platform = process.platform;
  let command: string;

  switch (platform) {
    case 'darwin':
      command = `open "${url}"`;
      break;
    case 'win32':
      command = `start "" "${url}"`;
      break;
    default:
      command = `xdg-open "${url}"`;
      break;
  }

  exec(command, (error) => {
    if (error) {
      logger.debug(`Failed to open browser: ${error.message}`);
    }
  });
}
