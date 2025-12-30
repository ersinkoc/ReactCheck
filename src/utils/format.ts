/**
 * Formatting utilities
 * @packageDocumentation
 */

/**
 * Format a number with thousands separators
 * @param num - Number to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted string
 */
export function formatNumber(num: number, locale: string = 'en-US'): string {
  return num.toLocaleString(locale);
}

/**
 * Format bytes to human-readable string
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = sizes[i];

  if (size === undefined) {
    return `${bytes} Bytes`;
  }

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${size}`;
}

/**
 * Format milliseconds to human-readable duration
 * @param ms - Duration in milliseconds
 * @param options - Formatting options
 * @returns Formatted string (e.g., "2m 34s", "1.5s", "150ms")
 */
export function formatDuration(
  ms: number,
  options: { short?: boolean; decimals?: number } = {}
): string {
  const { short = false, decimals = 1 } = options;

  if (ms < 0) {
    return '-' + formatDuration(-ms, options);
  }

  if (ms < 1) {
    return short ? '<1ms' : 'less than 1ms';
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  const seconds = ms / 1000;

  if (seconds < 60) {
    return `${seconds.toFixed(decimals)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return short ? `${minutes}m ${remainingSeconds}s` : `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return short ? `${hours}h ${remainingMinutes}m` : `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours === 0) {
    return `${days}d`;
  }
  return short ? `${days}d ${remainingHours}h` : `${days}d ${remainingHours}h`;
}

/**
 * Format a percentage
 * @param value - Value (0-1 or 0-100)
 * @param options - Formatting options
 * @returns Formatted string (e.g., "75%", "75.5%")
 */
export function formatPercent(
  value: number,
  options: { decimals?: number; normalized?: boolean } = {}
): string {
  const { decimals = 0, normalized = true } = options;
  const percent = normalized ? value * 100 : value;
  return `${percent.toFixed(decimals)}%`;
}

/**
 * Format a render time with appropriate unit
 * @param ms - Time in milliseconds
 * @returns Formatted string with color indicator
 */
export function formatRenderTime(ms: number): string {
  if (ms < 1) {
    return '<1ms';
  }
  if (ms < 16) {
    return `${ms.toFixed(1)}ms`;
  }
  if (ms < 100) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format FPS value
 * @param fps - Frames per second
 * @returns Formatted string
 */
export function formatFps(fps: number): string {
  return `${Math.round(fps)} FPS`;
}

/**
 * Format a component name for display
 * @param name - Component name
 * @param maxLength - Maximum length
 * @returns Formatted name
 */
export function formatComponentName(name: string, maxLength: number = 30): string {
  if (name.length <= maxLength) {
    return name;
  }
  return name.slice(0, maxLength - 3) + '...';
}

/**
 * Format a date to ISO string without timezone
 * @param date - Date to format
 * @returns ISO string
 */
export function formatDate(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Format a date for display
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateDisplay(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format a URL for display
 * @param url - URL string
 * @param maxLength - Maximum length
 * @returns Formatted URL
 */
export function formatUrl(url: string, maxLength: number = 50): string {
  // Remove protocol for display
  let display = url.replace(/^https?:\/\//, '');

  // Remove trailing slash
  display = display.replace(/\/$/, '');

  if (display.length <= maxLength) {
    return display;
  }

  // Truncate in the middle
  const half = Math.floor((maxLength - 3) / 2);
  return display.slice(0, half) + '...' + display.slice(-half);
}

/**
 * Pluralize a word based on count
 * @param count - Item count
 * @param singular - Singular form
 * @param plural - Plural form (defaults to singular + 's')
 * @returns Pluralized string with count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${formatNumber(count)} ${word}`;
}

/**
 * Create a progress bar string
 * @param current - Current value
 * @param total - Total value
 * @param options - Progress bar options
 * @returns Progress bar string
 */
export function progressBar(
  current: number,
  total: number,
  options: {
    width?: number;
    filled?: string;
    empty?: string;
    showPercent?: boolean;
  } = {}
): string {
  const { width = 20, filled = '█', empty = '░', showPercent = true } = options;

  const percent = total > 0 ? current / total : 0;
  const filledCount = Math.round(percent * width);
  const emptyCount = width - filledCount;

  const bar = filled.repeat(filledCount) + empty.repeat(emptyCount);

  if (showPercent) {
    return `[${bar}] ${formatPercent(percent)}`;
  }
  return `[${bar}]`;
}

/**
 * Pad a string to a specific length
 * @param str - String to pad
 * @param length - Target length
 * @param char - Padding character
 * @param position - 'left' or 'right'
 * @returns Padded string
 */
export function pad(
  str: string,
  length: number,
  char: string = ' ',
  position: 'left' | 'right' = 'right'
): string {
  if (str.length >= length) {
    return str;
  }
  const padding = char.repeat(length - str.length);
  return position === 'right' ? str + padding : padding + str;
}

/**
 * Truncate a string with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add when truncated
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Convert camelCase to kebab-case
 * @param str - String to convert
 * @returns Converted string
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Convert kebab-case to camelCase
 * @param str - String to convert
 * @returns Converted string
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * Escape HTML special characters
 * @param str - String to escape
 * @returns Escaped string
 */
export function escapeHtml(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => escapeMap[char] ?? char);
}

/**
 * Create an indentation string
 * @param level - Indentation level
 * @param size - Spaces per level
 * @returns Indentation string
 */
export function indent(level: number, size: number = 2): string {
  return ' '.repeat(level * size);
}

/**
 * Wrap text to a maximum width
 * @param text - Text to wrap
 * @param maxWidth - Maximum line width
 * @returns Wrapped text with newlines
 */
export function wrapText(text: string, maxWidth: number): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join('\n');
}

/**
 * Generate a unique ID
 * @param prefix - Optional prefix
 * @returns Unique ID string
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}
