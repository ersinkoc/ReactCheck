/**
 * Logging utility for ReactCheck
 * @packageDocumentation
 */

import { colors, semantic } from './colors.js';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * Log level names for display
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.SILENT]: 'SILENT',
};

/**
 * Parse log level from string
 * @param level - Level string
 * @returns LogLevel enum value
 */
export function parseLogLevel(level: string): LogLevel {
  const normalized = level.toUpperCase();
  switch (normalized) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
    case 'WARNING':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    case 'SILENT':
    case 'NONE':
      return LogLevel.SILENT;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Logger options
 */
export interface LoggerOptions {
  /** Logger prefix/namespace */
  prefix?: string;
  /** Minimum log level to output */
  level?: LogLevel;
  /** Whether to show timestamps */
  showTimestamp?: boolean;
  /** Whether to show log level */
  showLevel?: boolean;
  /** Custom output stream (defaults to console) */
  output?: {
    log: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private prefix: string;
  private level: LogLevel;
  private showTimestamp: boolean;
  private showLevel: boolean;
  private output: NonNullable<LoggerOptions['output']>;

  /**
   * Create a new Logger instance
   * @param options - Logger configuration
   */
  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix ?? '';
    this.level = options.level ?? LogLevel.INFO;
    this.showTimestamp = options.showTimestamp ?? false;
    this.showLevel = options.showLevel ?? true;
    this.output = options.output ?? {
      /* eslint-disable no-console */
      log: (msg) => console.log(msg),
      warn: (msg) => console.warn(msg),
      error: (msg) => console.error(msg),
      /* eslint-enable no-console */
    };
  }

  /**
   * Format a log message
   * @param level - Log level
   * @param message - Message to format
   * @returns Formatted message
   */
  private format(level: LogLevel, message: string): string {
    const parts: string[] = [];

    // Timestamp
    if (this.showTimestamp) {
      const now = new Date();
      const time = now.toISOString().slice(11, 23); // HH:mm:ss.SSS
      parts.push(semantic.secondary(`[${time}]`));
    }

    // Level
    if (this.showLevel) {
      const levelName = LOG_LEVEL_NAMES[level] ?? 'UNKNOWN';
      let levelStr: string;
      switch (level) {
        case LogLevel.DEBUG:
          levelStr = semantic.secondary(levelName);
          break;
        case LogLevel.INFO:
          levelStr = semantic.info(levelName);
          break;
        case LogLevel.WARN:
          levelStr = semantic.warning(levelName);
          break;
        case LogLevel.ERROR:
          levelStr = semantic.error(levelName);
          break;
        default:
          levelStr = levelName;
      }
      parts.push(`[${levelStr}]`);
    }

    // Prefix
    if (this.prefix) {
      parts.push(semantic.highlight(`[${this.prefix}]`));
    }

    // Message
    parts.push(message);

    return parts.join(' ');
  }

  /**
   * Log a debug message
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.level > LogLevel.DEBUG) return;
    const formatted = this.format(LogLevel.DEBUG, message);
    if (args.length > 0) {
      this.output.log(formatted + ' ' + args.map(String).join(' '));
    } else {
      this.output.log(formatted);
    }
  }

  /**
   * Log an info message
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  info(message: string, ...args: unknown[]): void {
    if (this.level > LogLevel.INFO) return;
    const formatted = this.format(LogLevel.INFO, message);
    if (args.length > 0) {
      this.output.log(formatted + ' ' + args.map(String).join(' '));
    } else {
      this.output.log(formatted);
    }
  }

  /**
   * Log a warning message
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.level > LogLevel.WARN) return;
    const formatted = this.format(LogLevel.WARN, message);
    if (args.length > 0) {
      this.output.warn(formatted + ' ' + args.map(String).join(' '));
    } else {
      this.output.warn(formatted);
    }
  }

  /**
   * Log an error message
   * @param message - Message to log
   * @param args - Additional arguments to log
   */
  error(message: string, ...args: unknown[]): void {
    if (this.level > LogLevel.ERROR) return;
    const formatted = this.format(LogLevel.ERROR, message);
    if (args.length > 0) {
      this.output.error(formatted + ' ' + args.map(String).join(' '));
    } else {
      this.output.error(formatted);
    }
  }

  /**
   * Log a success message (always shown unless silent)
   * @param message - Message to log
   */
  success(message: string): void {
    if (this.level >= LogLevel.SILENT) return;
    const prefix = this.prefix ? `[${semantic.highlight(this.prefix)}] ` : '';
    this.output.log(prefix + semantic.success('✓ ') + message);
  }

  /**
   * Log a failure message (always shown unless silent)
   * @param message - Message to log
   */
  fail(message: string): void {
    if (this.level >= LogLevel.SILENT) return;
    const prefix = this.prefix ? `[${semantic.highlight(this.prefix)}] ` : '';
    this.output.error(prefix + semantic.error('✗ ') + message);
  }

  /**
   * Create a child logger with a sub-prefix
   * @param prefix - Sub-prefix for the child logger
   * @returns New Logger instance
   */
  child(prefix: string): Logger {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new Logger({
      prefix: childPrefix,
      level: this.level,
      showTimestamp: this.showTimestamp,
      showLevel: this.showLevel,
      output: this.output,
    });
  }

  /**
   * Set the log level
   * @param level - New log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current log level
   * @returns Current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Check if a log level is enabled
   * @param level - Level to check
   * @returns true if the level would be logged
   */
  isLevelEnabled(level: LogLevel): boolean {
    return this.level <= level;
  }

  /**
   * Create a timer for performance logging
   * @param label - Timer label
   * @returns Object with end() method to log duration
   */
  time(label: string): { end: () => void } {
    const start = performance.now();
    return {
      end: () => {
        const duration = performance.now() - start;
        this.debug(`${label}: ${duration.toFixed(2)}ms`);
      },
    };
  }

  /**
   * Log a table of data
   * @param data - Array of objects to display
   * @param columns - Optional column names to show
   */
  table(data: Record<string, unknown>[], columns?: string[]): void {
    if (this.level >= LogLevel.SILENT) return;
    if (data.length === 0) {
      this.info('(empty table)');
      return;
    }

    const cols = columns ?? Object.keys(data[0] ?? {});
    if (cols.length === 0) {
      this.info('(no columns)');
      return;
    }

    // Calculate column widths
    const widths: Record<string, number> = {};
    for (const col of cols) {
      widths[col] = col.length;
      for (const row of data) {
        const value = String(row[col] ?? '');
        widths[col] = Math.max(widths[col] ?? 0, value.length);
      }
    }

    // Build header
    const header = cols.map((col) => col.padEnd(widths[col] ?? 0)).join(' │ ');
    const separator = cols.map((col) => '─'.repeat(widths[col] ?? 0)).join('─┼─');

    this.output.log(colors.bold + header + colors.reset);
    this.output.log(separator);

    // Build rows
    for (const row of data) {
      const line = cols.map((col) => String(row[col] ?? '').padEnd(widths[col] ?? 0)).join(' │ ');
      this.output.log(line);
    }
  }

  /**
   * Log a progress message (overwrites previous line)
   * @param message - Progress message
   */
  progress(message: string): void {
    if (this.level >= LogLevel.SILENT) return;
    if (process.stdout.isTTY) {
      process.stdout.write(`\r\x1b[K${message}`);
    }
  }

  /**
   * Clear the progress line
   */
  clearProgress(): void {
    if (process.stdout.isTTY) {
      process.stdout.write('\r\x1b[K');
    }
  }

  /**
   * Log a newline
   */
  newline(): void {
    if (this.level >= LogLevel.SILENT) return;
    this.output.log('');
  }

  /**
   * Log a horizontal rule
   * @param char - Character to use for the rule
   * @param width - Width of the rule
   */
  hr(char: string = '─', width: number = 60): void {
    if (this.level >= LogLevel.SILENT) return;
    this.output.log(colors.gray + char.repeat(width) + colors.reset);
  }

  /**
   * Group related log messages
   * @param label - Group label
   * @param fn - Function containing log calls
   */
  group(label: string, fn: () => void): void {
    if (this.level >= LogLevel.SILENT) return;
    this.output.log(colors.bold + '┌ ' + label + colors.reset);
    fn();
    this.output.log(colors.bold + '└' + '─'.repeat(label.length + 1) + colors.reset);
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger({ prefix: 'ReactCheck' });
