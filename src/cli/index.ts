/**
 * CLI entry point
 * @packageDocumentation
 */

import { parseArgs, validateArgs, getHelpText } from './args.js';
import { runScanCommand } from './commands/scan.js';
import { runInitCommand } from './commands/init.js';
import { runInteractiveWizard } from './interactive.js';
import { Logger, LogLevel } from '../utils/logger.js';
import { colors, semantic } from '../utils/colors.js';

const logger = new Logger({ prefix: 'ReactCheck', level: LogLevel.INFO });

/**
 * Package version
 */
const VERSION = '1.1.6';

/**
 * Print version information
 */
function printVersion(): void {
  // eslint-disable-next-line no-console
  console.log(`@oxog/react-check v${VERSION}`);
}

/**
 * Print help message
 */
function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(getHelpText());
}

/**
 * Print banner
 */
function printBanner(): void {
  const banner = `
${colors.cyan}╔═══════════════════════════════════════════════════════════╗
║                                                               ║
║   ${colors.bold}ReactCheck${colors.reset}${colors.cyan} - Scan, diagnose, and fix React performance   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝${colors.reset}
`;
  // eslint-disable-next-line no-console
  console.log(banner);
}

/**
 * Main CLI class
 */
export class CLI {
  /** Raw arguments */
  private argv: string[];

  /**
   * Create CLI instance
   * @param argv - Command line arguments
   */
  constructor(argv: string[]) {
    this.argv = argv;
  }

  /**
   * Convert wizard config to ParsedArgs
   * @param config - Wizard configuration
   * @returns Parsed arguments for scan command
   */
  private wizardConfigToArgs(config: import('./interactive.js').WizardConfig): import('./args.js').ParsedArgs {
    const flags = new Map<string, string | boolean>();

    // Set mode flags
    if (config.mode === 'tui') {
      flags.set('tui', true);
    } else if (config.mode === 'webui') {
      flags.set('webui', true);
      flags.set('webui-port', String(config.webuiPort));
    } else if (config.mode === 'headless') {
      flags.set('silent', true);
    }

    // Set duration
    if (config.duration) {
      flags.set('duration', String(config.duration));
    }

    // Set thresholds
    flags.set('threshold-warning', String(config.warningThreshold));
    flags.set('threshold-critical', String(config.criticalThreshold));

    // Set report options
    if (config.reportFormats.length > 0) {
      flags.set('report', true);
      if (config.reportFormats.length === 3) {
        flags.set('format', 'all');
      } else {
        // Use first format (most common case)
        const firstFormat = config.reportFormats[0];
        if (firstFormat) {
          flags.set('format', firstFormat);
        }
      }
    }

    // Set output directory
    flags.set('output', config.outputDir);

    // Set headless browser mode
    flags.set('headless', config.headless);

    return {
      command: 'scan',
      target: config.url,
      flags,
      positional: [],
      raw: [],
    };
  }

  /**
   * Run the CLI
   * @returns Exit code
   */
  async run(): Promise<number> {
    try {
      // Parse arguments
      const args = parseArgs(this.argv);

      // Handle commands
      switch (args.command) {
        case 'version':
          printVersion();
          return 0;

        case 'help':
          printBanner();
          printHelp();
          return 0;

        case 'init':
          printBanner();
          return await runInitCommand(args);

        case 'scan':
        default:
          // Check if no target URL provided - launch interactive wizard
          if (!args.target && args.raw.length === 0 && process.stdin.isTTY) {
            printBanner();
            const wizardConfig = await runInteractiveWizard();
            if (!wizardConfig) {
              // User cancelled
              return 0;
            }

            // Convert wizard config to ParsedArgs
            const wizardArgs = this.wizardConfigToArgs(wizardConfig);
            return await runScanCommand(wizardArgs);
          }

          // Validate arguments
          const errors = validateArgs(args);
          if (errors.length > 0) {
            for (const error of errors) {
              logger.error(error);
            }
            // eslint-disable-next-line no-console
            console.log('');
            // eslint-disable-next-line no-console
            console.log('Run ' + colors.cyan + 'react-check --help' + colors.reset + ' for usage information.');
            return 2;
          }

          // Run scan command
          return await runScanCommand(args);
      }
    } catch (error) {
      logger.error('Unexpected error:', error);
      return 1;
    }
  }
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  // Catch unhandled errors globally
  process.on('uncaughtException', (error) => {
    // eslint-disable-next-line no-console
    console.error(semantic.error('Uncaught exception:'), error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error(semantic.error('Unhandled rejection:'), reason);
    process.exit(1);
  });

  const cli = new CLI(process.argv.slice(2));
  const exitCode = await cli.run();
  process.exit(exitCode);
}

// Run if executed directly (not in test environment)
if (!process.env.VITEST) {
  main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(semantic.error('Fatal error:'), error);
    process.exit(1);
  });
}

export { parseArgs, validateArgs, getHelpText } from './args.js';
export { loadConfig, validateConfig, generateDefaultConfigContent } from './config.js';
export { TUI } from './tui/index.js';
export { InteractiveWizard, runInteractiveWizard } from './interactive.js';
