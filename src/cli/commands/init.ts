/**
 * Init command implementation
 * @packageDocumentation
 */

import type { ParsedArgs } from '../args.js';
import { generateDefaultConfigContent, validateConfig } from '../config.js';
import { exists, writeTextFile, readTextFile } from '../../utils/fs.js';
import { Logger, LogLevel } from '../../utils/logger.js';
import { colors, semantic } from '../../utils/colors.js';

const logger = new Logger({ prefix: 'init', level: LogLevel.INFO });

/**
 * Default config filename
 */
const DEFAULT_CONFIG_NAME = 'reactcheck.config.js';

/**
 * Run the init command
 * @param args - Parsed CLI arguments
 * @returns Exit code
 */
export async function runInitCommand(args: ParsedArgs): Promise<number> {
  const configPath = args.positional[0] ?? DEFAULT_CONFIG_NAME;

  // Check if config already exists
  if (await exists(configPath)) {
    logger.warn(`Config file already exists: ${configPath}`);

    // Check if it's a valid config
    try {
      const content = await readTextFile(configPath);
      if (configPath.endsWith('.json')) {
        const config = JSON.parse(content) as unknown;
        const errors = validateConfig(config as Record<string, unknown>);
        if (errors.length > 0) {
          logger.warn('Existing config has validation errors:');
          for (const error of errors) {
            logger.warn(`  - ${error}`);
          }
        } else {
          logger.info('Existing config is valid.');
        }
      }
    } catch (error) {
      logger.warn('Could not validate existing config:', error);
    }

    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log(colors.yellow + '? Overwrite existing config? (y/N) ' + colors.reset);

    // In a real implementation, we would wait for user input
    // For now, we'll just exit without overwriting
    logger.info('To overwrite, delete the existing file and run init again.');
    return 0;
  }

  // Determine format from filename
  const format = configPath.endsWith('.json') ? 'json' : 'js';

  // Generate config content
  const content = generateDefaultConfigContent(format);

  // Write config file
  try {
    await writeTextFile(configPath, content);

    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log(semantic.success(`Created ${configPath}`));
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('You can now customize your ReactCheck configuration.');
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('Configuration options:');
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log(`  ${colors.cyan}include${colors.reset}     Components to analyze (glob patterns)`);
    // eslint-disable-next-line no-console
    console.log(`  ${colors.cyan}exclude${colors.reset}     Components to ignore`);
    // eslint-disable-next-line no-console
    console.log(`  ${colors.cyan}thresholds${colors.reset}  Severity thresholds (critical, warning, fps)`);
    // eslint-disable-next-line no-console
    console.log(`  ${colors.cyan}report${colors.reset}      Report generation settings`);
    // eslint-disable-next-line no-console
    console.log(`  ${colors.cyan}rules${colors.reset}       Custom rule configuration`);
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('Run your first scan:');
    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log(`  ${colors.green}npx @oxog/react-check localhost:3000${colors.reset}`);
    // eslint-disable-next-line no-console
    console.log('');

    return 0;
  } catch (error) {
    logger.error(`Failed to create config file:`, error);
    return 1;
  }
}

/**
 * Print example configurations
 */
export function printExampleConfigs(): void {
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log(colors.bold + 'Example Configurations' + colors.reset);
  // eslint-disable-next-line no-console
  console.log('');

  // Strict configuration
  // eslint-disable-next-line no-console
  console.log(colors.cyan + '// Strict configuration' + colors.reset);
  // eslint-disable-next-line no-console
  console.log(`export default {
  thresholds: {
    critical: 30,
    warning: 10,
    fps: 50
  },
  rules: {
    'prefer-memo': 'error',
    'no-inline-functions': 'error'
  }
};`);
  // eslint-disable-next-line no-console
  console.log('');

  // CI/CD configuration
  // eslint-disable-next-line no-console
  console.log(colors.cyan + '// CI/CD configuration' + colors.reset);
  // eslint-disable-next-line no-console
  console.log(`export default {
  report: {
    formats: ['json'],
    output: './ci-reports'
  },
  exclude: [
    '**/test/**',
    '**/__mocks__/**'
  ]
};`);
  // eslint-disable-next-line no-console
  console.log('');

  // Focus on specific components
  // eslint-disable-next-line no-console
  console.log(colors.cyan + '// Focus on specific components' + colors.reset);
  // eslint-disable-next-line no-console
  console.log(`export default {
  include: [
    'src/components/Dashboard/**',
    'src/features/checkout/**'
  ],
  thresholds: {
    critical: 100,  // Allow more renders for complex components
    warning: 50
  }
};`);
  // eslint-disable-next-line no-console
  console.log('');
}
