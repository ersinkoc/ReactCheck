/**
 * Tests for colors utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  colors,
  supportsColor,
  colorize,
  createColorizer,
  semantic,
  getSeverityColor,
  getSeverityEmoji,
  stripAnsi,
  visibleLength,
  padVisible,
  truncateVisible,
} from '../../../src/utils/colors.js';

describe('colors', () => {
  describe('supportsColor', () => {
    it('should be a boolean', () => {
      expect(typeof supportsColor).toBe('boolean');
    });
  });

  describe('colors object', () => {
    it('should have reset code', () => {
      expect(colors.reset).toBeDefined();
    });

    it('should have text style codes', () => {
      expect(colors.bold).toBeDefined();
      expect(colors.dim).toBeDefined();
      expect(colors.italic).toBeDefined();
      expect(colors.underline).toBeDefined();
    });

    it('should have foreground color codes', () => {
      expect(colors.red).toBeDefined();
      expect(colors.green).toBeDefined();
      expect(colors.yellow).toBeDefined();
      expect(colors.blue).toBeDefined();
      expect(colors.cyan).toBeDefined();
      expect(colors.magenta).toBeDefined();
      expect(colors.white).toBeDefined();
      expect(colors.black).toBeDefined();
      expect(colors.gray).toBeDefined();
    });

    it('should have bright foreground color codes', () => {
      expect(colors.brightRed).toBeDefined();
      expect(colors.brightGreen).toBeDefined();
      expect(colors.brightYellow).toBeDefined();
      expect(colors.brightBlue).toBeDefined();
    });

    it('should have background color codes', () => {
      expect(colors.bgRed).toBeDefined();
      expect(colors.bgGreen).toBeDefined();
      expect(colors.bgYellow).toBeDefined();
      expect(colors.bgBlue).toBeDefined();
    });
  });

  describe('colorize()', () => {
    it('should return plain text when no codes provided', () => {
      expect(colorize('test')).toBe('test');
    });

    it('should apply color codes when supported', () => {
      if (supportsColor) {
        const result = colorize('test', colors.red);
        expect(result).toContain('test');
        expect(result).toContain(colors.reset);
      }
    });

    it('should combine multiple color codes', () => {
      if (supportsColor) {
        const result = colorize('test', colors.red, colors.bold);
        expect(result).toContain('test');
        expect(result.startsWith(colors.red + colors.bold)).toBe(true);
      }
    });
  });

  describe('createColorizer()', () => {
    it('should create a function that colorizes text', () => {
      const redText = createColorizer(colors.red);
      expect(typeof redText).toBe('function');

      const result = redText('test');
      if (supportsColor) {
        expect(result).toContain('test');
      } else {
        expect(result).toBe('test');
      }
    });
  });

  describe('semantic', () => {
    it('should have critical colorizer', () => {
      expect(typeof semantic.critical).toBe('function');
      const result = semantic.critical('error');
      expect(result).toContain('error');
    });

    it('should have warning colorizer', () => {
      expect(typeof semantic.warning).toBe('function');
      const result = semantic.warning('warning');
      expect(result).toContain('warning');
    });

    it('should have healthy colorizer', () => {
      expect(typeof semantic.healthy).toBe('function');
      const result = semantic.healthy('ok');
      expect(result).toContain('ok');
    });

    it('should have info colorizer', () => {
      expect(typeof semantic.info).toBe('function');
      const result = semantic.info('info');
      expect(result).toContain('info');
    });

    it('should have secondary colorizer', () => {
      expect(typeof semantic.secondary).toBe('function');
      const result = semantic.secondary('secondary');
      expect(result).toContain('secondary');
    });

    it('should have highlight colorizer', () => {
      expect(typeof semantic.highlight).toBe('function');
      const result = semantic.highlight('highlighted');
      expect(result).toContain('highlighted');
    });

    it('should have error colorizer with bold', () => {
      expect(typeof semantic.error).toBe('function');
      const result = semantic.error('error');
      expect(result).toContain('error');
    });

    it('should have success colorizer with bold', () => {
      expect(typeof semantic.success).toBe('function');
      const result = semantic.success('success');
      expect(result).toContain('success');
    });

    it('should have title colorizer', () => {
      expect(typeof semantic.title).toBe('function');
      const result = semantic.title('title');
      expect(result).toContain('title');
    });

    it('should have dimmed colorizer', () => {
      expect(typeof semantic.dimmed).toBe('function');
      const result = semantic.dimmed('dimmed');
      expect(result).toContain('dimmed');
    });
  });

  describe('getSeverityColor()', () => {
    it('should return red for critical', () => {
      expect(getSeverityColor('critical')).toBe(colors.red);
    });

    it('should return yellow for warning', () => {
      expect(getSeverityColor('warning')).toBe(colors.yellow);
    });

    it('should return blue for info', () => {
      expect(getSeverityColor('info')).toBe(colors.blue);
    });

    it('should return green for healthy', () => {
      expect(getSeverityColor('healthy')).toBe(colors.green);
    });
  });

  describe('getSeverityEmoji()', () => {
    it('should return red circle for critical', () => {
      expect(getSeverityEmoji('critical')).toBe('🔴');
    });

    it('should return yellow circle for warning', () => {
      expect(getSeverityEmoji('warning')).toBe('🟡');
    });

    it('should return blue circle for info', () => {
      expect(getSeverityEmoji('info')).toBe('🔵');
    });

    it('should return green circle for healthy', () => {
      expect(getSeverityEmoji('healthy')).toBe('🟢');
    });
  });

  describe('stripAnsi()', () => {
    it('should remove ANSI escape codes', () => {
      const coloredText = '\x1b[31mred text\x1b[0m';
      expect(stripAnsi(coloredText)).toBe('red text');
    });

    it('should handle text without ANSI codes', () => {
      expect(stripAnsi('plain text')).toBe('plain text');
    });

    it('should handle multiple ANSI codes', () => {
      const text = '\x1b[1m\x1b[31mbold red\x1b[0m normal \x1b[32mgreen\x1b[0m';
      expect(stripAnsi(text)).toBe('bold red normal green');
    });

    it('should handle empty string', () => {
      expect(stripAnsi('')).toBe('');
    });
  });

  describe('visibleLength()', () => {
    it('should return length without ANSI codes', () => {
      const coloredText = '\x1b[31mred\x1b[0m';
      expect(visibleLength(coloredText)).toBe(3);
    });

    it('should return normal length for plain text', () => {
      expect(visibleLength('plain')).toBe(5);
    });
  });

  describe('padVisible()', () => {
    it('should pad based on visible length', () => {
      const coloredText = '\x1b[31mhi\x1b[0m';
      const result = padVisible(coloredText, 5);
      // Should have added 3 spaces (visible length is 2)
      expect(visibleLength(result)).toBe(5);
    });

    it('should pad left when specified', () => {
      const result = padVisible('hi', 5, ' ', 'left');
      expect(result).toBe('   hi');
    });

    it('should not pad if already long enough', () => {
      const result = padVisible('hello', 3);
      expect(result).toBe('hello');
    });

    it('should use custom padding character', () => {
      const result = padVisible('hi', 5, '-');
      expect(result).toBe('hi---');
    });
  });

  describe('truncateVisible()', () => {
    it('should not truncate short text', () => {
      expect(truncateVisible('hi', 10)).toBe('hi');
    });

    it('should truncate long text', () => {
      const result = truncateVisible('hello world', 8);
      expect(result).toBe('hello...');
    });

    it('should handle text with ANSI codes', () => {
      const coloredText = '\x1b[31mhello world\x1b[0m';
      const result = truncateVisible(coloredText, 8);
      expect(stripAnsi(result)).toBe('hello...');
    });

    it('should use custom suffix', () => {
      const result = truncateVisible('hello world', 8, '>>>');
      expect(result).toBe('hello>>>');
    });

    it('should handle empty string', () => {
      expect(truncateVisible('', 10)).toBe('');
    });

    it('should handle suffix longer than max length', () => {
      // When max length is smaller than suffix, the function still
      // attempts to truncate, resulting in longer text
      const result = truncateVisible('hello', 2);
      // The behavior is: 'hello'.slice(0, 2 - 3) + '...' = 'hello'.slice(0, -1) + '...'
      // = 'hell' + '...' = 'hell...'
      expect(result).toBe('hell...');
    });
  });

  describe('color support edge cases', () => {
    it('should export supportsColor as boolean based on environment', () => {
      // The supportsColor is determined at module load time
      // In test environment, it checks process.stdout.isTTY, FORCE_COLOR, NO_COLOR, TERM, and CI envs
      expect(typeof supportsColor).toBe('boolean');
    });

    it('colors object codes are empty strings when color not supported', () => {
      // When supportsColor is false, all color codes should be empty strings
      // When supportsColor is true, they should contain ANSI escape codes
      if (supportsColor) {
        expect(colors.red).toContain('\x1b[');
        expect(colors.bold).toContain('\x1b[');
        expect(colors.reset).toContain('\x1b[');
      } else {
        expect(colors.red).toBe('');
        expect(colors.bold).toBe('');
        expect(colors.reset).toBe('');
      }
    });

    it('colorize returns plain text when no color support', () => {
      const result = colorize('test', colors.red);
      if (!supportsColor) {
        expect(result).toBe('test');
      } else {
        expect(result).toContain('\x1b[');
      }
    });
  });

  describe('checkColorSupport environment variables', () => {
    const originalEnv = { ...process.env };
    const originalIsTTY = process.stdout.isTTY;

    afterEach(() => {
      process.env = { ...originalEnv };
      Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, writable: true });
    });

    it('should respect FORCE_COLOR=1', async () => {
      process.env['FORCE_COLOR'] = '1';
      delete process.env['NO_COLOR'];
      // Re-import to test with new env
      const { supportsColor: newSupport } = await import('../../../src/utils/colors.js?force1=' + Date.now());
      expect(newSupport).toBe(true);
    });

    it('should respect FORCE_COLOR=0', async () => {
      process.env['FORCE_COLOR'] = '0';
      const { supportsColor: newSupport } = await import('../../../src/utils/colors.js?force0=' + Date.now());
      expect(newSupport).toBe(false);
    });

    it('should respect NO_COLOR', async () => {
      delete process.env['FORCE_COLOR'];
      process.env['NO_COLOR'] = '1';
      const { supportsColor: newSupport } = await import('../../../src/utils/colors.js?nocolor=' + Date.now());
      expect(newSupport).toBe(false);
    });

    it('should respect TERM=dumb', async () => {
      delete process.env['FORCE_COLOR'];
      delete process.env['NO_COLOR'];
      process.env['TERM'] = 'dumb';
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
      const { supportsColor: newSupport } = await import('../../../src/utils/colors.js?dumb=' + Date.now());
      expect(newSupport).toBe(false);
    });

    it('should check CI environments when TTY available', async () => {
      delete process.env['FORCE_COLOR'];
      delete process.env['NO_COLOR'];
      delete process.env['TERM'];
      process.env['CI'] = 'true';
      process.env['GITHUB_ACTIONS'] = 'true';
      // Note: CI check only happens after TTY check passes
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
      const { supportsColor: newSupport } = await import('../../../src/utils/colors.js?ci=' + Date.now());
      // Should be true because TTY is true and TERM is not 'dumb'
      expect(newSupport).toBe(true);
    });

    it('should return false for non-TTY without CI', async () => {
      delete process.env['FORCE_COLOR'];
      delete process.env['NO_COLOR'];
      delete process.env['TERM'];
      delete process.env['CI'];
      delete process.env['GITHUB_ACTIONS'];
      Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true });
      const { supportsColor: newSupport } = await import('../../../src/utils/colors.js?notty=' + Date.now());
      expect(newSupport).toBe(false);
    });
  });
});
