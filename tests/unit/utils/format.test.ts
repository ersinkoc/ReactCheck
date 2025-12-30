/**
 * Tests for format utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatBytes,
  formatDuration,
  formatPercent,
  formatRenderTime,
  formatFps,
  formatComponentName,
  formatDate,
  formatDateDisplay,
  formatUrl,
  pluralize,
  progressBar,
  pad,
  truncate,
  camelToKebab,
  kebabToCamel,
  escapeHtml,
  indent,
  wrapText,
  generateId,
} from '../../../src/utils/format.js';

describe('formatNumber', () => {
  it('should format integers with thousands separators', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('should handle small numbers', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(1)).toBe('1');
    expect(formatNumber(999)).toBe('999');
  });

  it('should handle negative numbers', () => {
    expect(formatNumber(-1000)).toBe('-1,000');
  });

  it('should handle decimal numbers', () => {
    expect(formatNumber(1000.5)).toBe('1,000.5');
  });

  it('should accept a locale parameter', () => {
    expect(formatNumber(1000, 'de-DE')).toBe('1.000');
  });
});

describe('formatBytes', () => {
  it('should format zero bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('should respect decimals parameter', () => {
    expect(formatBytes(1536, 0)).toBe('2 KB');
    expect(formatBytes(1536, 1)).toBe('1.5 KB');
    expect(formatBytes(1536, 3)).toBe('1.5 KB');
  });

  it('should handle large values', () => {
    expect(formatBytes(1099511627776)).toBe('1 TB');
    expect(formatBytes(1125899906842624)).toBe('1 PB');
  });

  it('should handle extremely large values', () => {
    const result = formatBytes(Number.MAX_SAFE_INTEGER);
    expect(result).toContain('PB');
  });

  it('should fallback to bytes for values exceeding size array', () => {
    // When i exceeds sizes array length (sizes[i] is undefined)
    // Very tiny negative value would cause Math.log to return NaN/Infinity issues
    // Or extremely large value beyond PB
    const exabyte = 1024 ** 7; // Beyond PB (1024^6)
    const result = formatBytes(exabyte);
    // Should fallback to bytes format
    expect(result).toContain('Bytes');
  });

  it('should handle negative bytes value', () => {
    // Negative bytes would cause Math.log issues
    const result = formatBytes(-100);
    // Should fallback to bytes format
    expect(result).toContain('Bytes');
  });
});

describe('formatDuration', () => {
  it('should handle sub-millisecond values', () => {
    expect(formatDuration(0.5)).toBe('less than 1ms');
    expect(formatDuration(0.5, { short: true })).toBe('<1ms');
  });

  it('should format milliseconds', () => {
    expect(formatDuration(1)).toBe('1ms');
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('should format seconds', () => {
    expect(formatDuration(1000)).toBe('1.0s');
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(59000)).toBe('59.0s');
  });

  it('should format minutes', () => {
    expect(formatDuration(60000)).toBe('1m');
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(3540000)).toBe('59m');
  });

  it('should format hours', () => {
    expect(formatDuration(3600000)).toBe('1h');
    expect(formatDuration(5400000)).toBe('1h 30m');
    expect(formatDuration(86340000)).toBe('23h 59m');
  });

  it('should format days', () => {
    expect(formatDuration(86400000)).toBe('1d');
    expect(formatDuration(129600000)).toBe('1d 12h');
  });

  it('should handle negative values', () => {
    expect(formatDuration(-1000)).toBe('-1.0s');
  });

  it('should respect decimals option', () => {
    expect(formatDuration(1500, { decimals: 0 })).toBe('2s');
    expect(formatDuration(1500, { decimals: 2 })).toBe('1.50s');
  });
});

describe('formatPercent', () => {
  it('should format normalized values (0-1)', () => {
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(0.75)).toBe('75%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('should format non-normalized values (0-100)', () => {
    expect(formatPercent(50, { normalized: false })).toBe('50%');
    expect(formatPercent(75, { normalized: false })).toBe('75%');
  });

  it('should respect decimals option', () => {
    expect(formatPercent(0.756, { decimals: 1 })).toBe('75.6%');
    expect(formatPercent(0.756, { decimals: 2 })).toBe('75.60%');
  });

  it('should handle edge cases', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(1.5)).toBe('150%');
  });
});

describe('formatRenderTime', () => {
  it('should format sub-millisecond times', () => {
    expect(formatRenderTime(0.5)).toBe('<1ms');
  });

  it('should format fast render times with decimal', () => {
    expect(formatRenderTime(5)).toBe('5.0ms');
    expect(formatRenderTime(15.5)).toBe('15.5ms');
  });

  it('should format medium render times without decimal', () => {
    expect(formatRenderTime(50)).toBe('50ms');
    expect(formatRenderTime(99)).toBe('99ms');
  });

  it('should format slow render times in seconds', () => {
    expect(formatRenderTime(100)).toBe('0.10s');
    expect(formatRenderTime(1000)).toBe('1.00s');
  });
});

describe('formatFps', () => {
  it('should format FPS values', () => {
    expect(formatFps(60)).toBe('60 FPS');
    expect(formatFps(59.9)).toBe('60 FPS');
    expect(formatFps(30.4)).toBe('30 FPS');
  });
});

describe('formatComponentName', () => {
  it('should return short names unchanged', () => {
    expect(formatComponentName('Button')).toBe('Button');
    expect(formatComponentName('MyComponent')).toBe('MyComponent');
  });

  it('should truncate long names', () => {
    expect(formatComponentName('VeryLongComponentNameThatExceedsTheLimit', 30)).toBe(
      'VeryLongComponentNameThatEx...'
    );
  });

  it('should respect custom maxLength', () => {
    expect(formatComponentName('LongName', 5)).toBe('Lo...');
  });
});

describe('formatDate', () => {
  it('should format date to ISO string', () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    expect(formatDate(date)).toBe('2024-01-15T10:30:00.000Z');
  });

  it('should use current date if not provided', () => {
    const result = formatDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('formatDateDisplay', () => {
  it('should format date for display', () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    const result = formatDateDisplay(date);
    expect(result).toContain('2024');
    expect(result).toContain('Jan');
  });
});

describe('formatUrl', () => {
  it('should remove protocol', () => {
    expect(formatUrl('https://example.com')).toBe('example.com');
    expect(formatUrl('http://example.com')).toBe('example.com');
  });

  it('should remove trailing slash', () => {
    expect(formatUrl('https://example.com/')).toBe('example.com');
  });

  it('should truncate long URLs', () => {
    const longUrl = 'https://example.com/very/long/path/that/exceeds/the/maximum/length';
    const result = formatUrl(longUrl, 30);
    expect(result.length).toBeLessThanOrEqual(30);
    expect(result).toContain('...');
  });

  it('should keep short URLs unchanged', () => {
    expect(formatUrl('https://example.com', 50)).toBe('example.com');
  });
});

describe('pluralize', () => {
  it('should use singular for count of 1', () => {
    expect(pluralize(1, 'component')).toBe('1 component');
    expect(pluralize(1, 'render')).toBe('1 render');
  });

  it('should use plural for other counts', () => {
    expect(pluralize(0, 'component')).toBe('0 components');
    expect(pluralize(2, 'component')).toBe('2 components');
    expect(pluralize(1000, 'render')).toBe('1,000 renders');
  });

  it('should use custom plural form', () => {
    expect(pluralize(2, 'child', 'children')).toBe('2 children');
    expect(pluralize(1, 'child', 'children')).toBe('1 child');
  });
});

describe('progressBar', () => {
  it('should show empty bar for 0%', () => {
    expect(progressBar(0, 100, { width: 10 })).toBe('[░░░░░░░░░░] 0%');
  });

  it('should show full bar for 100%', () => {
    expect(progressBar(100, 100, { width: 10 })).toBe('[██████████] 100%');
  });

  it('should show partial bar', () => {
    expect(progressBar(50, 100, { width: 10 })).toBe('[█████░░░░░] 50%');
  });

  it('should hide percent when showPercent is false', () => {
    expect(progressBar(50, 100, { width: 10, showPercent: false })).toBe('[█████░░░░░]');
  });

  it('should use custom characters', () => {
    expect(progressBar(50, 100, { width: 10, filled: '#', empty: '-' })).toBe('[#####-----] 50%');
  });

  it('should handle zero total', () => {
    expect(progressBar(0, 0, { width: 10 })).toBe('[░░░░░░░░░░] 0%');
  });
});

describe('pad', () => {
  it('should pad string to the right by default', () => {
    expect(pad('abc', 5)).toBe('abc  ');
  });

  it('should pad string to the left', () => {
    expect(pad('abc', 5, ' ', 'left')).toBe('  abc');
  });

  it('should use custom padding character', () => {
    expect(pad('1', 3, '0', 'left')).toBe('001');
  });

  it('should not pad if string is already longer', () => {
    expect(pad('abcdef', 3)).toBe('abcdef');
  });
});

describe('truncate', () => {
  it('should return short strings unchanged', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  it('should truncate long strings with ellipsis', () => {
    expect(truncate('this is a long string', 10)).toBe('this is...');
  });

  it('should use custom suffix', () => {
    expect(truncate('this is a long string', 10, '>')).toBe('this is a>');
  });
});

describe('camelToKebab', () => {
  it('should convert camelCase to kebab-case', () => {
    expect(camelToKebab('camelCase')).toBe('camel-case');
    expect(camelToKebab('thisIsTest')).toBe('this-is-test');
  });

  it('should handle single word', () => {
    expect(camelToKebab('word')).toBe('word');
  });

  it('should handle numbers', () => {
    expect(camelToKebab('component1Name')).toBe('component1-name');
  });
});

describe('kebabToCamel', () => {
  it('should convert kebab-case to camelCase', () => {
    expect(kebabToCamel('kebab-case')).toBe('kebabCase');
    expect(kebabToCamel('this-is-a-test')).toBe('thisIsATest');
  });

  it('should handle single word', () => {
    expect(kebabToCamel('word')).toBe('word');
  });
});

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeHtml("'single'")).toBe('&#39;single&#39;');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('should handle strings without special characters', () => {
    expect(escapeHtml('normal text')).toBe('normal text');
  });

  it('should handle multiple escapes', () => {
    expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
    );
  });
});

describe('indent', () => {
  it('should create indentation string', () => {
    expect(indent(0)).toBe('');
    expect(indent(1)).toBe('  ');
    expect(indent(2)).toBe('    ');
  });

  it('should respect custom size', () => {
    expect(indent(1, 4)).toBe('    ');
    expect(indent(2, 1)).toBe('  ');
  });
});

describe('wrapText', () => {
  it('should wrap text at word boundaries', () => {
    const result = wrapText('the quick brown fox jumps over the lazy dog', 20);
    expect(result).toBe('the quick brown fox\njumps over the lazy\ndog');
  });

  it('should not wrap short text', () => {
    expect(wrapText('short text', 50)).toBe('short text');
  });

  it('should handle single long word', () => {
    const result = wrapText('superlongwordthatexceedsmaxwidth', 10);
    expect(result).toBe('superlongwordthatexceedsmaxwidth');
  });

  it('should handle empty string', () => {
    expect(wrapText('', 20)).toBe('');
  });
});

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should include prefix if provided', () => {
    const id = generateId('test');
    expect(id.startsWith('test_')).toBe(true);
  });

  it('should generate string IDs', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

// Helper function exports
describe('padStart/padEnd exports', () => {
  // These are also exported from the module
  it('should export pad function', () => {
    expect(typeof pad).toBe('function');
  });
});
