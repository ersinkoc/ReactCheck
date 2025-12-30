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
} from '../../types.js';
import type { ParsedArgs } from '../args.js';
import { getStringFlag, getBooleanFlag, getNumberFlag, normalizeTarget } from '../args.js';
import { loadConfig, configToOptions } from '../config.js';
import { Scanner } from '../../core/scanner.js';
import { TUI } from '../tui/index.js';
import { Logger, LogLevel } from '../../utils/logger.js';
import { generateId, formatDuration, formatDate } from '../../utils/format.js';
import { colors, semantic } from '../../utils/colors.js';

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
  };
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
  /** Options */
  options: ScanOptions;
  /** Whether session is active */
  active: boolean;
  /** Render chains collected */
  chains: RenderChainInfo[];
  /** Fix suggestions collected */
  suggestions: FixSuggestion[];
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
    options: mergedOptions,
    active: true,
    chains: [],
    suggestions: [],
  };

  // Set up scanner event handlers
  setupScannerEvents(session);

  // Start TUI if not silent
  if (!mergedOptions.silent) {
    session.tui = new TUI(mergedOptions.target);
    setupTUIEvents(session);
    session.tui.start();
  }

  // Print startup message
  if (mergedOptions.silent) {
    logger.info(`Starting scan of ${mergedOptions.target}`);
  }

  try {
    // Start the scanner
    session.scanner.start();

    // In a real implementation, this is where we would:
    // 1. Launch browser with Puppeteer (or start proxy)
    // 2. Connect WebSocket to browser
    // 3. Wait for data to flow

    // For now, we simulate with a placeholder
    if (mergedOptions.silent && mergedOptions.duration) {
      // Wait for specified duration
      await new Promise((resolve) => setTimeout(resolve, mergedOptions.duration! * 1000));
      session.active = false;
    } else if (!mergedOptions.silent) {
      // Wait for TUI quit event
      await waitForQuit(session);
    } else {
      // Watch mode or interactive
      logger.info('Press Ctrl+C to stop scanning');
      await waitForSignal();
      session.active = false;
    }

    // Stop scanner
    session.scanner.stop();

    // Stop TUI
    if (session.tui) {
      session.tui.stop();
    }

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
    if (session.tui) {
      session.tui.stop();
    }
    logger.error('Scan failed:', error);
    return 2;
  }
}

/**
 * Set up scanner event handlers
 */
function setupScannerEvents(session: ScanSession): void {
  const { scanner, tui } = session;

  scanner.on('render', (info) => {
    if (tui) {
      tui.update({
        components: scanner.getSnapshot(),
        summary: scanner.getSummary(),
        fps: scanner.getFps(),
      });
    }
  });

  scanner.on('chain', (chain) => {
    session.chains.push(chain);
    if (tui) {
      tui.update({ chains: session.chains.slice(-10) });
    }
  });

  scanner.on('fix', (suggestion) => {
    // Avoid duplicates
    if (!session.suggestions.some((s) =>
      s.componentName === suggestion.componentName && s.fix === suggestion.fix
    )) {
      session.suggestions.push(suggestion);
      if (tui) {
        tui.update({ suggestions: session.suggestions });
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
 * Wait for interrupt signal
 */
async function waitForSignal(): Promise<void> {
  return new Promise((resolve) => {
    process.once('SIGINT', () => resolve());
    process.once('SIGTERM', () => resolve());
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
