/**
 * Tests for report module exports
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  generateReport,
  saveReport,
  saveReports,
  ReportGenerator,
  type ReportFormat,
} from '../../../src/report/index.js';
import type { SessionReport } from '../../../src/types.js';

describe('Report Module', () => {
  const testDir = join(tmpdir(), 'reactcheck-report-test-' + Date.now());

  const createMockReport = (): SessionReport => ({
    version: '1.0.0',
    generated: '2024-01-15T10:30:00.000Z',
    session: {
      id: 'test-session-123',
      url: 'http://localhost:3000',
      duration: 30000,
      timestamp: '2024-01-15T10:00:00.000Z',
    },
    summary: {
      totalComponents: 10,
      totalRenders: 100,
      criticalIssues: 2,
      warnings: 3,
      healthy: 5,
      avgFps: 58,
      minFps: 45,
      unnecessaryRenders: 25,
    },
    components: [],
    chains: [],
    suggestions: [],
    framework: null,
    timeline: [],
  });

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('generateReport()', () => {
    it('should generate HTML report', () => {
      const report = createMockReport();
      const result = generateReport(report, 'html');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('ReactCheck Report');
    });

    it('should generate JSON report', () => {
      const report = createMockReport();
      const result = generateReport(report, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.version).toBe('1.0.0');
    });

    it('should generate Markdown report', () => {
      const report = createMockReport();
      const result = generateReport(report, 'md');
      expect(result).toContain('# ReactCheck Report');
    });

    it('should throw for unknown format', () => {
      const report = createMockReport();
      expect(() => generateReport(report, 'xml' as ReportFormat)).toThrow('Unknown report format');
    });
  });

  describe('saveReport()', () => {
    it('should save HTML report to file', async () => {
      const report = createMockReport();
      const path = await saveReport(report, 'html', testDir, 'test-report');
      expect(path).toContain('test-report.html');
      const content = await readFile(path, 'utf-8');
      expect(content).toContain('<!DOCTYPE html>');
    });

    it('should save JSON report to file', async () => {
      const report = createMockReport();
      const path = await saveReport(report, 'json', testDir, 'test-report');
      expect(path).toContain('test-report.json');
    });

    it('should save Markdown report to file', async () => {
      const report = createMockReport();
      const path = await saveReport(report, 'md', testDir, 'test-report');
      expect(path).toContain('test-report.md');
    });

    it('should generate filename if not provided', async () => {
      const report = createMockReport();
      const path = await saveReport(report, 'html', testDir);
      expect(path).toContain('reactcheck-report-');
    });

    it('should create output directory if needed', async () => {
      const report = createMockReport();
      const nestedDir = join(testDir, 'nested', 'reports');
      const path = await saveReport(report, 'html', nestedDir, 'test');
      expect(path).toContain('test.html');
    });
  });

  describe('saveReports()', () => {
    it('should save multiple report formats', async () => {
      const report = createMockReport();
      const paths = await saveReports(report, {
        enabled: true,
        formats: ['html', 'json', 'md'],
        output: testDir,
        includeSourceCode: false,
      });
      expect(paths.length).toBe(3);
    });

    it('should return empty array if disabled', async () => {
      const report = createMockReport();
      const paths = await saveReports(report, {
        enabled: false,
        formats: ['html'],
        output: testDir,
        includeSourceCode: false,
      });
      expect(paths.length).toBe(0);
    });
  });

  describe('ReportGenerator', () => {
    it('should create with default options', () => {
      const generator = new ReportGenerator();
      const options = generator.getOptions();
      expect(options.enabled).toBe(true);
      expect(options.formats).toContain('html');
      expect(options.formats).toContain('json');
    });

    it('should create with custom options', () => {
      const generator = new ReportGenerator({
        enabled: false,
        formats: ['md'],
        output: '/custom/path',
      });
      const options = generator.getOptions();
      expect(options.enabled).toBe(false);
      expect(options.formats).toEqual(['md']);
    });

    it('should generate report content', () => {
      const generator = new ReportGenerator();
      const report = createMockReport();
      const html = generator.generate(report, 'html');
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('should generate all configured formats', () => {
      const generator = new ReportGenerator({
        formats: ['html', 'json', 'md'],
      });
      const report = createMockReport();
      const results = generator.generateAll(report);
      expect(results.size).toBe(3);
      expect(results.get('html')).toContain('<!DOCTYPE html>');
      expect(results.get('json')).toContain('"version"');
      expect(results.get('md')).toContain('# ReactCheck Report');
    });

    it('should save report to file', async () => {
      const generator = new ReportGenerator({ output: testDir });
      const report = createMockReport();
      const path = await generator.save(report, 'html');
      expect(path).toContain('.html');
    });

    it('should save all configured formats', async () => {
      const generator = new ReportGenerator({
        enabled: true,
        formats: ['html', 'json'],
        output: testDir,
      });
      const report = createMockReport();
      const paths = await generator.saveAll(report);
      expect(paths.length).toBe(2);
    });

    it('should configure options', () => {
      const generator = new ReportGenerator();
      generator.configure({ enabled: false });
      expect(generator.getOptions().enabled).toBe(false);
    });
  });
});
