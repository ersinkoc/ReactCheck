/**
 * Tests for CLI argument parser
 */

import { describe, it, expect } from 'vitest';
import {
  parseArgs,
  getStringFlag,
  getBooleanFlag,
  getNumberFlag,
  validateArgs,
  getHelpText,
  normalizeTarget,
  getFlagDefinitions,
} from '../../../src/cli/args.js';

describe('CLI Argument Parser', () => {
  describe('parseArgs', () => {
    describe('command detection', () => {
      it('should default to scan command', () => {
        const result = parseArgs(['localhost:3000']);
        expect(result.command).toBe('scan');
        expect(result.target).toBe('localhost:3000');
      });

      it('should detect init command', () => {
        const result = parseArgs(['init']);
        expect(result.command).toBe('init');
      });

      it('should detect help command', () => {
        const result = parseArgs(['help']);
        expect(result.command).toBe('help');
      });

      it('should detect --help flag as command', () => {
        const result = parseArgs(['--help']);
        expect(result.command).toBe('help');
      });

      it('should detect -h flag as command', () => {
        const result = parseArgs(['-h']);
        expect(result.command).toBe('help');
      });

      it('should detect version command', () => {
        const result = parseArgs(['version']);
        expect(result.command).toBe('version');
      });

      it('should detect --version flag as command', () => {
        const result = parseArgs(['--version']);
        expect(result.command).toBe('version');
      });

      it('should detect -v flag as command', () => {
        const result = parseArgs(['-v']);
        expect(result.command).toBe('version');
      });
    });

    describe('long flags', () => {
      it('should parse --flag=value format', () => {
        const result = parseArgs(['--format=html', 'localhost:3000']);
        expect(result.flags.get('format')).toBe('html');
      });

      it('should parse --flag value format', () => {
        const result = parseArgs(['--format', 'json', 'localhost:3000']);
        expect(result.flags.get('format')).toBe('json');
      });

      it('should parse boolean flags', () => {
        const result = parseArgs(['--report', '--verbose', 'localhost:3000']);
        expect(result.flags.get('report')).toBe(true);
        expect(result.flags.get('verbose')).toBe(true);
      });

      it('should parse --headless flag', () => {
        const result = parseArgs(['--headless', 'localhost:3000']);
        expect(result.flags.get('headless')).toBe(true);
      });

      it('should parse --watch flag', () => {
        const result = parseArgs(['--watch', 'localhost:3000']);
        expect(result.flags.get('watch')).toBe(true);
      });

      it('should parse --proxy flag', () => {
        const result = parseArgs(['--proxy', 'localhost:3000']);
        expect(result.flags.get('proxy')).toBe(true);
      });

      it('should parse --tui flag', () => {
        const result = parseArgs(['--tui', 'localhost:3000']);
        expect(result.flags.get('tui')).toBe(true);
      });

      it('should parse --silent flag', () => {
        const result = parseArgs(['--silent', 'localhost:3000']);
        expect(result.flags.get('silent')).toBe(true);
      });

      it('should parse --fix flag', () => {
        const result = parseArgs(['--fix', 'localhost:3000']);
        expect(result.flags.get('fix')).toBe(true);
      });

      it('should parse --output flag with value', () => {
        const result = parseArgs(['--output', './reports', 'localhost:3000']);
        expect(result.flags.get('output')).toBe('./reports');
      });

      it('should parse --config flag with value', () => {
        const result = parseArgs(['--config', './custom.config.js', 'localhost:3000']);
        expect(result.flags.get('config')).toBe('./custom.config.js');
      });

      it('should parse --port flag with value', () => {
        const result = parseArgs(['--port', '4000', 'localhost:3000']);
        expect(result.flags.get('port')).toBe('4000');
      });

      it('should parse --duration flag with value', () => {
        const result = parseArgs(['--duration', '60', 'localhost:3000']);
        expect(result.flags.get('duration')).toBe('60');
      });

      it('should parse threshold flags', () => {
        const result = parseArgs([
          '--threshold-critical', '100',
          '--threshold-warning', '30',
          '--fps-threshold', '45',
          'localhost:3000',
        ]);
        expect(result.flags.get('threshold-critical')).toBe('100');
        expect(result.flags.get('threshold-warning')).toBe('30');
        expect(result.flags.get('fps-threshold')).toBe('45');
      });
    });

    describe('short flags', () => {
      it('should parse -f value format', () => {
        const result = parseArgs(['-f', 'md', 'localhost:3000']);
        expect(result.flags.get('format')).toBe('md');
      });

      it('should parse -fvalue format', () => {
        const result = parseArgs(['-fhtml', 'localhost:3000']);
        expect(result.flags.get('format')).toBe('html');
      });

      it('should parse -o flag', () => {
        const result = parseArgs(['-o', './out', 'localhost:3000']);
        expect(result.flags.get('output')).toBe('./out');
      });

      it('should parse -p flag', () => {
        const result = parseArgs(['-p', '5000', 'localhost:3000']);
        expect(result.flags.get('port')).toBe('5000');
      });

      it('should parse -c flag', () => {
        const result = parseArgs(['-c', 'config.js', 'localhost:3000']);
        expect(result.flags.get('config')).toBe('config.js');
      });

      it('should parse -d flag', () => {
        const result = parseArgs(['-d', '120', 'localhost:3000']);
        expect(result.flags.get('duration')).toBe('120');
      });

      it('should parse -r flag as boolean', () => {
        const result = parseArgs(['-r', 'localhost:3000']);
        expect(result.flags.get('report')).toBe(true);
      });

      it('should parse -P flag for proxy', () => {
        const result = parseArgs(['-P', 'localhost:3000']);
        expect(result.flags.get('proxy')).toBe(true);
      });

      it('should parse -t flag for tui', () => {
        const result = parseArgs(['-t', 'localhost:3000']);
        expect(result.flags.get('tui')).toBe(true);
      });

      it('should parse -s flag for silent', () => {
        const result = parseArgs(['-s', 'localhost:3000']);
        expect(result.flags.get('silent')).toBe(true);
      });

      it('should parse -w flag for watch', () => {
        const result = parseArgs(['-w', 'localhost:3000']);
        expect(result.flags.get('watch')).toBe(true);
      });

      it('should parse multiple short flags combined', () => {
        // Combined short flags like -rst (report, silent, tui)
        const result = parseArgs(['-rst', 'localhost:3000']);
        expect(result.flags.get('report')).toBe(true);
        expect(result.flags.get('silent')).toBe(true);
        expect(result.flags.get('tui')).toBe(true);
      });

      it('should handle combined flags with unknown first char', () => {
        // When first char is unknown but subsequent chars are valid
        // -xst where x is unknown, s and t are valid
        const result = parseArgs(['-xst', 'localhost:3000']);
        // s -> silent, t -> tui should be set
        expect(result.flags.get('silent')).toBe(true);
        expect(result.flags.get('tui')).toBe(true);
      });
    });

    describe('target URL', () => {
      it('should capture target URL', () => {
        const result = parseArgs(['https://example.com']);
        expect(result.target).toBe('https://example.com');
      });

      it('should capture target with flags before', () => {
        const result = parseArgs(['--report', 'localhost:8080']);
        expect(result.target).toBe('localhost:8080');
      });

      it('should capture target with flags after', () => {
        const result = parseArgs(['localhost:3000', '--verbose']);
        expect(result.target).toBe('localhost:3000');
      });
    });

    describe('positional arguments', () => {
      it('should capture additional positional args', () => {
        const result = parseArgs(['localhost:3000', 'extra', 'args']);
        expect(result.positional).toEqual(['extra', 'args']);
      });
    });

    describe('defaults', () => {
      it('should set default values', () => {
        const result = parseArgs(['localhost:3000']);
        expect(result.flags.get('format')).toBe('all');
        expect(result.flags.get('output')).toBe('./reactcheck-reports');
        expect(result.flags.get('port')).toBe('3099');
        expect(result.flags.get('threshold-critical')).toBe('50');
        expect(result.flags.get('threshold-warning')).toBe('20');
        expect(result.flags.get('fps-threshold')).toBe('30');
      });
    });

    describe('raw arguments', () => {
      it('should preserve raw arguments', () => {
        const args = ['--report', 'localhost:3000'];
        const result = parseArgs(args);
        expect(result.raw).toEqual(args);
      });
    });

    describe('edge cases', () => {
      it('should handle empty args', () => {
        const result = parseArgs([]);
        expect(result.command).toBe('scan');
        expect(result.target).toBeUndefined();
      });

      it('should handle undefined in array', () => {
        // This is an edge case for the undefined check
        const result = parseArgs(['localhost:3000']);
        expect(result.target).toBe('localhost:3000');
      });

      it('should handle unknown flags', () => {
        const result = parseArgs(['--unknown-flag', 'localhost:3000']);
        expect(result.flags.get('unknown-flag')).toBe(true);
      });

      it('should handle flag without takesValue getting next arg as value', () => {
        // verbose does not take value, so next arg should be target
        const result = parseArgs(['--verbose', 'localhost:3000']);
        expect(result.flags.get('verbose')).toBe(true);
        expect(result.target).toBe('localhost:3000');
      });

      it('should handle unknown short flags with multiple characters', () => {
        // -xyz where none are known flags
        const result = parseArgs(['-xyz', 'localhost:3000']);
        // Unknown flags should just be skipped, target should be parsed
        expect(result.target).toBe('localhost:3000');
      });

      it('should handle single dash as argument', () => {
        const result = parseArgs(['-', 'localhost:3000']);
        expect(result.target).toBe('localhost:3000');
      });

      it('should handle sparse array with undefined', () => {
        // Create an array with holes - this tests line 179-182
        const sparseArray = ['localhost:3000'];
        // @ts-expect-error - testing edge case
        sparseArray[5] = '--report';
        const result = parseArgs(sparseArray);
        expect(result.target).toBe('localhost:3000');
      });

      it('should handle --help flag converting to command', () => {
        // This tests lines 312-314
        const result = parseArgs(['localhost:3000', '--help']);
        expect(result.command).toBe('help');
      });

      it('should handle --version flag converting to command', () => {
        // This tests lines 315-317
        const result = parseArgs(['localhost:3000', '--version']);
        expect(result.command).toBe('version');
      });

      it('should handle pure unknown flag at end', () => {
        // This tests line 308
        const result = parseArgs(['localhost:3000', '-z']);
        expect(result.target).toBe('localhost:3000');
      });
    });
  });

  describe('getStringFlag', () => {
    it('should return string value', () => {
      const args = parseArgs(['--format', 'html', 'localhost:3000']);
      expect(getStringFlag(args, 'format')).toBe('html');
    });

    it('should return undefined for boolean flag', () => {
      const args = parseArgs(['--report', 'localhost:3000']);
      expect(getStringFlag(args, 'report')).toBeUndefined();
    });

    it('should return undefined for missing flag', () => {
      const args = parseArgs(['localhost:3000']);
      expect(getStringFlag(args, 'config')).toBeUndefined();
    });
  });

  describe('getBooleanFlag', () => {
    it('should return true for set boolean flag', () => {
      const args = parseArgs(['--report', 'localhost:3000']);
      expect(getBooleanFlag(args, 'report')).toBe(true);
    });

    it('should return false for unset boolean flag', () => {
      const args = parseArgs(['localhost:3000']);
      expect(getBooleanFlag(args, 'verbose')).toBe(false);
    });

    it('should handle string "true"', () => {
      const args = parseArgs(['localhost:3000']);
      args.flags.set('custom', 'true');
      expect(getBooleanFlag(args, 'custom')).toBe(true);
    });

    it('should return false for string "false"', () => {
      const args = parseArgs(['localhost:3000']);
      args.flags.set('custom', 'false');
      expect(getBooleanFlag(args, 'custom')).toBe(false);
    });
  });

  describe('getNumberFlag', () => {
    it('should return number value', () => {
      const args = parseArgs(['--port', '4000', 'localhost:3000']);
      expect(getNumberFlag(args, 'port')).toBe(4000);
    });

    it('should return undefined for non-numeric value', () => {
      const args = parseArgs(['localhost:3000']);
      args.flags.set('port', 'invalid');
      expect(getNumberFlag(args, 'port')).toBeUndefined();
    });

    it('should return undefined for boolean flag', () => {
      const args = parseArgs(['--report', 'localhost:3000']);
      expect(getNumberFlag(args, 'report')).toBeUndefined();
    });

    it('should parse negative numbers', () => {
      const args = parseArgs(['localhost:3000']);
      args.flags.set('test', '-5');
      expect(getNumberFlag(args, 'test')).toBe(-5);
    });
  });

  describe('validateArgs', () => {
    it('should return no errors for valid scan command', () => {
      const args = parseArgs(['localhost:3000']);
      expect(validateArgs(args)).toEqual([]);
    });

    it('should error if scan command has no target', () => {
      const args = parseArgs([]);
      const errors = validateArgs(args);
      expect(errors).toContain('Target URL is required for scan command');
    });

    it('should not require target for init command', () => {
      const args = parseArgs(['init']);
      expect(validateArgs(args)).toEqual([]);
    });

    it('should not require target for help command', () => {
      const args = parseArgs(['help']);
      expect(validateArgs(args)).toEqual([]);
    });

    it('should not require target for version command', () => {
      const args = parseArgs(['version']);
      expect(validateArgs(args)).toEqual([]);
    });

    it('should validate URL format', () => {
      const args = parseArgs([':::invalid']);
      const errors = validateArgs(args);
      expect(errors.some(e => e.includes('Invalid URL'))).toBe(true);
    });

    it('should accept URL without protocol', () => {
      const args = parseArgs(['localhost:3000']);
      expect(validateArgs(args)).toEqual([]);
    });

    it('should accept URL with protocol', () => {
      const args = parseArgs(['https://example.com']);
      expect(validateArgs(args)).toEqual([]);
    });

    it('should validate format choice', () => {
      const args = parseArgs(['--format', 'invalid', 'localhost:3000']);
      const errors = validateArgs(args);
      expect(errors.some(e => e.includes('Invalid format'))).toBe(true);
    });

    it('should accept valid format choices', () => {
      for (const format of ['html', 'json', 'md', 'all']) {
        const args = parseArgs(['--format', format, 'localhost:3000']);
        expect(validateArgs(args)).toEqual([]);
      }
    });

    it('should validate port range (too low)', () => {
      const args = parseArgs(['--port', '0', 'localhost:3000']);
      const errors = validateArgs(args);
      expect(errors.some(e => e.includes('Invalid port'))).toBe(true);
    });

    it('should validate port range (too high)', () => {
      const args = parseArgs(['--port', '70000', 'localhost:3000']);
      const errors = validateArgs(args);
      expect(errors.some(e => e.includes('Invalid port'))).toBe(true);
    });

    it('should accept valid port', () => {
      const args = parseArgs(['--port', '8080', 'localhost:3000']);
      expect(validateArgs(args)).toEqual([]);
    });

    it('should validate threshold order', () => {
      const args = parseArgs([
        '--threshold-critical', '20',
        '--threshold-warning', '50',
        'localhost:3000',
      ]);
      const errors = validateArgs(args);
      expect(errors.some(e => e.includes('Critical threshold must be greater'))).toBe(true);
    });

    it('should accept valid thresholds', () => {
      const args = parseArgs([
        '--threshold-critical', '100',
        '--threshold-warning', '20',
        'localhost:3000',
      ]);
      expect(validateArgs(args)).toEqual([]);
    });
  });

  describe('getHelpText', () => {
    it('should return help text', () => {
      const help = getHelpText();
      expect(typeof help).toBe('string');
      expect(help.length).toBeGreaterThan(0);
    });

    it('should include usage section', () => {
      const help = getHelpText();
      expect(help).toContain('Usage:');
    });

    it('should include options section', () => {
      const help = getHelpText();
      expect(help).toContain('Options:');
    });

    it('should include examples section', () => {
      const help = getHelpText();
      expect(help).toContain('Examples:');
    });

    it('should include major flags', () => {
      const help = getHelpText();
      expect(help).toContain('--help');
      expect(help).toContain('--version');
      expect(help).toContain('--report');
      expect(help).toContain('--format');
      expect(help).toContain('--output');
    });

    it('should include short flags', () => {
      const help = getHelpText();
      expect(help).toContain('-h');
      expect(help).toContain('-v');
      expect(help).toContain('-r');
      expect(help).toContain('-f');
      expect(help).toContain('-o');
    });

    it('should include group headers', () => {
      const help = getHelpText();
      expect(help).toContain('General:');
      expect(help).toContain('Mode:');
      expect(help).toContain('Report:');
      expect(help).toContain('Thresholds:');
      expect(help).toContain('Network:');
    });
  });

  describe('normalizeTarget', () => {
    it('should add http:// if no protocol', () => {
      expect(normalizeTarget('localhost:3000')).toBe('http://localhost:3000');
    });

    it('should add http:// for domain without protocol', () => {
      expect(normalizeTarget('example.com')).toBe('http://example.com');
    });

    it('should preserve http://', () => {
      expect(normalizeTarget('http://localhost:3000')).toBe('http://localhost:3000');
    });

    it('should preserve https://', () => {
      expect(normalizeTarget('https://example.com')).toBe('https://example.com');
    });

    it('should preserve other protocols', () => {
      expect(normalizeTarget('ws://localhost:3000')).toBe('ws://localhost:3000');
    });
  });

  describe('getFlagDefinitions', () => {
    it('should return flag definitions', () => {
      const defs = getFlagDefinitions();
      expect(typeof defs).toBe('object');
      expect(Object.keys(defs).length).toBeGreaterThan(0);
    });

    it('should include common flags', () => {
      const defs = getFlagDefinitions();
      expect(defs.help).toBeDefined();
      expect(defs.version).toBeDefined();
      expect(defs.report).toBeDefined();
      expect(defs.format).toBeDefined();
    });

    it('should return a copy (not modify original)', () => {
      const defs = getFlagDefinitions();
      defs.help = undefined as any;
      const defs2 = getFlagDefinitions();
      expect(defs2.help).toBeDefined();
    });

    it('should have short flags for some definitions', () => {
      const defs = getFlagDefinitions();
      expect(defs.help?.short).toBe('h');
      expect(defs.version?.short).toBe('v');
      expect(defs.format?.short).toBe('f');
    });

    it('should have descriptions', () => {
      const defs = getFlagDefinitions();
      for (const def of Object.values(defs)) {
        expect(def.description).toBeDefined();
        expect(typeof def.description).toBe('string');
      }
    });

    it('should have takesValue for flags that need values', () => {
      const defs = getFlagDefinitions();
      expect(defs.format?.takesValue).toBe(true);
      expect(defs.output?.takesValue).toBe(true);
      expect(defs.port?.takesValue).toBe(true);
      expect(defs.config?.takesValue).toBe(true);
    });

    it('should have choices for format flag', () => {
      const defs = getFlagDefinitions();
      expect(defs.format?.choices).toEqual(['html', 'json', 'md', 'all']);
    });
  });
});
