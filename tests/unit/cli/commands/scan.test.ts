/**
 * Tests for scan command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseScanOptions } from '../../../../src/cli/commands/scan.js';
import type { ParsedArgs } from '../../../../src/cli/args.js';
import { parseArgs } from '../../../../src/cli/args.js';

describe('Scan Command', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('parseScanOptions', () => {
    it('should parse target URL', () => {
      const args = parseArgs(['localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.target).toBe('http://localhost:3000');
    });

    it('should add http:// to target if missing', () => {
      const args = parseArgs(['example.com']);
      const options = parseScanOptions(args);

      expect(options.target).toBe('http://example.com');
    });

    it('should preserve https:// in target', () => {
      const args = parseArgs(['https://example.com']);
      const options = parseScanOptions(args);

      expect(options.target).toBe('https://example.com');
    });

    it('should default to localhost:3000 if no target', () => {
      const args: ParsedArgs = {
        command: 'scan',
        flags: new Map(),
        positional: [],
        raw: [],
      };
      const options = parseScanOptions(args);

      expect(options.target).toBe('http://localhost:3000');
    });

    it('should parse proxy flag', () => {
      const args = parseArgs(['--proxy', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.proxy).toBe(true);
    });

    it('should parse tui flag', () => {
      const args = parseArgs(['--tui', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.tui).toBe(true);
    });

    it('should parse silent flag', () => {
      const args = parseArgs(['--silent', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.silent).toBe(true);
    });

    it('should parse report flag', () => {
      const args = parseArgs(['--report', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.report).toBe(true);
    });

    it('should parse format option', () => {
      const args = parseArgs(['--format', 'html', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.format).toBe('html');
    });

    it('should default format to all', () => {
      const args = parseArgs(['localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.format).toBe('all');
    });

    it('should parse output option', () => {
      const args = parseArgs(['--output', './reports', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.output).toBe('./reports');
    });

    it('should default output to ./reactcheck-reports', () => {
      const args = parseArgs(['localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.output).toBe('./reactcheck-reports');
    });

    it('should parse fix flag', () => {
      const args = parseArgs(['--fix', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.fix).toBe(true);
    });

    it('should parse verbose flag', () => {
      const args = parseArgs(['--verbose', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.verbose).toBe(true);
    });

    it('should parse port option', () => {
      const args = parseArgs(['--port', '4000', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.port).toBe(4000);
    });

    it('should default port to 3099', () => {
      const args = parseArgs(['localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.port).toBe(3099);
    });

    it('should parse threshold-critical option', () => {
      const args = parseArgs(['--threshold-critical', '100', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.thresholdCritical).toBe(100);
    });

    it('should default thresholdCritical to 50', () => {
      const args = parseArgs(['localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.thresholdCritical).toBe(50);
    });

    it('should parse threshold-warning option', () => {
      const args = parseArgs(['--threshold-warning', '30', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.thresholdWarning).toBe(30);
    });

    it('should default thresholdWarning to 20', () => {
      const args = parseArgs(['localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.thresholdWarning).toBe(20);
    });

    it('should parse fps-threshold option', () => {
      const args = parseArgs(['--fps-threshold', '45', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.fpsThreshold).toBe(45);
    });

    it('should default fpsThreshold to 30', () => {
      const args = parseArgs(['localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.fpsThreshold).toBe(30);
    });

    it('should parse headless flag', () => {
      const args = parseArgs(['--headless', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.headless).toBe(true);
    });

    it('should parse duration option', () => {
      const args = parseArgs(['--duration', '60', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.duration).toBe(60);
    });

    it('should parse watch flag', () => {
      const args = parseArgs(['--watch', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.watch).toBe(true);
    });

    it('should parse config option', () => {
      const args = parseArgs(['--config', './custom.config.js', 'localhost:3000']);
      const options = parseScanOptions(args);

      expect(options.configPath).toBe('./custom.config.js');
    });

    it('should handle all short flags', () => {
      const args = parseArgs([
        '-P', // proxy
        '-t', // tui
        '-s', // silent
        '-r', // report
        '-f', 'json', // format
        '-o', './out', // output
        '-p', '5000', // port
        '-d', '30', // duration
        '-w', // watch
        '-c', 'config.js', // config
        'localhost:3000',
      ]);
      const options = parseScanOptions(args);

      expect(options.proxy).toBe(true);
      expect(options.tui).toBe(true);
      expect(options.silent).toBe(true);
      expect(options.report).toBe(true);
      expect(options.format).toBe('json');
      expect(options.output).toBe('./out');
      expect(options.port).toBe(5000);
      expect(options.duration).toBe(30);
      expect(options.watch).toBe(true);
      expect(options.configPath).toBe('config.js');
    });

    it('should handle combined flags and options', () => {
      const args = parseArgs([
        '--report',
        '--format=html',
        '--verbose',
        '--headless',
        '--threshold-critical', '75',
        '--threshold-warning', '25',
        'https://myapp.dev',
      ]);
      const options = parseScanOptions(args);

      expect(options.report).toBe(true);
      expect(options.format).toBe('html');
      expect(options.verbose).toBe(true);
      expect(options.headless).toBe(true);
      expect(options.thresholdCritical).toBe(75);
      expect(options.thresholdWarning).toBe(25);
      expect(options.target).toBe('https://myapp.dev');
    });
  });
});
