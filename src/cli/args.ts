/**
 * Command line argument parser
 * @packageDocumentation
 */

/**
 * Supported CLI commands
 */
export type Command = 'scan' | 'init' | 'help' | 'version';

/**
 * Parsed command line arguments
 */
export interface ParsedArgs {
  /** Command to execute */
  command: Command;
  /** Target URL (for scan command) */
  target?: string;
  /** Flag values */
  flags: Map<string, string | boolean>;
  /** Positional arguments after command */
  positional: string[];
  /** Original arguments */
  raw: string[];
}

/**
 * Argument definition for validation
 */
interface ArgDef {
  /** Short flag (single character) */
  short?: string;
  /** Description for help */
  description: string;
  /** Whether flag takes a value */
  takesValue?: boolean;
  /** Default value */
  default?: string | boolean;
  /** Value choices */
  choices?: string[];
}

/**
 * Supported command line flags
 */
const FLAG_DEFINITIONS: Record<string, ArgDef> = {
  help: {
    short: 'h',
    description: 'Show help message',
    default: false,
  },
  version: {
    short: 'v',
    description: 'Show version number',
    default: false,
  },
  proxy: {
    short: 'P',
    description: 'Start proxy server for manual browser',
    default: false,
  },
  tui: {
    short: 't',
    description: 'Terminal UI only (no browser)',
    default: false,
  },
  silent: {
    short: 's',
    description: 'Headless mode for CI/CD',
    default: false,
  },
  report: {
    short: 'r',
    description: 'Generate reports',
    default: false,
  },
  format: {
    short: 'f',
    description: 'Report format(s)',
    takesValue: true,
    default: 'all',
    choices: ['html', 'json', 'md', 'all'],
  },
  output: {
    short: 'o',
    description: 'Report output directory',
    takesValue: true,
    default: './reactcheck-reports',
  },
  fix: {
    description: 'Show fix suggestions',
    default: false,
  },
  verbose: {
    description: 'Include detailed output',
    default: false,
  },
  config: {
    short: 'c',
    description: 'Config file path',
    takesValue: true,
  },
  port: {
    short: 'p',
    description: 'WebSocket server port',
    takesValue: true,
    default: '3099',
  },
  'threshold-critical': {
    description: 'Critical threshold for render count',
    takesValue: true,
    default: '50',
  },
  'threshold-warning': {
    description: 'Warning threshold for render count',
    takesValue: true,
    default: '20',
  },
  'fps-threshold': {
    description: 'FPS drop threshold',
    takesValue: true,
    default: '30',
  },
  headless: {
    description: 'Run browser in headless mode',
    default: false,
  },
  duration: {
    short: 'd',
    description: 'Maximum scan duration in seconds',
    takesValue: true,
  },
  watch: {
    short: 'w',
    description: 'Watch mode - keep scanning until quit',
    default: false,
  },
  webui: {
    short: 'W',
    description: 'Enable WebUI dashboard',
    default: false,
  },
  'webui-port': {
    description: 'WebUI dashboard port',
    takesValue: true,
    default: '3199',
  },
};

/**
 * Build a map of short flags to long flags
 */
function buildShortFlagMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [long, def] of Object.entries(FLAG_DEFINITIONS)) {
    if (def.short) {
      map.set(def.short, long);
    }
  }
  return map;
}

const SHORT_FLAGS = buildShortFlagMap();

/**
 * Parse command line arguments
 * @param argv - Arguments (typically process.argv.slice(2))
 * @returns Parsed arguments
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    command: 'scan',
    flags: new Map(),
    positional: [],
    raw: argv,
  };

  // Set defaults
  for (const [name, def] of Object.entries(FLAG_DEFINITIONS)) {
    if (def.default !== undefined) {
      result.flags.set(name, def.default);
    }
  }

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === undefined) {
      i++;
      continue;
    }

    // Check for commands first (before any flags)
    if (i === 0 || (result.positional.length === 0 && !result.target)) {
      if (arg === 'scan') {
        // Explicit scan command - just skip it (scan is already default)
        result.command = 'scan';
        i++;
        continue;
      }
      if (arg === 'init') {
        result.command = 'init';
        i++;
        continue;
      }
      if (arg === 'help' || arg === '--help' || arg === '-h') {
        result.command = 'help';
        i++;
        continue;
      }
      if (arg === 'version' || arg === '--version' || arg === '-v') {
        result.command = 'version';
        i++;
        continue;
      }
    }

    // Long flag with value: --flag=value
    if (arg.startsWith('--') && arg.includes('=')) {
      const eqIndex = arg.indexOf('=');
      const flagName = arg.slice(2, eqIndex);
      const value = arg.slice(eqIndex + 1);
      result.flags.set(flagName, value);
      i++;
      continue;
    }

    // Long flag: --flag or --flag value
    if (arg.startsWith('--')) {
      const flagName = arg.slice(2);
      const def = FLAG_DEFINITIONS[flagName];

      if (def?.takesValue) {
        // Check for next arg as value
        const nextArg = argv[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          result.flags.set(flagName, nextArg);
          i += 2;
          continue;
        }
      }

      // Boolean flag
      result.flags.set(flagName, true);
      i++;
      continue;
    }

    // Short flag: -f or -f value or -abc (combined)
    if (arg.startsWith('-') && arg.length >= 2 && !arg.startsWith('--')) {
      const shortFlag = arg.slice(1, 2);
      const longFlag = SHORT_FLAGS.get(shortFlag);

      if (longFlag) {
        const def = FLAG_DEFINITIONS[longFlag];

        // Check for value attached: -fvalue (only if flag takes value)
        if (arg.length > 2 && def?.takesValue) {
          result.flags.set(longFlag, arg.slice(2));
          i++;
          continue;
        }

        // Check for combined flags: -rst (multiple boolean flags)
        if (arg.length > 2 && !def?.takesValue) {
          // This is combined flags like -rst
          for (let j = 1; j < arg.length; j++) {
            const sf = arg[j];
            if (sf) {
              const lf = SHORT_FLAGS.get(sf);
              if (lf) {
                result.flags.set(lf, true);
              }
            }
          }
          i++;
          continue;
        }

        if (def?.takesValue) {
          const nextArg = argv[i + 1];
          if (nextArg && !nextArg.startsWith('-')) {
            result.flags.set(longFlag, nextArg);
            i += 2;
            continue;
          }
        }

        result.flags.set(longFlag, true);
        i++;
        continue;
      }

      // Handle multiple short flags when first char is not a known flag: -abc
      if (arg.length > 2) {
        for (let j = 1; j < arg.length; j++) {
          const sf = arg[j];
          if (sf) {
            const lf = SHORT_FLAGS.get(sf);
            if (lf) {
              result.flags.set(lf, true);
            }
          }
        }
        i++;
        continue;
      }
    }

    // Positional argument
    if (!arg.startsWith('-')) {
      // First positional is target URL
      if (!result.target && result.command === 'scan') {
        result.target = arg;
      } else {
        result.positional.push(arg);
      }
      i++;
      continue;
    }

    // Unknown flag
    i++;
  }

  // Handle --help and --version flags as commands
  if (result.flags.get('help') === true) {
    result.command = 'help';
  }
  if (result.flags.get('version') === true) {
    result.command = 'version';
  }

  return result;
}

/**
 * Get a flag value as string
 * @param args - Parsed arguments
 * @param name - Flag name
 * @returns String value or undefined
 */
export function getStringFlag(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags.get(name);
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

/**
 * Get a flag value as boolean
 * @param args - Parsed arguments
 * @param name - Flag name
 * @returns Boolean value
 */
export function getBooleanFlag(args: ParsedArgs, name: string): boolean {
  const value = args.flags.get(name);
  return value === true || value === 'true';
}

/**
 * Get a flag value as number
 * @param args - Parsed arguments
 * @param name - Flag name
 * @returns Number value or undefined
 */
export function getNumberFlag(args: ParsedArgs, name: string): number | undefined {
  const value = args.flags.get(name);
  if (typeof value === 'string') {
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}

/**
 * Validate parsed arguments
 * @param args - Parsed arguments
 * @returns Validation errors (empty if valid)
 */
export function validateArgs(args: ParsedArgs): string[] {
  const errors: string[] = [];

  // Scan command requires target
  if (args.command === 'scan' && !args.target) {
    errors.push('Target URL is required for scan command');
  }

  // Validate URL format
  if (args.target) {
    try {
      // Add protocol if missing
      const url = args.target.includes('://')
        ? args.target
        : `http://${args.target}`;
      new URL(url);
    } catch {
      errors.push(`Invalid URL: ${args.target}`);
    }
  }

  // Validate format choice
  const format = getStringFlag(args, 'format');
  if (format && !['html', 'json', 'md', 'all'].includes(format)) {
    errors.push(`Invalid format: ${format}. Must be one of: html, json, md, all`);
  }

  // Validate port
  const port = getNumberFlag(args, 'port');
  if (port !== undefined && (port < 1 || port > 65535)) {
    errors.push(`Invalid port: ${port}. Must be between 1 and 65535`);
  }

  // Validate thresholds
  const critical = getNumberFlag(args, 'threshold-critical');
  const warning = getNumberFlag(args, 'threshold-warning');
  if (critical !== undefined && warning !== undefined && critical <= warning) {
    errors.push('Critical threshold must be greater than warning threshold');
  }

  return errors;
}

/**
 * Generate help text
 * @returns Help message
 */
export function getHelpText(): string {
  const lines: string[] = [
    '',
    'ReactCheck - Scan, diagnose, and fix React performance issues',
    '',
    'Usage:',
    '  react-check <url> [options]     Scan a React application',
    '  react-check init                Create default config file',
    '  react-check help                Show this help message',
    '  react-check version             Show version number',
    '',
    'Options:',
  ];

  // Group flags
  const groups: Record<string, string[]> = {
    'General': ['help', 'version', 'verbose', 'config'],
    'Mode': ['proxy', 'tui', 'silent', 'headless', 'watch'],
    'Report': ['report', 'format', 'output', 'fix'],
    'Thresholds': ['threshold-critical', 'threshold-warning', 'fps-threshold'],
    'Network': ['port', 'duration'],
  };

  for (const [group, flagNames] of Object.entries(groups)) {
    lines.push('');
    lines.push(`  ${group}:`);

    for (const name of flagNames) {
      const def = FLAG_DEFINITIONS[name];
      if (!def) continue;

      let flagStr = `    --${name}`;
      if (def.short) {
        flagStr = `    -${def.short}, --${name}`;
      }
      if (def.takesValue) {
        flagStr += ' <value>';
      }

      const padding = Math.max(0, 35 - flagStr.length);
      let desc = def.description;
      if (def.default !== undefined && def.default !== false) {
        desc += ` (default: ${def.default})`;
      }
      if (def.choices) {
        desc += ` [${def.choices.join(', ')}]`;
      }

      lines.push(`${flagStr}${' '.repeat(padding)}${desc}`);
    }
  }

  lines.push('');
  lines.push('Examples:');
  lines.push('  react-check localhost:3000');
  lines.push('  react-check https://myapp.dev --report --format=html');
  lines.push('  react-check localhost:3000 --proxy --fix --verbose');
  lines.push('  react-check localhost:3000 --silent --report --output=./ci-reports');
  lines.push('');
  lines.push('Documentation: https://ersinkoc.github.io/reactcheck');
  lines.push('');

  return lines.join('\n');
}

/**
 * Normalize target URL
 * @param target - Raw target string
 * @returns Normalized URL
 */
export function normalizeTarget(target: string): string {
  // Add protocol if missing
  if (!target.includes('://')) {
    return `http://${target}`;
  }
  return target;
}

/**
 * Get flag definitions for external use
 * @returns Flag definitions
 */
export function getFlagDefinitions(): Record<string, ArgDef> {
  return { ...FLAG_DEFINITIONS };
}
