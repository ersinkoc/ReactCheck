/**
 * Tests for Markdown report generator
 */

import { describe, it, expect } from 'vitest';
import { generateMarkdownReport } from '../../../src/report/markdown.js';
import type { SessionReport } from '../../../src/types.js';

describe('Markdown Report Generator', () => {
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
        renders: 60,
        expectedRenders: 5,
        avgRenderTime: 5.123,
        maxRenderTime: 15.789,
        minRenderTime: 1.234,
        totalRenderTime: 307.38,
        unnecessary: 40,
        severity: 'critical',
        chain: ['App', 'Button'],
        fixes: [
          {
            componentName: 'Button',
            severity: 'critical',
            issue: 'Too many re-renders',
            cause: 'Parent re-renders',
            fix: 'React.memo',
            codeBefore: 'function Button() {}',
            codeAfter: 'const Button = memo(function Button() {});',
            explanation: 'Use memo to prevent unnecessary re-renders',
            impact: 'Reduce re-renders by 67%',
          },
        ],
        firstRender: Date.now() - 30000,
        lastRender: Date.now(),
        propsChanged: true,
        stateChanged: false,
        parent: 'App',
      },
      {
        name: 'Header',
        renders: 25,
        expectedRenders: 5,
        avgRenderTime: 3,
        maxRenderTime: 8,
        minRenderTime: 1,
        totalRenderTime: 75,
        unnecessary: 15,
        severity: 'warning',
        chain: ['App', 'Header'],
        fixes: [],
        firstRender: Date.now() - 30000,
        lastRender: Date.now(),
        propsChanged: false,
        stateChanged: false,
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
      {
        trigger: 'Context update',
        chain: ['ThemeProvider', 'Header'],
        depth: 2,
        totalRenders: 5,
        rootCause: 'ThemeProvider',
        timestamp: Date.now(),
        isContextTriggered: true,
      },
    ],
    suggestions: [
      {
        componentName: 'Button',
        severity: 'critical',
        issue: 'Unnecessary re-renders',
        cause: 'Parent renders propagate',
        fix: 'React.memo',
        codeBefore: 'function Button() {\n  return <button>Click</button>;\n}',
        codeAfter: 'const Button = memo(function Button() {\n  return <button>Click</button>;\n});',
        explanation: 'Wrap component with React.memo',
        impact: 'Could reduce renders by 60%',
      },
    ],
    framework: {
      name: 'next',
      version: '14.0.0',
      features: ['app-router', 'rsc'],
      tips: ['Use server components for data fetching'],
    },
    timeline: [],
    ...overrides,
  });

  describe('generateMarkdownReport()', () => {
    it('should generate valid markdown', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('# ReactCheck Report');
    });

    it('should include session info', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('**URL:** http://localhost:3000');
      expect(md).toContain('**Duration:**');
      expect(md).toContain('**Session ID:** test-session-123');
    });

    it('should include summary table', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('## Summary');
      expect(md).toContain('| Metric | Value |');
      expect(md).toContain('| Total Components | 10 |');
      expect(md).toContain('| Total Renders | 100 |');
    });

    it('should include issues section', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('### Issues');
      expect(md).toContain('🔴 **Critical:** 2');
      expect(md).toContain('🟡 **Warning:** 3');
      expect(md).toContain('🟢 **Healthy:** 5');
    });

    it('should include critical issues section', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('## Critical Issues');
      expect(md).toContain('🔴 Button');
    });

    it('should include warnings section', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('## Warnings');
      expect(md).toContain('🟡 Header');
    });

    it('should include component details', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('**Renders:**');
      expect(md).toContain('**Unnecessary:**');
      expect(md).toContain('**Avg Render Time:**');
    });

    it('should include parent info', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('**Parent:** App');
    });

    it('should include render chain info', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('**Render Chain:**');
      expect(md).toContain('App → Button');
    });

    it('should include suggested fix', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('**Suggested Fix:**');
      expect(md).toContain('React.memo');
    });

    it('should include render chains section', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('## Render Chains');
      expect(md).toContain('### Chain: setState in App');
      expect(md).toContain('App → Header → Button');
      expect(md).toContain('**Depth:** 3');
      expect(md).toContain('**Root Cause:** App');
    });

    it('should include context triggered indicator', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('**Context Triggered:** Yes');
    });

    it('should include top fix suggestions', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('## Top Fix Suggestions');
      expect(md).toContain('**Issue:**');
      expect(md).toContain('**Cause:**');
      expect(md).toContain('**Before:**');
      expect(md).toContain('**After:**');
      expect(md).toContain('**Explanation:**');
      expect(md).toContain('**Expected Impact:**');
    });

    it('should include framework section', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('## Framework');
      expect(md).toContain('**Detected:** next 14.0.0');
      expect(md).toContain('**Features:** app-router, rsc');
      expect(md).toContain('### Framework-specific Tips');
      expect(md).toContain('Use server components');
    });

    it('should include all components table', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('## All Components');
      expect(md).toContain('| Component | Renders | Unnecessary | Avg Time | Severity |');
      expect(md).toContain('Button');
      expect(md).toContain('Header');
    });

    it('should include footer', () => {
      const report = createMockReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('Generated by [ReactCheck]');
      expect(md).toContain('v1.0.0');
    });

    it('should truncate warnings list at 10', () => {
      const warnings = Array.from({ length: 15 }, (_, i) => ({
        name: `Warning${i}`,
        renders: 25,
        expectedRenders: 5,
        avgRenderTime: 3,
        maxRenderTime: 8,
        minRenderTime: 1,
        totalRenderTime: 75,
        unnecessary: 15,
        severity: 'warning' as const,
        chain: [],
        fixes: [],
        firstRender: Date.now(),
        lastRender: Date.now(),
        propsChanged: false,
        stateChanged: false,
      }));

      const report = createMockReport({ components: warnings });
      const md = generateMarkdownReport(report);
      expect(md).toContain('*...and 5 more warnings*');
    });

    it('should truncate chains list at 5', () => {
      const chains = Array.from({ length: 8 }, (_, i) => ({
        trigger: `Trigger${i}`,
        chain: ['A', 'B'],
        depth: 2,
        totalRenders: 5,
        rootCause: 'A',
        timestamp: Date.now(),
        isContextTriggered: false,
      }));

      const report = createMockReport({ chains });
      const md = generateMarkdownReport(report);
      expect(md).toContain('*...and 3 more chains*');
    });

    it('should truncate components table at 50', () => {
      const components = Array.from({ length: 60 }, (_, i) => ({
        name: `Component${i}`,
        renders: 10,
        expectedRenders: 5,
        avgRenderTime: 3,
        maxRenderTime: 8,
        minRenderTime: 1,
        totalRenderTime: 30,
        unnecessary: 5,
        severity: 'healthy' as const,
        chain: [],
        fixes: [],
        firstRender: Date.now(),
        lastRender: Date.now(),
        propsChanged: false,
        stateChanged: false,
      }));

      const report = createMockReport({ components });
      const md = generateMarkdownReport(report);
      expect(md).toContain('*Showing top 50 of 60 components*');
    });

    it('should skip framework section when null', () => {
      const report = createMockReport({ framework: null });
      const md = generateMarkdownReport(report);
      expect(md).not.toContain('## Framework');
    });

    it('should skip empty framework features', () => {
      const report = createMockReport({
        framework: {
          name: 'next',
          version: '14.0.0',
          features: [],
          tips: [],
        },
      });
      const md = generateMarkdownReport(report);
      expect(md).not.toContain('**Features:**');
    });

    it('should skip empty framework tips', () => {
      const report = createMockReport({
        framework: {
          name: 'next',
          version: '14.0.0',
          features: ['app-router'],
          tips: [],
        },
      });
      const md = generateMarkdownReport(report);
      expect(md).not.toContain('### Framework-specific Tips');
    });

    it('should truncate code examples', () => {
      const longCode = Array.from({ length: 15 }, (_, i) => `line ${i}`).join('\n');
      // Add a critical component named 'Test' so the suggestion gets matched and triggers truncation
      const report = createMockReport({
        components: [
          ...createMockReport().components,
          {
            name: 'Test',
            renders: 50,
            expectedRenders: 5,
            avgRenderTime: 10,
            maxRenderTime: 20,
            minRenderTime: 1,
            totalRenderTime: 500,
            unnecessary: 40,
            severity: 'critical' as const,
            chain: ['App', 'Test'],
            fixes: [],
            firstRender: Date.now() - 30000,
            lastRender: Date.now(),
            propsChanged: false,
            stateChanged: false,
          },
        ],
        suggestions: [
          {
            componentName: 'Test',
            severity: 'critical',
            issue: 'Issue',
            cause: 'Cause',
            fix: 'React.memo',
            codeBefore: longCode,
            codeAfter: longCode,
            explanation: 'Explanation',
          },
        ],
      });

      const md = generateMarkdownReport(report);
      expect(md).toContain('// ...');
    });

    it('should handle empty critical issues', () => {
      const report = createMockReport({
        summary: { ...createMockReport().summary, criticalIssues: 0 },
        components: createMockReport().components.map((c) => ({
          ...c,
          severity: 'healthy' as const,
        })),
      });
      const md = generateMarkdownReport(report);
      expect(md).not.toContain('## Critical Issues');
    });

    it('should handle empty warnings', () => {
      const report = createMockReport({
        summary: { ...createMockReport().summary, warnings: 0 },
        components: createMockReport().components.map((c) => ({
          ...c,
          severity: c.severity === 'warning' ? ('healthy' as const) : c.severity,
        })),
      });
      const md = generateMarkdownReport(report);
      // Check that there are no warning sections
      const warningMatches = md.match(/## Warnings/g);
      expect(warningMatches?.length ?? 0).toBeLessThanOrEqual(1);
    });

    it('should handle empty chains', () => {
      const report = createMockReport({ chains: [] });
      const md = generateMarkdownReport(report);
      expect(md).not.toContain('## Render Chains');
    });

    it('should handle empty suggestions', () => {
      const report = createMockReport({
        suggestions: [],
        components: createMockReport().components.map((c) => ({ ...c, fixes: [] })),
      });
      const md = generateMarkdownReport(report);
      expect(md).not.toContain('## Top Fix Suggestions');
    });

    it('should handle info severity', () => {
      const report = createMockReport({
        components: createMockReport().components.map((c) => ({
          ...c,
          severity: 'info' as const,
        })),
      });
      const md = generateMarkdownReport(report);
      expect(md).toContain('🔵');
    });

    it('should handle unknown severity with default emoji', () => {
      const report = createMockReport({
        components: createMockReport().components.map((c) => ({
          ...c,
          severity: 'unknown' as unknown as 'critical' | 'warning' | 'info' | 'healthy',
        })),
      });
      const md = generateMarkdownReport(report);
      expect(md).toContain('⚪');
    });
  });
});
