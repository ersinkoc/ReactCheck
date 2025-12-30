/**
 * ANSI color codes for terminal output
 * @packageDocumentation
 */

/**
 * Check if the terminal supports colors
 */
function checkColorSupport(): boolean {
  // Check for explicit color flags
  if (process.env['FORCE_COLOR'] !== undefined) {
    return process.env['FORCE_COLOR'] !== '0';
  }

  if (process.env['NO_COLOR'] !== undefined) {
    return false;
  }

  // Check if running in a TTY
  if (!process.stdout.isTTY) {
    return false;
  }

  // Check for dumb terminal
  if (process.env['TERM'] === 'dumb') {
    return false;
  }

  // Check for CI environments that support color
  if (process.env['CI'] !== undefined) {
    const ciEnvs = ['TRAVIS', 'CIRCLECI', 'GITHUB_ACTIONS', 'GITLAB_CI', 'BUILDKITE'];
    return ciEnvs.some((env) => process.env[env] !== undefined);
  }

  return true;
}

/**
 * Whether the current terminal supports ANSI colors
 */
export const supportsColor: boolean = checkColorSupport();

/**
 * ANSI escape codes for text formatting
 */
export const colors = {
  // Reset
  reset: supportsColor ? '\x1b[0m' : '',

  // Text styles
  bold: supportsColor ? '\x1b[1m' : '',
  dim: supportsColor ? '\x1b[2m' : '',
  italic: supportsColor ? '\x1b[3m' : '',
  underline: supportsColor ? '\x1b[4m' : '',
  blink: supportsColor ? '\x1b[5m' : '',
  inverse: supportsColor ? '\x1b[7m' : '',
  hidden: supportsColor ? '\x1b[8m' : '',
  strikethrough: supportsColor ? '\x1b[9m' : '',

  // Foreground colors
  black: supportsColor ? '\x1b[30m' : '',
  red: supportsColor ? '\x1b[31m' : '',
  green: supportsColor ? '\x1b[32m' : '',
  yellow: supportsColor ? '\x1b[33m' : '',
  blue: supportsColor ? '\x1b[34m' : '',
  magenta: supportsColor ? '\x1b[35m' : '',
  cyan: supportsColor ? '\x1b[36m' : '',
  white: supportsColor ? '\x1b[37m' : '',
  gray: supportsColor ? '\x1b[90m' : '',
  grey: supportsColor ? '\x1b[90m' : '',

  // Bright foreground colors
  brightRed: supportsColor ? '\x1b[91m' : '',
  brightGreen: supportsColor ? '\x1b[92m' : '',
  brightYellow: supportsColor ? '\x1b[93m' : '',
  brightBlue: supportsColor ? '\x1b[94m' : '',
  brightMagenta: supportsColor ? '\x1b[95m' : '',
  brightCyan: supportsColor ? '\x1b[96m' : '',
  brightWhite: supportsColor ? '\x1b[97m' : '',

  // Background colors
  bgBlack: supportsColor ? '\x1b[40m' : '',
  bgRed: supportsColor ? '\x1b[41m' : '',
  bgGreen: supportsColor ? '\x1b[42m' : '',
  bgYellow: supportsColor ? '\x1b[43m' : '',
  bgBlue: supportsColor ? '\x1b[44m' : '',
  bgMagenta: supportsColor ? '\x1b[45m' : '',
  bgCyan: supportsColor ? '\x1b[46m' : '',
  bgWhite: supportsColor ? '\x1b[47m' : '',
  bgGray: supportsColor ? '\x1b[100m' : '',

  // Bright background colors
  bgBrightRed: supportsColor ? '\x1b[101m' : '',
  bgBrightGreen: supportsColor ? '\x1b[102m' : '',
  bgBrightYellow: supportsColor ? '\x1b[103m' : '',
  bgBrightBlue: supportsColor ? '\x1b[104m' : '',
  bgBrightMagenta: supportsColor ? '\x1b[105m' : '',
  bgBrightCyan: supportsColor ? '\x1b[106m' : '',
  bgBrightWhite: supportsColor ? '\x1b[107m' : '',
} as const;

/**
 * Type for color keys
 */
export type ColorKey = keyof typeof colors;

/**
 * Apply color codes to text
 * @param text - Text to colorize
 * @param codes - Color codes to apply
 * @returns Colorized text
 */
export function colorize(text: string, ...codes: string[]): string {
  if (!supportsColor || codes.length === 0) {
    return text;
  }
  return codes.join('') + text + colors.reset;
}

/**
 * Create a colorizer function for a specific color
 * @param code - Color code to use
 * @returns Function that colorizes text
 */
export function createColorizer(code: string): (text: string) => string {
  return (text: string) => colorize(text, code);
}

/**
 * Semantic color functions for ReactCheck
 */
export const semantic = {
  /** Critical issues (red) */
  critical: createColorizer(colors.red),

  /** Warnings (yellow) */
  warning: createColorizer(colors.yellow),

  /** Healthy/success (green) */
  healthy: createColorizer(colors.green),

  /** Info/links (blue) */
  info: createColorizer(colors.blue),

  /** Secondary text (gray) */
  secondary: createColorizer(colors.gray),

  /** Highlighted text (cyan) */
  highlight: createColorizer(colors.cyan),

  /** Error text (bright red, bold) */
  error: (text: string): string => colorize(text, colors.brightRed, colors.bold),

  /** Success text (bright green, bold) */
  success: (text: string): string => colorize(text, colors.brightGreen, colors.bold),

  /** Title text (bold) */
  title: createColorizer(colors.bold),

  /** Dimmed text */
  dimmed: createColorizer(colors.dim),
};

/**
 * Severity level to color mapping
 */
export function getSeverityColor(severity: 'critical' | 'warning' | 'info' | 'healthy'): string {
  switch (severity) {
    case 'critical':
      return colors.red;
    case 'warning':
      return colors.yellow;
    case 'info':
      return colors.blue;
    case 'healthy':
      return colors.green;
  }
}

/**
 * Severity level emoji mapping
 */
export function getSeverityEmoji(severity: 'critical' | 'warning' | 'info' | 'healthy'): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'warning':
      return '🟡';
    case 'info':
      return '🔵';
    case 'healthy':
      return '🟢';
  }
}

/**
 * Strip ANSI codes from text
 * @param text - Text with ANSI codes
 * @returns Text without ANSI codes
 */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Get the visible length of text (excluding ANSI codes)
 * @param text - Text that may contain ANSI codes
 * @returns Visible character count
 */
export function visibleLength(text: string): number {
  return stripAnsi(text).length;
}

/**
 * Pad text to a specific visible length
 * @param text - Text to pad
 * @param length - Target visible length
 * @param char - Padding character
 * @param position - Pad position ('left' or 'right')
 * @returns Padded text
 */
export function padVisible(
  text: string,
  length: number,
  char: string = ' ',
  position: 'left' | 'right' = 'right'
): string {
  const visible = visibleLength(text);
  if (visible >= length) {
    return text;
  }

  const padding = char.repeat(length - visible);
  return position === 'right' ? text + padding : padding + text;
}

/**
 * Truncate text to a specific visible length
 * @param text - Text to truncate
 * @param length - Maximum visible length
 * @param suffix - Suffix to add when truncated
 * @returns Truncated text
 */
export function truncateVisible(text: string, length: number, suffix: string = '...'): string {
  const stripped = stripAnsi(text);
  if (stripped.length <= length) {
    return text;
  }

  // If text has no ANSI codes, simple truncation
  if (stripped === text) {
    return text.slice(0, length - suffix.length) + suffix;
  }

  // For text with ANSI codes, we need to be careful
  // This is a simplified approach - truncate stripped and add reset
  return stripped.slice(0, length - suffix.length) + suffix + colors.reset;
}
