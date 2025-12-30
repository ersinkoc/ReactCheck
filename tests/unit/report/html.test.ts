/**
 * Tests for HTML report generator
 */

import { describe, it, expect } from 'vitest';
import { generateHTMLReport } from '../../../src/report/html.js';
import type { SessionReport } from '../../../src/types.js';

describe('HTML Report Generator', () => {
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
        fixes: [],
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
      {
        name: 'Footer',
        renders: 2,
        expectedRenders: 2,
        avgRenderTime: 1,
        maxRenderTime: 2,
        minRenderTime: 0.5,
        totalRenderTime: 2,
        unnecessary: 0,
        severity: 'healthy',
        chain: [],
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

  describe('generateHTMLReport()', () => {
    it('should generate valid HTML', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should include head with meta and title', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('<head>');
      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('<title>ReactCheck Report');
    });

    it('should include CSS styles', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('<style>');
      expect(html).toContain('--bg-primary');
      expect(html).toContain('--accent-red');
    });

    it('should include header section', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('ReactCheck Report');
      expect(html).toContain('http://localhost:3000');
      expect(html).toContain('test-session-123');
    });

    it('should include summary section', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('Summary');
      expect(html).toContain('10');
      expect(html).toContain('Components');
      expect(html).toContain('100');
      expect(html).toContain('Renders');
    });

    it('should include critical issues', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('Critical Issues');
      expect(html).toContain('Button');
      expect(html).toContain('critical');
    });

    it('should include warnings', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('Warnings');
      expect(html).toContain('Header');
    });

    it('should show success message when no issues', () => {
      const report = createMockReport({
        summary: { ...createMockReport().summary, criticalIssues: 0, warnings: 0 },
        components: createMockReport().components.map((c) => ({
          ...c,
          severity: 'healthy' as const,
        })),
      });
      const html = generateHTMLReport(report);
      expect(html).toContain('No critical issues or warnings found!');
    });

    it('should include render chains', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('Render Chains');
      expect(html).toContain('setState in App');
      expect(html).toContain('App → Header → Button');
    });

    it('should skip empty chains section', () => {
      const report = createMockReport({ chains: [] });
      const html = generateHTMLReport(report);
      // Should not have the chains header if no chains
      const chainsHeaderCount = (html.match(/Render Chains/g) || []).length;
      expect(chainsHeaderCount).toBeLessThanOrEqual(1);
    });

    it('should include suggestions', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('Top Fix Suggestions');
      expect(html).toContain('React.memo');
      expect(html).toContain('code-block');
    });

    it('should skip empty suggestions section', () => {
      const report = createMockReport({ suggestions: [] });
      const html = generateHTMLReport(report);
      // Should not have extensive suggestions section
      expect(html).not.toContain('Show Code');
    });

    it('should include all components table', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('All Components');
      expect(html).toContain('component-search');
      expect(html).toContain('<table>');
      expect(html).toContain('Button');
      expect(html).toContain('Header');
      expect(html).toContain('Footer');
    });

    it('should truncate components table at 100', () => {
      const components = Array.from({ length: 120 }, (_, i) => ({
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
      const html = generateHTMLReport(report);
      expect(html).toContain('Showing top 100 of 120 components');
    });

    it('should truncate warnings at 10', () => {
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

      const report = createMockReport({
        components: warnings,
        summary: { ...createMockReport().summary, warnings: 15 },
      });
      const html = generateHTMLReport(report);
      expect(html).toContain('and 5 more warnings');
    });

    it('should truncate chains at 5', () => {
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
      const html = generateHTMLReport(report);
      expect(html).toContain('and 3 more chains');
    });

    it('should include footer with version', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('Generated by');
      expect(html).toContain('ReactCheck');
      expect(html).toContain('v1.0.0');
    });

    it('should include JavaScript for interactivity', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('<script>');
      expect(html).toContain('collapsible');
      expect(html).toContain('component-search');
    });

    it('should escape HTML in component names', () => {
      const report = createMockReport();
      report.components[0].name = '<script>alert("XSS")</script>';
      const html = generateHTMLReport(report);
      expect(html).not.toContain('<script>alert("XSS")</script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should escape HTML in URL', () => {
      const report = createMockReport();
      report.session.url = 'http://test.com?q=<script>';
      const html = generateHTMLReport(report);
      expect(html).toContain('&lt;script&gt;');
    });

    it('should include severity badges', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('class="badge critical"');
      expect(html).toContain('class="badge warning"');
      expect(html).toContain('class="badge healthy"');
    });

    it('should include data attributes for search', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('data-name="Button"');
      expect(html).toContain('component-row');
    });

    it('should include collapsible sections', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('collapsible');
      expect(html).toContain('collapsible-content');
      expect(html).toContain('Show Code');
    });

    it('should handle print styles', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('@media print');
    });

    it('should include responsive grid for summary', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('summary-grid');
      expect(html).toContain('summary-card');
    });

    it('should include suggestion code truncation', () => {
      const longCode = Array.from({ length: 600 }, () => 'x').join('');
      const report = createMockReport({
        suggestions: [
          {
            componentName: 'Test',
            severity: 'warning',
            issue: 'Issue',
            cause: 'Cause',
            fix: 'React.memo',
            codeBefore: longCode,
            codeAfter: longCode,
            explanation: 'Explanation',
          },
        ],
      });

      const html = generateHTMLReport(report);
      // Code should be truncated to 500 chars
      const codeBlocks = html.match(/<pre class="code-block">.*?<\/pre>/gs) || [];
      const firstBlock = codeBlocks[0] || '';
      expect(firstBlock.length).toBeLessThan(longCode.length);
    });

    it('should include issue stats in cards', () => {
      const report = createMockReport();
      const html = generateHTMLReport(report);
      expect(html).toContain('issue-stats');
      expect(html).toContain('renders');
      expect(html).toContain('unnecessary');
      expect(html).toContain('avg');
    });
  });
});
