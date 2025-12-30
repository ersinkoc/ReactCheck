/**
 * Tests for CLI entry point
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CLI } from '../../../src/cli/index.js';

// Mock the scan and init commands to avoid side effects
vi.mock('../../../src/cli/commands/scan.js', () => ({
  runScanCommand: vi.fn().mockResolvedValue(0),
}));

vi.mock('../../../src/cli/commands/init.js', () => ({
  runInitCommand: vi.fn().mockResolvedValue(0),
}));

describe('CLI', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create CLI instance with argv', () => {
      const cli = new CLI(['--help']);
      expect(cli).toBeInstanceOf(CLI);
    });
  });

  describe('run', () => {
    describe('version command', () => {
      it('should handle version command', async () => {
        const cli = new CLI(['version']);
        const exitCode = await cli.run();

        expect(exitCode).toBe(0);
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('react-check')
        );
      });

      it('should handle --version flag', async () => {
        const cli = new CLI(['--version']);
        const exitCode = await cli.run();

        expect(exitCode).toBe(0);
      });

      it('should handle -v flag', async () => {
        const cli = new CLI(['-v']);
        const exitCode = await cli.run();

        expect(exitCode).toBe(0);
      });
    });

    describe('help command', () => {
      it('should handle help command', async () => {
        const cli = new CLI(['help']);
        const exitCode = await cli.run();

        expect(exitCode).toBe(0);
        expect(consoleLogSpy).toHaveBeenCalled();
      });

      it('should handle --help flag', async () => {
        const cli = new CLI(['--help']);
        const exitCode = await cli.run();

        expect(exitCode).toBe(0);
      });

      it('should handle -h flag', async () => {
        const cli = new CLI(['-h']);
        const exitCode = await cli.run();

        expect(exitCode).toBe(0);
      });

      it('should print banner for help', async () => {
        const cli = new CLI(['help']);
        await cli.run();

        // Check banner was printed (contains ReactCheck)
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('ReactCheck')
        );
      });
    });

    describe('init command', () => {
      it('should handle init command', async () => {
        const { runInitCommand } = await import('../../../src/cli/commands/init.js');
        const cli = new CLI(['init']);
        const exitCode = await cli.run();

        expect(exitCode).toBe(0);
        expect(runInitCommand).toHaveBeenCalled();
      });
    });

    describe('scan command', () => {
      it('should handle scan command with target', async () => {
        const { runScanCommand } = await import('../../../src/cli/commands/scan.js');
        const cli = new CLI(['localhost:3000']);
        const exitCode = await cli.run();

        expect(exitCode).toBe(0);
        expect(runScanCommand).toHaveBeenCalled();
      });

      it('should return error code 2 for missing target', async () => {
        const cli = new CLI([]);
        const exitCode = await cli.run();

        expect(exitCode).toBe(2);
      });

      it('should show help hint on validation error', async () => {
        const cli = new CLI([]);
        await cli.run();

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('--help')
        );
      });
    });

    describe('error handling', () => {
      it('should catch and log unexpected errors', async () => {
        const { runScanCommand } = await import('../../../src/cli/commands/scan.js');
        vi.mocked(runScanCommand).mockRejectedValueOnce(new Error('Unexpected'));

        const cli = new CLI(['localhost:3000']);
        const exitCode = await cli.run();

        expect(exitCode).toBe(1);
      });
    });
  });
});

describe('CLI Exports', () => {
  it('should export parseArgs', async () => {
    const { parseArgs } = await import('../../../src/cli/index.js');
    expect(parseArgs).toBeDefined();
    expect(typeof parseArgs).toBe('function');
  });

  it('should export validateArgs', async () => {
    const { validateArgs } = await import('../../../src/cli/index.js');
    expect(validateArgs).toBeDefined();
    expect(typeof validateArgs).toBe('function');
  });

  it('should export getHelpText', async () => {
    const { getHelpText } = await import('../../../src/cli/index.js');
    expect(getHelpText).toBeDefined();
    expect(typeof getHelpText).toBe('function');
  });

  it('should export loadConfig', async () => {
    const { loadConfig } = await import('../../../src/cli/index.js');
    expect(loadConfig).toBeDefined();
    expect(typeof loadConfig).toBe('function');
  });

  it('should export validateConfig', async () => {
    const { validateConfig } = await import('../../../src/cli/index.js');
    expect(validateConfig).toBeDefined();
    expect(typeof validateConfig).toBe('function');
  });

  it('should export generateDefaultConfigContent', async () => {
    const { generateDefaultConfigContent } = await import('../../../src/cli/index.js');
    expect(generateDefaultConfigContent).toBeDefined();
    expect(typeof generateDefaultConfigContent).toBe('function');
  });

  it('should export TUI', async () => {
    const { TUI } = await import('../../../src/cli/index.js');
    expect(TUI).toBeDefined();
  });
});
