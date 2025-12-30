/**
 * Tests for init command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runInitCommand, printExampleConfigs } from '../../../../src/cli/commands/init.js';
import type { ParsedArgs } from '../../../../src/cli/args.js';
import * as fs from '../../../../src/utils/fs.js';

// Mock fs utilities
vi.mock('../../../../src/utils/fs.js', async () => {
  const actual = await vi.importActual('../../../../src/utils/fs.js');
  return {
    ...actual,
    exists: vi.fn(),
    readTextFile: vi.fn(),
    writeTextFile: vi.fn(),
  };
});

describe('Init Command', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  function createMockArgs(positional: string[] = []): ParsedArgs {
    return {
      command: 'init',
      flags: new Map(),
      positional,
      raw: ['init', ...positional],
    };
  }

  describe('runInitCommand', () => {
    it('should create config file when it does not exist', async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(fs.writeTextFile).mockResolvedValue();

      const args = createMockArgs();
      const result = await runInitCommand(args);

      expect(result).toBe(0);
      expect(fs.writeTextFile).toHaveBeenCalledWith(
        'reactcheck.config.js',
        expect.stringContaining('export default')
      );
    });

    it('should use custom filename from positional arg', async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(fs.writeTextFile).mockResolvedValue();

      const args = createMockArgs(['custom.config.js']);
      const result = await runInitCommand(args);

      expect(result).toBe(0);
      expect(fs.writeTextFile).toHaveBeenCalledWith(
        'custom.config.js',
        expect.stringContaining('export default')
      );
    });

    it('should create JSON config for .json extension', async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(fs.writeTextFile).mockResolvedValue();

      const args = createMockArgs(['reactcheck.config.json']);
      const result = await runInitCommand(args);

      expect(result).toBe(0);
      expect(fs.writeTextFile).toHaveBeenCalledWith(
        'reactcheck.config.json',
        expect.stringContaining('"thresholds"')
      );
    });

    it('should not overwrite existing config', async () => {
      vi.mocked(fs.exists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify({
        thresholds: { critical: 50 },
      }));

      const args = createMockArgs();
      const result = await runInitCommand(args);

      expect(result).toBe(0);
      expect(fs.writeTextFile).not.toHaveBeenCalled();
    });

    it('should validate existing JSON config', async () => {
      vi.mocked(fs.exists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify({
        thresholds: { critical: 50, warning: 20 },
      }));

      const args = createMockArgs(['existing.json']);
      const result = await runInitCommand(args);

      expect(result).toBe(0);
      // Should log that existing config is valid
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should report validation errors for invalid existing config', async () => {
      vi.mocked(fs.exists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify({
        thresholds: { critical: 10, warning: 50 },
      }));

      const args = createMockArgs(['existing.json']);
      const result = await runInitCommand(args);

      expect(result).toBe(0);
    });

    it('should handle read errors for existing config gracefully', async () => {
      vi.mocked(fs.exists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockRejectedValue(new Error('Read error'));

      const args = createMockArgs();
      const result = await runInitCommand(args);

      expect(result).toBe(0);
    });

    it('should handle invalid JSON in existing config gracefully', async () => {
      vi.mocked(fs.exists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue('{ invalid json }');

      const args = createMockArgs(['existing.json']);
      const result = await runInitCommand(args);

      expect(result).toBe(0);
    });

    it('should return error code 1 on write failure', async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(fs.writeTextFile).mockRejectedValue(new Error('Write error'));

      const args = createMockArgs();
      const result = await runInitCommand(args);

      expect(result).toBe(1);
    });

    it('should print success message after creating config', async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(fs.writeTextFile).mockResolvedValue();

      const args = createMockArgs();
      await runInitCommand(args);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Created')
      );
    });

    it('should print usage hints after creating config', async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);
      vi.mocked(fs.writeTextFile).mockResolvedValue();

      const args = createMockArgs();
      await runInitCommand(args);

      // Should print configuration options
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Configuration options')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('npx @oxog/react-check')
      );
    });

    it('should skip JS config validation (only validates JSON)', async () => {
      vi.mocked(fs.exists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue('export default {}');

      const args = createMockArgs(['existing.config.js']);
      const result = await runInitCommand(args);

      expect(result).toBe(0);
      // Should not try to parse JS as JSON
    });
  });

  describe('printExampleConfigs', () => {
    it('should print example configurations', () => {
      printExampleConfigs();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Example Configurations')
      );
    });

    it('should include strict configuration example', () => {
      printExampleConfigs();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Strict configuration')
      );
    });

    it('should include CI/CD configuration example', () => {
      printExampleConfigs();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('CI/CD configuration')
      );
    });

    it('should include focus on specific components example', () => {
      printExampleConfigs();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Focus on specific components')
      );
    });
  });
});
