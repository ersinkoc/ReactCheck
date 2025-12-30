/**
 * Tests for JSON report generator
 */

import { describe, it, expect } from 'vitest';
import {
  generateJSONReport,
  parseJSONReport,
  validateJSONReport,
} from '../../../src/report/json.js';
import type { SessionReport } from '../../../src/types.js';

describe('JSON Report Generator', () => {
  const createMockReport = (overrides: Partial<SessionReport> = {}): SessionReport => ({
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
    components: [
      {
        name: 'Button',
        renders: 20,
        expectedRenders: 5,
        avgRenderTime: 5.123,
        maxRenderTime: 15.789,
        minRenderTime: 1.234,
        totalRenderTime: 102.46,
        unnecessary: 10,
        severity: 'warning',
        chain: ['App', 'Button'],
        fixes: [
          {
            componentName: 'Button',
            severity: 'warning',
            issue: 'Too many re-renders',
            cause: 'Parent re-renders',
            fix: 'React.memo',
            codeBefore: 'function Button() {}',
            codeAfter: 'const Button = memo(function Button() {});',
            explanation: 'Use memo',
            impact: 'Reduce re-renders',
          },
        ],
        firstRender: Date.now() - 30000,
        lastRender: Date.now(),
        propsChanged: true,
        stateChanged: false,
        parent: 'App',
      },
    ],
    chains: [
      {
        trigger: 'setState in App',
        chain: ['App', 'Header', 'Button'],
        depth: 3,
        totalRenders: 10,
        rootCause: 'App',
        timestamp: Date.now(),
        isContextTriggered: false,
      },
    ],
    suggestions: [
      {
        componentName: 'Button',
        severity: 'warning',
        issue: 'Unnecessary re-renders',
        cause: 'Parent renders',
        fix: 'React.memo',
        codeBefore: 'code before',
        codeAfter: 'code after',
        explanation: 'explanation',
        impact: 'impact',
      },
    ],
    framework: {
      name: 'next',
      version: '14.0.0',
      features: ['app-router', 'rsc'],
      tips: ['Use server components'],
    },
    timeline: [],
    ...overrides,
  });

  describe('generateJSONReport()', () => {
    it('should generate valid JSON', () => {
      const report = createMockReport();
      const json = generateJSONReport(report);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should generate pretty JSON by default', () => {
      const report = createMockReport();
      const json = generateJSONReport(report);
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should generate compact JSON when pretty=false', () => {
      const report = createMockReport();
      const json = generateJSONReport(report, false);
      expect(json).not.toContain('\n');
    });

    it('should include version', () => {
      const report = createMockReport();
      const json = generateJSONReport(report);
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('1.0.0');
    });

    it('should include session info', () => {
      const report = createMockReport();
      const json = generateJSONReport(report);
      const parsed = JSON.parse(json);
      expect(parsed.session.url).toBe('http://localhost:3000');
      expect(parsed.session.duration).toBe(30000);
      expect(parsed.session.id).toBe('test-session-123');
    });

    it('should include summary', () => {
      const report = createMockReport();
      const json = generateJSONReport(report);
      const parsed = JSON.parse(json);
      expect(parsed.summary.totalComponents).toBe(10);
      expect(parsed.summary.totalRenders).toBe(100);
      expect(parsed.summary.criticalIssues).toBe(2);
      expect(parsed.summary.warnings).toBe(3);
      expect(parsed.summary.healthy).toBe(5);
    });

    it('should include components with rounded render times', () => {
      const report = createMockReport();
      const json = generateJSONReport(report);
      const parsed = JSON.parse(json);
      expect(parsed.components[0].avgRenderTime).toBe(5.12);
      expect(parsed.components[0].maxRenderTime).toBe(15.79);
      expect(parsed.components[0].minRenderTime).toBe(1.23);
    });

    it('should handle Infinity minRenderTime', () => {
      const report = createMockReport();
      report.components[0].minRenderTime = Infinity;
      const json = generateJSONReport(report);
      const parsed = JSON.parse(json);
      expect(parsed.components[0].minRenderTime).toBe(0);
    });

    it('should include chains', () => {
      const report = createMockReport();
      const json = generateJSONReport(report);
      const parsed = JSON.parse(json);
      expect(parsed.chains).toHaveLength(1);
      expect(parsed.chains[0].trigger).toBe('setState in App');
      expect(parsed.chains[0].chain).toEqual(['App', 'Header', 'Button']);
    });

    it('should include suggestions', () => {
      const report = createMockReport();
      const json = generateJSONReport(report);
      const parsed = JSON.parse(json);
      expect(parsed.suggestions).toHaveLength(1);
      expect(parsed.suggestions[0].fix).toBe('React.memo');
    });

    it('should include framework info', () => {
      const report = createMockReport();
      const json = generateJSONReport(report);
      const parsed = JSON.parse(json);
      expect(parsed.framework.name).toBe('next');
      expect(parsed.framework.version).toBe('14.0.0');
      expect(parsed.framework.features).toContain('app-router');
    });

    it('should handle null framework', () => {
      const report = createMockReport({ framework: null });
      const json = generateJSONReport(report);
      const parsed = JSON.parse(json);
      expect(parsed.framework).toBeNull();
    });

    it('should handle null parent', () => {
      const report = createMockReport();
      report.components[0].parent = undefined;
      const json = generateJSONReport(report);
      const parsed = JSON.parse(json);
      expect(parsed.components[0].parent).toBeNull();
    });

    it('should handle null impact', () => {
      const report = createMockReport();
      report.suggestions[0].impact = undefined;
      const json = generateJSONReport(report);
      const parsed = JSON.parse(json);
      expect(parsed.suggestions[0].impact).toBeNull();
    });
  });

  describe('parseJSONReport()', () => {
    it('should parse valid JSON report', () => {
      const report = createMockReport();
      const json = generateJSONReport(report);
      const parsed = parseJSONReport(json);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.session.url).toBe('http://localhost:3000');
    });

    it('should throw on invalid JSON', () => {
      expect(() => parseJSONReport('invalid json')).toThrow();
    });
  });

  describe('validateJSONReport()', () => {
    it('should return empty array for valid report', () => {
      const report = createMockReport();
      const json = generateJSONReport(report);
      const parsed = JSON.parse(json);
      const errors = validateJSONReport(parsed);
      expect(errors).toEqual([]);
    });

    it('should detect non-object input', () => {
      const errors = validateJSONReport(null);
      expect(errors).toContain('Report must be an object');
    });

    it('should detect non-object primitive', () => {
      const errors = validateJSONReport('string');
      expect(errors).toContain('Report must be an object');
    });

    it('should detect missing required fields', () => {
      const errors = validateJSONReport({});
      expect(errors).toContain('Missing required field: version');
      expect(errors).toContain('Missing required field: generated');
      expect(errors).toContain('Missing required field: session');
      expect(errors).toContain('Missing required field: summary');
      expect(errors).toContain('Missing required field: components');
    });

    it('should detect invalid session.url', () => {
      const errors = validateJSONReport({
        version: '1.0.0',
        generated: 'date',
        session: { duration: 1000 },
        summary: { totalComponents: 10, totalRenders: 100 },
        components: [],
      });
      expect(errors).toContain('session.url is required');
    });

    it('should detect invalid session.duration', () => {
      const errors = validateJSONReport({
        version: '1.0.0',
        generated: 'date',
        session: { url: 'http://test.com', duration: 'invalid' },
        summary: { totalComponents: 10, totalRenders: 100 },
        components: [],
      });
      expect(errors).toContain('session.duration must be a number');
    });

    it('should detect invalid summary.totalComponents', () => {
      const errors = validateJSONReport({
        version: '1.0.0',
        generated: 'date',
        session: { url: 'http://test.com', duration: 1000 },
        summary: { totalComponents: 'invalid', totalRenders: 100 },
        components: [],
      });
      expect(errors).toContain('summary.totalComponents must be a number');
    });

    it('should detect invalid summary.totalRenders', () => {
      const errors = validateJSONReport({
        version: '1.0.0',
        generated: 'date',
        session: { url: 'http://test.com', duration: 1000 },
        summary: { totalComponents: 10, totalRenders: 'invalid' },
        components: [],
      });
      expect(errors).toContain('summary.totalRenders must be a number');
    });

    it('should detect non-array components', () => {
      const errors = validateJSONReport({
        version: '1.0.0',
        generated: 'date',
        session: { url: 'http://test.com', duration: 1000 },
        summary: { totalComponents: 10, totalRenders: 100 },
        components: 'invalid',
      });
      expect(errors).toContain('components must be an array');
    });
  });
});
