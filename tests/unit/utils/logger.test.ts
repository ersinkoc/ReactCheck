/**
 * Tests for Logger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LogLevel, parseLogLevel, logger } from '../../../src/utils/logger.js';

describe('Logger', () => {
  let mockOutput: {
    log: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockOutput = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  });

  describe('constructor', () => {
    it('should create a logger with default options', () => {
      const log = new Logger();
      expect(log.getLevel()).toBe(LogLevel.INFO);
    });

    it('should create a logger with custom options', () => {
      const log = new Logger({
        prefix: 'Test',
        level: LogLevel.DEBUG,
        showTimestamp: true,
        showLevel: true,
        output: mockOutput,
      });
      expect(log.getLevel()).toBe(LogLevel.DEBUG);
    });
  });

  describe('debug()', () => {
    it('should log debug messages when level is DEBUG', () => {
      const log = new Logger({ level: LogLevel.DEBUG, output: mockOutput });
      log.debug('debug message');
      expect(mockOutput.log).toHaveBeenCalled();
    });

    it('should not log debug messages when level is INFO', () => {
      const log = new Logger({ level: LogLevel.INFO, output: mockOutput });
      log.debug('debug message');
      expect(mockOutput.log).not.toHaveBeenCalled();
    });

    it('should log additional arguments', () => {
      const log = new Logger({ level: LogLevel.DEBUG, output: mockOutput });
      log.debug('message', 'arg1', 'arg2');
      expect(mockOutput.log).toHaveBeenCalled();
      const call = mockOutput.log.mock.calls[0]?.[0];
      expect(call).toContain('arg1');
      expect(call).toContain('arg2');
    });
  });

  describe('info()', () => {
    it('should log info messages when level is INFO', () => {
      const log = new Logger({ level: LogLevel.INFO, output: mockOutput });
      log.info('info message');
      expect(mockOutput.log).toHaveBeenCalled();
    });

    it('should not log info messages when level is WARN', () => {
      const log = new Logger({ level: LogLevel.WARN, output: mockOutput });
      log.info('info message');
      expect(mockOutput.log).not.toHaveBeenCalled();
    });

    it('should log additional arguments', () => {
      const log = new Logger({ level: LogLevel.INFO, output: mockOutput });
      log.info('message', 42, true);
      expect(mockOutput.log).toHaveBeenCalled();
    });
  });

  describe('warn()', () => {
    it('should log warn messages when level is WARN', () => {
      const log = new Logger({ level: LogLevel.WARN, output: mockOutput });
      log.warn('warn message');
      expect(mockOutput.warn).toHaveBeenCalled();
    });

    it('should not log warn messages when level is ERROR', () => {
      const log = new Logger({ level: LogLevel.ERROR, output: mockOutput });
      log.warn('warn message');
      expect(mockOutput.warn).not.toHaveBeenCalled();
    });

    it('should log additional arguments', () => {
      const log = new Logger({ level: LogLevel.WARN, output: mockOutput });
      log.warn('message', { key: 'value' });
      expect(mockOutput.warn).toHaveBeenCalled();
    });
  });

  describe('error()', () => {
    it('should log error messages when level is ERROR', () => {
      const log = new Logger({ level: LogLevel.ERROR, output: mockOutput });
      log.error('error message');
      expect(mockOutput.error).toHaveBeenCalled();
    });

    it('should not log error messages when level is SILENT', () => {
      const log = new Logger({ level: LogLevel.SILENT, output: mockOutput });
      log.error('error message');
      expect(mockOutput.error).not.toHaveBeenCalled();
    });

    it('should log additional arguments', () => {
      const log = new Logger({ level: LogLevel.ERROR, output: mockOutput });
      log.error('message', new Error('test'));
      expect(mockOutput.error).toHaveBeenCalled();
    });
  });

  describe('success()', () => {
    it('should log success messages', () => {
      const log = new Logger({ output: mockOutput });
      log.success('success message');
      expect(mockOutput.log).toHaveBeenCalled();
      const call = mockOutput.log.mock.calls[0]?.[0];
      expect(call).toContain('✓');
    });

    it('should not log when level is SILENT', () => {
      const log = new Logger({ level: LogLevel.SILENT, output: mockOutput });
      log.success('success message');
      expect(mockOutput.log).not.toHaveBeenCalled();
    });

    it('should include prefix', () => {
      const log = new Logger({ prefix: 'Test', output: mockOutput });
      log.success('done');
      expect(mockOutput.log).toHaveBeenCalled();
      const call = mockOutput.log.mock.calls[0]?.[0];
      expect(call).toContain('Test');
    });
  });

  describe('fail()', () => {
    it('should log failure messages', () => {
      const log = new Logger({ output: mockOutput });
      log.fail('fail message');
      expect(mockOutput.error).toHaveBeenCalled();
      const call = mockOutput.error.mock.calls[0]?.[0];
      expect(call).toContain('✗');
    });

    it('should not log when level is SILENT', () => {
      const log = new Logger({ level: LogLevel.SILENT, output: mockOutput });
      log.fail('fail message');
      expect(mockOutput.error).not.toHaveBeenCalled();
    });

    it('should include prefix', () => {
      const log = new Logger({ prefix: 'Test', output: mockOutput });
      log.fail('error');
      expect(mockOutput.error).toHaveBeenCalled();
      const call = mockOutput.error.mock.calls[0]?.[0];
      expect(call).toContain('Test');
    });
  });

  describe('child()', () => {
    it('should create a child logger with sub-prefix', () => {
      const parent = new Logger({ prefix: 'Parent', output: mockOutput });
      const child = parent.child('Child');
      child.info('message');
      expect(mockOutput.log).toHaveBeenCalled();
      const call = mockOutput.log.mock.calls[0]?.[0];
      expect(call).toContain('Parent:Child');
    });

    it('should work without parent prefix', () => {
      const parent = new Logger({ output: mockOutput });
      const child = parent.child('Child');
      child.info('message');
      expect(mockOutput.log).toHaveBeenCalled();
      const call = mockOutput.log.mock.calls[0]?.[0];
      expect(call).toContain('Child');
    });

    it('should inherit parent level', () => {
      const parent = new Logger({ level: LogLevel.ERROR, output: mockOutput });
      const child = parent.child('Child');
      child.info('should not show');
      expect(mockOutput.log).not.toHaveBeenCalled();
    });
  });

  describe('setLevel() / getLevel()', () => {
    it('should set and get log level', () => {
      const log = new Logger({ level: LogLevel.INFO });
      expect(log.getLevel()).toBe(LogLevel.INFO);
      log.setLevel(LogLevel.DEBUG);
      expect(log.getLevel()).toBe(LogLevel.DEBUG);
    });
  });

  describe('isLevelEnabled()', () => {
    it('should return true for enabled levels', () => {
      const log = new Logger({ level: LogLevel.INFO });
      expect(log.isLevelEnabled(LogLevel.INFO)).toBe(true);
      expect(log.isLevelEnabled(LogLevel.WARN)).toBe(true);
      expect(log.isLevelEnabled(LogLevel.ERROR)).toBe(true);
    });

    it('should return false for disabled levels', () => {
      const log = new Logger({ level: LogLevel.WARN });
      expect(log.isLevelEnabled(LogLevel.DEBUG)).toBe(false);
      expect(log.isLevelEnabled(LogLevel.INFO)).toBe(false);
    });
  });

  describe('time()', () => {
    it('should log duration when ended', async () => {
      const log = new Logger({ level: LogLevel.DEBUG, output: mockOutput });
      const timer = log.time('test');

      await new Promise((resolve) => setTimeout(resolve, 10));
      timer.end();

      expect(mockOutput.log).toHaveBeenCalled();
      const call = mockOutput.log.mock.calls[0]?.[0];
      expect(call).toContain('test');
      expect(call).toContain('ms');
    });
  });

  describe('table()', () => {
    it('should log table with data', () => {
      const log = new Logger({ output: mockOutput });
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      log.table(data);
      expect(mockOutput.log.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle empty data', () => {
      const log = new Logger({ output: mockOutput });
      log.table([]);
      expect(mockOutput.log).toHaveBeenCalled();
    });

    it('should respect column selection', () => {
      const log = new Logger({ output: mockOutput });
      const data = [{ name: 'Alice', age: 30, city: 'NYC' }];
      log.table(data, ['name', 'age']);
      expect(mockOutput.log).toHaveBeenCalled();
    });

    it('should not log when level is SILENT', () => {
      const log = new Logger({ level: LogLevel.SILENT, output: mockOutput });
      log.table([{ name: 'test' }]);
      expect(mockOutput.log).not.toHaveBeenCalled();
    });

    it('should handle empty object array', () => {
      const log = new Logger({ output: mockOutput });
      log.table([{}]);
      expect(mockOutput.log).toHaveBeenCalled();
    });
  });

  describe('progress() / clearProgress()', () => {
    it('should write progress to stdout when TTY', () => {
      const log = new Logger({ output: mockOutput });
      const originalIsTTY = process.stdout.isTTY;
      const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      (process.stdout as { isTTY: boolean }).isTTY = true;
      log.progress('loading...');
      expect(writeSpy).toHaveBeenCalled();

      log.clearProgress();
      expect(writeSpy).toHaveBeenCalledTimes(2);

      (process.stdout as { isTTY: boolean | undefined }).isTTY = originalIsTTY;
      writeSpy.mockRestore();
    });

    it('should not write when level is SILENT', () => {
      const log = new Logger({ level: LogLevel.SILENT, output: mockOutput });
      const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      log.progress('loading...');
      expect(writeSpy).not.toHaveBeenCalled();

      writeSpy.mockRestore();
    });
  });

  describe('newline()', () => {
    it('should log empty string', () => {
      const log = new Logger({ output: mockOutput });
      log.newline();
      expect(mockOutput.log).toHaveBeenCalledWith('');
    });

    it('should not log when level is SILENT', () => {
      const log = new Logger({ level: LogLevel.SILENT, output: mockOutput });
      log.newline();
      expect(mockOutput.log).not.toHaveBeenCalled();
    });
  });

  describe('hr()', () => {
    it('should log horizontal rule', () => {
      const log = new Logger({ output: mockOutput });
      log.hr();
      expect(mockOutput.log).toHaveBeenCalled();
      const call = mockOutput.log.mock.calls[0]?.[0];
      expect(call).toContain('─');
    });

    it('should use custom character and width', () => {
      const log = new Logger({ output: mockOutput });
      log.hr('=', 10);
      expect(mockOutput.log).toHaveBeenCalled();
    });

    it('should not log when level is SILENT', () => {
      const log = new Logger({ level: LogLevel.SILENT, output: mockOutput });
      log.hr();
      expect(mockOutput.log).not.toHaveBeenCalled();
    });
  });

  describe('group()', () => {
    it('should wrap content in group markers', () => {
      const log = new Logger({ output: mockOutput });
      log.group('Test Group', () => {
        log.info('inside group');
      });
      expect(mockOutput.log.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('should not log when level is SILENT', () => {
      const log = new Logger({ level: LogLevel.SILENT, output: mockOutput });
      log.group('Test', () => {
        log.info('inside');
      });
      expect(mockOutput.log).not.toHaveBeenCalled();
    });
  });

  describe('timestamp formatting', () => {
    it('should include timestamp when enabled', () => {
      const log = new Logger({ showTimestamp: true, output: mockOutput });
      log.info('message');
      expect(mockOutput.log).toHaveBeenCalled();
      const call = mockOutput.log.mock.calls[0]?.[0];
      expect(call).toMatch(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/);
    });
  });

  describe('level formatting', () => {
    it('should include level when showLevel is true', () => {
      const log = new Logger({ showLevel: true, output: mockOutput });
      log.info('message');
      expect(mockOutput.log).toHaveBeenCalled();
      const call = mockOutput.log.mock.calls[0]?.[0];
      expect(call).toContain('INFO');
    });

    it('should not include level when showLevel is false', () => {
      const log = new Logger({ showLevel: false, output: mockOutput });
      log.info('message');
      expect(mockOutput.log).toHaveBeenCalled();
      const call = mockOutput.log.mock.calls[0]?.[0];
      expect(call).not.toContain('[INFO]');
    });
  });
});

describe('parseLogLevel', () => {
  it('should parse DEBUG level', () => {
    expect(parseLogLevel('debug')).toBe(LogLevel.DEBUG);
    expect(parseLogLevel('DEBUG')).toBe(LogLevel.DEBUG);
  });

  it('should parse INFO level', () => {
    expect(parseLogLevel('info')).toBe(LogLevel.INFO);
    expect(parseLogLevel('INFO')).toBe(LogLevel.INFO);
  });

  it('should parse WARN level', () => {
    expect(parseLogLevel('warn')).toBe(LogLevel.WARN);
    expect(parseLogLevel('WARN')).toBe(LogLevel.WARN);
    expect(parseLogLevel('warning')).toBe(LogLevel.WARN);
  });

  it('should parse ERROR level', () => {
    expect(parseLogLevel('error')).toBe(LogLevel.ERROR);
    expect(parseLogLevel('ERROR')).toBe(LogLevel.ERROR);
  });

  it('should parse SILENT level', () => {
    expect(parseLogLevel('silent')).toBe(LogLevel.SILENT);
    expect(parseLogLevel('SILENT')).toBe(LogLevel.SILENT);
    expect(parseLogLevel('none')).toBe(LogLevel.SILENT);
  });

  it('should default to INFO for unknown levels', () => {
    expect(parseLogLevel('unknown')).toBe(LogLevel.INFO);
    expect(parseLogLevel('')).toBe(LogLevel.INFO);
  });
});

describe('default logger', () => {
  it('should export a default logger instance', () => {
    expect(logger).toBeInstanceOf(Logger);
  });
});

describe('LogLevel enum', () => {
  it('should have correct numeric values', () => {
    expect(LogLevel.DEBUG).toBe(0);
    expect(LogLevel.INFO).toBe(1);
    expect(LogLevel.WARN).toBe(2);
    expect(LogLevel.ERROR).toBe(3);
    expect(LogLevel.SILENT).toBe(4);
  });
});

describe('LogEntry interface', () => {
  it('should be exported from module', async () => {
    // This is a type-only export, just verify the module imports correctly
    const module = await import('../../../src/utils/logger.js');
    expect(module.Logger).toBeDefined();
  });
});
