/**
 * CLI entry point
 * @packageDocumentation
 */

import { parseArgs, validateArgs, getHelpText, type Command } from './args.js';
import { runScanCommand } from './commands/scan.js';
import { runInitCommand } from './commands/init.js';
import { Logger, LogLevel } from '../utils/logger.js';
import { colors, semantic } from '../utils/colors.js';

const logger = new Logger({ prefix: 'ReactCheck', level: LogLevel.INFO });

/**
 * Package version
 */
const VERSION = '1.1.2';

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
