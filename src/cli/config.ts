/**
 * Configuration file loader
 * @packageDocumentation
 */

import type { ReactCheckConfig, ThresholdOptions, ReportOptions, RuleOptions } from '../types.js';
import { exists, readTextFile, findUp, getDirName, joinPath } from '../utils/fs.js';
import { Logger, LogLevel } from '../utils/logger.js';

const logger = new Logger({ prefix: 'config', level: LogLevel.WARN });

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<ReactCheckConfig> = {
  extends: '',
  include: [],
  exclude: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*'],
  thresholds: {
    critical: 50,
    warning: 20,
    fps: 30,
  },
  report: {
    formats: ['html', 'json'],
    output: './reactcheck-reports',
    includeSourceCode: false,
  },
  rules: {},
};

/**
 * Config file names to search for
 */
const CONFIG_FILE_NAMES = [
  'reactcheck.config.js',
  'reactcheck.config.mjs',
  'reactcheck.config.cjs',
  'reactcheck.config.json',
  '.reactcheckrc',
  '.reactcheckrc.js',
  '.reactcheckrc.json',
];

/**
 * Loaded configuration with metadata
 */
export interface LoadedConfig {
  /** Resolved configuration */
  config: Required<ReactCheckConfig>;
  /** Path to loaded config file (if any) */
  configPath: string | null;
  /** Whether config was loaded from file */
  fromFile: boolean;
}

/**
 * Load configuration from file or defaults
 * @param configPath - Explicit config path (optional)
 * @param cwd - Working directory for search
 * @returns Loaded configuration
 */
export async function loadConfig(
  configPath?: string,
  cwd: string = process.cwd()
): Promise<LoadedConfig> {
  // Start with defaults (deep copy)
  let config: Required<ReactCheckConfig> = getDefaultConfig();
  let loadedPath: string | null = null;

  // If explicit path provided, use it
  if (configPath) {
    if (await exists(configPath)) {
      const fileConfig = await loadConfigFile(configPath);
      if (fileConfig) {
        config = mergeConfig(config, fileConfig);
        loadedPath = configPath;
      }
    } else {
      logger.warn(`Config file not found: ${configPath}`);
    }
  } else {
    // Search for config file
    for (const name of CONFIG_FILE_NAMES) {
      const foundPath = await findUp(name, cwd);
      if (foundPath) {
        const fileConfig = await loadConfigFile(foundPath);
        if (fileConfig) {
          config = mergeConfig(config, fileConfig);
          loadedPath = foundPath;
          break;
        }
      }
    }
  }

  // Handle extends
  if (config.extends && loadedPath) {
    const baseDir = getDirName(loadedPath);
    const extendsPath = joinPath(baseDir, config.extends);

    if (await exists(extendsPath)) {
      const baseConfig = await loadConfigFile(extendsPath);
      if (baseConfig) {
        // Base config first, then current config overrides
        config = mergeConfig(mergeConfig(getDefaultConfig(), baseConfig), config);
      }
    } else {
      logger.warn(`Extended config not found: ${config.extends}`);
    }
  }

  return {
    config,
    configPath: loadedPath,
    fromFile: loadedPath !== null,
  };
}

/**
 * Load a config file by path
 * @param path - Config file path
 * @returns Parsed config or null
 */
async function loadConfigFile(path: string): Promise<ReactCheckConfig | null> {
  try {
    if (path.endsWith('.json') || path.endsWith('.reactcheckrc')) {
      const content = await readTextFile(path);
      return JSON.parse(content) as ReactCheckConfig;
    }

    if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) {
      // Dynamic import for JS configs
      const fileUrl = `file://${path.replace(/\\/g, '/')}`;
      const module = await import(fileUrl) as { default?: ReactCheckConfig };
      return module.default ?? null;
    }

    // Try JSON parse for other files
    const content = await readTextFile(path);
    return JSON.parse(content) as ReactCheckConfig;
  } catch (error) {
    logger.warn(`Failed to load config from ${path}:`, error);
    return null;
  }
}

/**
 * Merge two configs, with second taking precedence
 * @param base - Base configuration
 * @param override - Override configuration
 * @returns Merged configuration
 */
function mergeConfig(
  base: Required<ReactCheckConfig>,
  override: ReactCheckConfig
): Required<ReactCheckConfig> {
  return {
    extends: override.extends ?? base.extends,
    include: override.include ?? base.include,
    exclude: override.exclude ?? base.exclude,
    thresholds: {
      ...base.thresholds,
      ...override.thresholds,
    },
    report: {
      ...base.report,
      ...override.report,
    } as Required<ReportOptions> & { enabled: boolean },
    rules: {
      ...base.rules,
      ...override.rules,
    },
  };
}

/**
 * Validate a configuration object
 * @param config - Configuration to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateConfig(config: ReactCheckConfig): string[] {
  const errors: string[] = [];

  // Validate thresholds
  if (config.thresholds) {
    const { critical, warning, fps } = config.thresholds;

    if (critical !== undefined && (typeof critical !== 'number' || critical < 1)) {
      errors.push('thresholds.critical must be a positive number');
    }

    if (warning !== undefined && (typeof warning !== 'number' || warning < 1)) {
      errors.push('thresholds.warning must be a positive number');
    }

    if (
      critical !== undefined &&
      warning !== undefined &&
      critical <= warning
    ) {
      errors.push('thresholds.critical must be greater than thresholds.warning');
    }

    if (fps !== undefined && (typeof fps !== 'number' || fps < 1 || fps > 120)) {
      errors.push('thresholds.fps must be a number between 1 and 120');
    }
  }

  // Validate report
  if (config.report) {
    if (config.report.formats) {
      const validFormats = ['html', 'json', 'md'];
      for (const format of config.report.formats) {
        if (!validFormats.includes(format)) {
          errors.push(`Invalid report format: ${format}`);
        }
      }
    }

    if (config.report.output && typeof config.report.output !== 'string') {
      errors.push('report.output must be a string');
    }
  }

  // Validate rules
  if (config.rules) {
    const validLevels = ['off', 'warn', 'error'];
    for (const [rule, level] of Object.entries(config.rules)) {
      if (Array.isArray(level)) {
        if (!validLevels.includes(level[0])) {
          errors.push(`Invalid rule level for ${rule}: ${level[0]}`);
        }
      } else if (!validLevels.includes(level)) {
        errors.push(`Invalid rule level for ${rule}: ${level}`);
      }
    }
  }

  // Validate include/exclude patterns
  if (config.include) {
    if (!Array.isArray(config.include)) {
      errors.push('include must be an array');
    }
  }

  if (config.exclude) {
    if (!Array.isArray(config.exclude)) {
      errors.push('exclude must be an array');
    }
  }

  return errors;
}

/**
 * Get default configuration
 * @returns Default config
 */
export function getDefaultConfig(): Required<ReactCheckConfig> {
  return {
    extends: DEFAULT_CONFIG.extends,
    include: [...DEFAULT_CONFIG.include],
    exclude: [...DEFAULT_CONFIG.exclude],
    thresholds: { ...DEFAULT_CONFIG.thresholds },
    report: { ...DEFAULT_CONFIG.report },
    rules: { ...DEFAULT_CONFIG.rules },
  };
}

/**
 * Generate default config file content
 * @param format - Output format
 * @returns Config file content
 */
export function generateDefaultConfigContent(format: 'js' | 'json' = 'js'): string {
  if (format === 'json') {
    return JSON.stringify(
      {
        include: [],
        exclude: DEFAULT_CONFIG.exclude,
        thresholds: DEFAULT_CONFIG.thresholds,
        report: {
          formats: DEFAULT_CONFIG.report.formats,
          output: DEFAULT_CONFIG.report.output,
        },
        rules: {},
      },
      null,
      2
    );
  }

  return `/** @type {import('@oxog/react-check').ReactCheckConfig} */
export default {
  // Components to include (glob patterns)
  include: [],

  // Components to exclude
  exclude: ${JSON.stringify(DEFAULT_CONFIG.exclude, null, 4).replace(/\n/g, '\n  ')},

  // Severity thresholds
  thresholds: {
    critical: ${DEFAULT_CONFIG.thresholds.critical},  // Render count for critical severity
    warning: ${DEFAULT_CONFIG.thresholds.warning},   // Render count for warning severity
    fps: ${DEFAULT_CONFIG.thresholds.fps},        // FPS drop threshold
  },

  // Report settings
  report: {
    formats: ${JSON.stringify(DEFAULT_CONFIG.report.formats)},
    output: '${DEFAULT_CONFIG.report.output}',
  },

  // Custom rules (uncomment to enable)
  rules: {
    // 'no-inline-functions': 'warn',
    // 'prefer-memo': 'error',
    // 'context-size': ['warn', { maxConsumers: 10 }],
  },
};
`;
}

/**
 * Convert config to CLI-compatible options
 * @param config - Configuration
 * @returns CLI options object
 */
export function configToOptions(config: Required<ReactCheckConfig>): {
  thresholds: ThresholdOptions;
  report: ReportOptions & { enabled: boolean };
  rules: RuleOptions;
  include: string[];
  exclude: string[];
} {
  return {
    thresholds: config.thresholds,
    report: {
      enabled: true,
      ...config.report,
    },
    rules: config.rules,
    include: config.include,
    exclude: config.exclude,
  };
}
