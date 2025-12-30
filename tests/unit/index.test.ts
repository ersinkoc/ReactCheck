/**
 * Tests for main index exports
 * Note: We import specific modules to avoid browser-only code that runs immediately
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// Mock window before any imports
beforeAll(() => {
  // @ts-expect-error - mocking for test
  global.window = {
    __REACTCHECK_INJECTED__: true,
    document: {
      querySelector: () => null,
      createElement: () => ({}),
      body: {
        appendChild: () => {},
      },
    },
  };
});

afterAll(() => {
  // @ts-expect-error - cleanup mock
  delete global.window;
});

// Dynamic import to ensure window mock is in place first
let ReactCheck: typeof import('../../src/index.js');

describe('ReactCheck Main Module', () => {
  beforeAll(async () => {
    ReactCheck = await import('../../src/index.js');
  });

  describe('exports', () => {
    it('should export VERSION', () => {
      expect(ReactCheck.VERSION).toBe('1.0.0');
    });

    it('should export core classes', () => {
      expect(ReactCheck.Scanner).toBeDefined();
      expect(ReactCheck.StatsCollector).toBeDefined();
      expect(ReactCheck.ChainAnalyzer).toBeDefined();
      expect(ReactCheck.FixSuggester).toBeDefined();
    });

    it('should export fiber utilities', () => {
      expect(ReactCheck.getComponentName).toBeDefined();
      expect(ReactCheck.walkFiberTree).toBeDefined();
      expect(ReactCheck.isHostComponent).toBeDefined();
    });

    it('should export report functions', () => {
      expect(ReactCheck.generateReport).toBeDefined();
      expect(ReactCheck.generateJSONReport).toBeDefined();
      expect(ReactCheck.generateMarkdownReport).toBeDefined();
      expect(ReactCheck.generateHTMLReport).toBeDefined();
      expect(ReactCheck.saveReport).toBeDefined();
      expect(ReactCheck.saveReports).toBeDefined();
      expect(ReactCheck.ReportGenerator).toBeDefined();
    });

    it('should export framework detection', () => {
      expect(ReactCheck.detectFramework).toBeDefined();
      expect(ReactCheck.detectFrameworkFromWindow).toBeDefined();
      expect(ReactCheck.getFrameworkTips).toBeDefined();
      expect(ReactCheck.frameworkDetectors).toBeDefined();
    });

    it('should export utilities', () => {
      expect(ReactCheck.colors).toBeDefined();
      expect(ReactCheck.supportsColor).toBeDefined();
      expect(ReactCheck.EventEmitter).toBeDefined();
      expect(ReactCheck.Logger).toBeDefined();
      expect(ReactCheck.LogLevel).toBeDefined();
    });

    it('should export format utilities', () => {
      expect(ReactCheck.formatDuration).toBeDefined();
      expect(ReactCheck.formatBytes).toBeDefined();
      expect(ReactCheck.formatNumber).toBeDefined();
      expect(ReactCheck.formatPercent).toBeDefined();
      expect(ReactCheck.formatRenderTime).toBeDefined();
      expect(ReactCheck.truncate).toBeDefined();
      expect(ReactCheck.pad).toBeDefined();
      expect(ReactCheck.escapeHtml).toBeDefined();
    });

    it('should export file system utilities', () => {
      expect(ReactCheck.exists).toBeDefined();
      expect(ReactCheck.readTextFile).toBeDefined();
      expect(ReactCheck.writeTextFile).toBeDefined();
      expect(ReactCheck.readJsonFile).toBeDefined();
      expect(ReactCheck.writeJsonFile).toBeDefined();
      expect(ReactCheck.ensureDir).toBeDefined();
      expect(ReactCheck.findUp).toBeDefined();
      expect(ReactCheck.joinPath).toBeDefined();
      expect(ReactCheck.resolvePath).toBeDefined();
    });

    it('should export server modules', () => {
      expect(ReactCheck.WebSocketServer).toBeDefined();
      expect(ReactCheck.WebSocketClient).toBeDefined();
      expect(ReactCheck.ProxyServer).toBeDefined();
      expect(ReactCheck.BrowserLauncher).toBeDefined();
      expect(ReactCheck.isPuppeteerAvailable).toBeDefined();
    });

    it('should export browser modules', () => {
      expect(ReactCheck.BrowserScanner).toBeDefined();
      expect(ReactCheck.Overlay).toBeDefined();
      expect(ReactCheck.ReactCheckInjector).toBeDefined();
    });

    it('should export error types', () => {
      expect(ReactCheck.ReactCheckError).toBeDefined();
      expect(ReactCheck.ErrorCode).toBeDefined();
    });

    it('should export factory functions', () => {
      expect(ReactCheck.createScanner).toBeDefined();
      expect(ReactCheck.createReportGenerator).toBeDefined();
      expect(ReactCheck.quickScan).toBeDefined();
    });
  });

  describe('createScanner()', () => {
    it('should create scanner with default options', () => {
      const scanner = ReactCheck.createScanner();
      expect(scanner).toBeDefined();
      expect(typeof scanner.start).toBe('function');
      expect(typeof scanner.stop).toBe('function');
    });

    it('should create scanner with custom thresholds', () => {
      const scanner = ReactCheck.createScanner({
        thresholds: { critical: 100, warning: 50 },
      });
      expect(scanner).toBeDefined();
    });

    it('should create scanner with partial thresholds', () => {
      const scanner = ReactCheck.createScanner({
        thresholds: { critical: 75 },
      });
      expect(scanner).toBeDefined();
    });
  });

  describe('createReportGenerator()', () => {
    it('should create report generator with default options', () => {
      const generator = ReactCheck.createReportGenerator();
      const options = generator.getOptions();
      expect(options.enabled).toBe(true);
      expect(options.formats).toContain('html');
      expect(options.formats).toContain('json');
    });

    it('should create report generator with custom options', () => {
      const generator = ReactCheck.createReportGenerator({
        formats: ['md'],
        output: '/custom/path',
        includeSourceCode: true,
      });
      const options = generator.getOptions();
      expect(options.formats).toEqual(['md']);
      expect(options.output).toBe('/custom/path');
      expect(options.includeSourceCode).toBe(true);
    });
  });

  describe('utility functions', () => {
    it('formatDuration should format time correctly', () => {
      expect(ReactCheck.formatDuration(1000)).toContain('1');
      expect(ReactCheck.formatDuration(60000)).toContain('1');
    });

    it('formatBytes should format bytes correctly', () => {
      expect(ReactCheck.formatBytes(1024)).toBe('1 KB');
    });

    it('escapeHtml should escape HTML entities', () => {
      expect(ReactCheck.escapeHtml('<div>')).toBe('&lt;div&gt;');
    });
  });

  describe('classes', () => {
    it('StatsCollector should work correctly', () => {
      const collector = new ReactCheck.StatsCollector();
      collector.addRender({
        componentName: 'Test',
        renderCount: 1,
        renderTime: 5,
        phase: 'mount',
        necessary: true,
        timestamp: Date.now(),
      });
      expect(collector.getTotalRenders()).toBe(1);
    });

    it('ChainAnalyzer should work correctly', () => {
      const analyzer = new ReactCheck.ChainAnalyzer();
      analyzer.setParent('Child', 'Parent');
      const chain = analyzer.getComponentChain('Child');
      expect(chain).toContain('Parent');
    });

    it('FixSuggester should work correctly', () => {
      const suggester = new ReactCheck.FixSuggester();
      const suggestions = suggester.analyze({
        name: 'Test',
        renders: 100,
        expectedRenders: 5,
        avgRenderTime: 5,
        maxRenderTime: 10,
        minRenderTime: 1,
        totalRenderTime: 500,
        unnecessary: 90,
        severity: 'critical',
        chain: [],
        fixes: [],
        firstRender: Date.now(),
        lastRender: Date.now(),
        propsChanged: false,
        stateChanged: false,
      });
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('EventEmitter should work correctly', () => {
      const emitter = new ReactCheck.EventEmitter<{ test: string }>();
      let received = '';
      emitter.on('test', (data) => {
        received = data;
      });
      emitter.emit('test', 'hello');
      expect(received).toBe('hello');
    });

    it('Logger should work correctly', () => {
      const logger = new ReactCheck.Logger();
      expect(() => logger.info('test')).not.toThrow();
    });
  });
});
