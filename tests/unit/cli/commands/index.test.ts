/**
 * Tests for CLI commands index exports
 */

import { describe, it, expect } from 'vitest';
import {
  runScanCommand,
  parseScanOptions,
  runInitCommand,
  printExampleConfigs,
} from '../../../../src/cli/commands/index.js';

describe('CLI Commands Exports', () => {
  it('should export runScanCommand', () => {
    expect(runScanCommand).toBeDefined();
    expect(typeof runScanCommand).toBe('function');
  });

  it('should export parseScanOptions', () => {
    expect(parseScanOptions).toBeDefined();
    expect(typeof parseScanOptions).toBe('function');
  });

  it('should export runInitCommand', () => {
    expect(runInitCommand).toBeDefined();
    expect(typeof runInitCommand).toBe('function');
  });

  it('should export printExampleConfigs', () => {
    expect(printExampleConfigs).toBeDefined();
    expect(typeof printExampleConfigs).toBe('function');
  });
});
