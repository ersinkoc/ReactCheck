/**
 * ReactCheck - Zero-dependency React Performance Scanner
 *
 * A comprehensive tool for scanning, diagnosing, and fixing React performance issues.
 *
 * @packageDocumentation
 */

// Re-export all types
export * from './types.js';

// Re-export core modules
export {
  Scanner,
  StatsCollector,
  ChainAnalyzer,
  FixSuggester,
  getComponentName,
  walkFiberTree,
  isUserComponent,
  isHostComponent,
  isMemoized,
  getParentFiber,
  getFiberDOMNode,
  getChangedProps,
  shallowEqual,
  createRenderInfo,
  getReactVersion,
  getOwner,
  getComponentPath,
  findFiberByName,
  FiberTag,
  type ScannerEvents,
  type StatsEvents,
  type ChainEvents,
  type FixEvents,
} from './core/index.js';

// Re-export report generators
export {
  generateReport,
  generateJSONReport,
  generateMarkdownReport,
  generateHTMLReport,
  parseJSONReport,
  validateJSONReport,
  saveReport,
  saveReports,
  ReportGenerator,
  type ReportFormat,
} from './report/index.js';

// Re-export framework detection
export {
  detectFramework,
  detectFrameworkFromWindow,
  getFrameworkTips,
  frameworkDetectors,
} from './detect/index.js';

// Re-export utilities
export {
  // Colors
  colors,
  supportsColor,
  stripAnsi,
  // Event emitter
  EventEmitter,
  // Format utilities
  formatDuration,
  formatBytes,
  formatNumber,
  formatPercent,
  formatRenderTime,
  truncate,
  pad,
  escapeHtml,
  // File system utilities
  exists,
  readTextFile,
  writeTextFile,
  readJsonFile,
  writeJsonFile,
  ensureDir,
  findUp,
  joinPath,
  resolvePath,
  getDirName,
  getBaseName,
  getExtension,
  // Logger
  Logger,
  LogLevel,
} from './utils/index.js';

// Re-export server modules (Node.js only)
export {
  WebSocketServer,
  WebSocketClient,
  handleBrowserMessages,
  ProxyServer,
  BrowserLauncher,
  isPuppeteerAvailable,
  type WebSocketServerEvents,
  type ProxyServerEvents,
  type ProxyOptions,
  type BrowserLaunchOptions,
  type BrowserEvents,
} from './server/index.js';

// Re-export browser modules (for injection script)
export {
  BrowserScanner,
  Overlay,
  ReactCheckInjector,
  type BrowserScannerEvents,
  type OverlayConfig,
} from './browser/index.js';

// Package version
export const VERSION = '1.0.0';

/**
 * Create a new ReactCheck scanner instance with default options
 *
 * @example
 * ```typescript
 * import { createScanner } from '@oxog/react-check';
 *
 * const scanner = createScanner({
 *   thresholds: { critical: 50, warning: 20 }
 * });
 *
 * scanner.on('render', (info) => {
 *   console.log(`${info.componentName} rendered`);
 * });
 *
 * scanner.start();
 * ```
 */
export function createScanner(options: {
  thresholds?: { critical?: number; warning?: number };
} = {}): Scanner {
  return new Scanner({
    thresholds: {
      critical: options.thresholds?.critical ?? 50,
      warning: options.thresholds?.warning ?? 20,
    },
  });
}

/**
 * Create a new report generator
 *
 * @example
 * ```typescript
 * import { createReportGenerator } from '@oxog/react-check';
 *
 * const generator = createReportGenerator({
 *   formats: ['html', 'json'],
 *   output: './reports',
 * });
 *
 * const paths = await generator.saveAll(report);
 * ```
 */
export function createReportGenerator(options: {
  formats?: Array<'html' | 'json' | 'md'>;
  output?: string;
  includeSourceCode?: boolean;
} = {}): ReportGenerator {
  return new ReportGenerator({
    enabled: true,
    formats: options.formats ?? ['html', 'json'],
    output: options.output ?? './reactcheck-reports',
    includeSourceCode: options.includeSourceCode ?? false,
  });
}

/**
 * Quick scan a URL and generate a report
 *
 * @example
 * ```typescript
 * import { quickScan } from '@oxog/react-check';
 *
 * const report = await quickScan('http://localhost:3000', {
 *   duration: 30000,
 *   headless: true,
 * });
 *
 * console.log(`Found ${report.summary.criticalIssues} critical issues`);
 * ```
 */
export async function quickScan(
  url: string,
  options: {
    duration?: number;
    headless?: boolean;
    output?: string;
    formats?: Array<'html' | 'json' | 'md'>;
  } = {}
): Promise<SessionReport> {
  const { BrowserLauncher, isPuppeteerAvailable } = await import('./server/browser.js');

  const puppeteerAvailable = await isPuppeteerAvailable();
  if (!puppeteerAvailable) {
    throw new ReactCheckError(
      ErrorCode.BROWSER_LAUNCH_FAILED,
      'Puppeteer is required for quickScan. Install it with: npm install puppeteer'
    );
  }

  const launcher = new BrowserLauncher({
    url,
    headless: options.headless ?? true,
  });

  const duration = options.duration ?? 30000;

  // Launch browser and navigate to URL
  await launcher.launch();

  // Wait for duration
  await new Promise((resolve) => setTimeout(resolve, duration));

  // Get page and results
  const page = launcher.getPage();
  if (!page) {
    throw new ReactCheckError(
      ErrorCode.BROWSER_LAUNCH_FAILED,
      'Failed to get browser page'
    );
  }

  // Get results from page
  const results = await page.evaluate(() => {
    const win = window as unknown as { __REACTCHECK_SCANNER__?: { getReport: () => unknown } };
    return win.__REACTCHECK_SCANNER__?.getReport();
  }) as SessionReport | undefined;

  // Close browser
  await launcher.close();

  if (!results) {
    throw new ReactCheckError(
      ErrorCode.REACT_NOT_FOUND,
      'Could not get scan results. Make sure React is running on the page.'
    );
  }

  // Save reports if output specified
  if (options.output && options.formats) {
    const generator = createReportGenerator({
      formats: options.formats,
      output: options.output,
    });
    await generator.saveAll(results);
  } else if (options.output) {
    const generator = createReportGenerator({
      output: options.output,
    });
    await generator.saveAll(results);
  }

  return results;
}

// Import types needed for quickScan
import type { SessionReport } from './types.js';
import { ReactCheckError, ErrorCode } from './types.js';
import { Scanner } from './core/scanner.js';
import { ReportGenerator } from './report/index.js';
