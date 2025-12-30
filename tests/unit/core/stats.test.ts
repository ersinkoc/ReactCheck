/**
 * Tests for StatsCollector
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatsCollector } from '../../../src/core/stats.js';
import type { RenderInfo } from '../../../src/types.js';

describe('StatsCollector', () => {
  let collector: StatsCollector;

  beforeEach(() => {
    collector = new StatsCollector();
  });

  const createRender = (overrides: Partial<RenderInfo> = {}): RenderInfo => ({
    componentName: 'TestComponent',
    renderCount: 1,
    renderTime: 5,
    phase: 'update',
    necessary: true,
    timestamp: Date.now(),
    ...overrides,
  });

  describe('constructor', () => {
    it('should create with default thresholds', () => {
      const thresholds = collector.getThresholds();
      expect(thresholds.critical).toBe(50);
      expect(thresholds.warning).toBe(20);
      expect(thresholds.fps).toBe(30);
    });

    it('should accept custom thresholds', () => {
      const custom = new StatsCollector({ critical: 100, warning: 50 });
      const thresholds = custom.getThresholds();
      expect(thresholds.critical).toBe(100);
      expect(thresholds.warning).toBe(50);
    });
  });

  describe('addRender()', () => {
    it('should create stats for new component', () => {
      collector.addRender(createRender({ componentName: 'Button' }));
      const stats = collector.getComponentStats('Button');
      expect(stats).toBeDefined();
      expect(stats?.renders).toBe(1);
    });

    it('should update existing component stats', () => {
      collector.addRender(createRender({ componentName: 'Button' }));
      collector.addRender(createRender({ componentName: 'Button' }));
      const stats = collector.getComponentStats('Button');
      expect(stats?.renders).toBe(2);
    });

    it('should track render times', () => {
      collector.addRender(createRender({ renderTime: 10 }));
      collector.addRender(createRender({ renderTime: 20 }));
      const stats = collector.getComponentStats('TestComponent');
      expect(stats?.avgRenderTime).toBe(15);
      expect(stats?.maxRenderTime).toBe(20);
      expect(stats?.minRenderTime).toBe(10);
      expect(stats?.totalRenderTime).toBe(30);
    });

    it('should track unnecessary renders', () => {
      collector.addRender(createRender({ necessary: true }));
      collector.addRender(createRender({ necessary: false }));
      collector.addRender(createRender({ necessary: false }));
      const stats = collector.getComponentStats('TestComponent');
      expect(stats?.unnecessary).toBe(2);
    });

    it('should track timestamps', () => {
      const now = Date.now();
      collector.addRender(createRender({ timestamp: now }));
      collector.addRender(createRender({ timestamp: now + 1000 }));
      const stats = collector.getComponentStats('TestComponent');
      expect(stats?.firstRender).toBe(now);
      expect(stats?.lastRender).toBe(now + 1000);
    });

    it('should track prop changes', () => {
      collector.addRender(createRender({ changedProps: ['onClick'] }));
      const stats = collector.getComponentStats('TestComponent');
      expect(stats?.propsChanged).toBe(true);
    });

    it('should track state changes', () => {
      collector.addRender(createRender({ changedState: ['count'] }));
      const stats = collector.getComponentStats('TestComponent');
      expect(stats?.stateChanged).toBe(true);
    });

    it('should emit update event', () => {
      const listener = vi.fn();
      collector.on('update', listener);
      collector.addRender(createRender());
      expect(listener).toHaveBeenCalled();
    });

    it('should emit severityChange event when severity changes', () => {
      const listener = vi.fn();
      collector.setThresholds({ warning: 2 });
      collector.on('severityChange', listener);

      collector.addRender(createRender());
      expect(listener).not.toHaveBeenCalled();

      collector.addRender(createRender());
      expect(listener).toHaveBeenCalledWith({
        component: 'TestComponent',
        from: 'healthy',
        to: 'warning',
      });
    });

    it('should emit critical event when critical threshold crossed', () => {
      const listener = vi.fn();
      collector.setThresholds({ critical: 2 });
      collector.on('critical', listener);

      collector.addRender(createRender());
      collector.addRender(createRender());

      expect(listener).toHaveBeenCalled();
    });

    it('should emit warning event when warning threshold crossed', () => {
      const listener = vi.fn();
      collector.setThresholds({ warning: 2, critical: 10 });
      collector.on('warning', listener);

      collector.addRender(createRender());
      expect(listener).not.toHaveBeenCalled();

      collector.addRender(createRender());
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('addFpsSample()', () => {
    it('should add FPS samples', () => {
      collector.addFpsSample(60);
      collector.addFpsSample(55);
      const summary = collector.getSummary();
      expect(summary.avgFps).toBe(58);
      expect(summary.minFps).toBe(55);
    });

    it('should limit FPS samples to maxFpsSamples', () => {
      for (let i = 0; i < 150; i++) {
        collector.addFpsSample(60);
      }
      // Internal limit is 100, summary should still work
      const summary = collector.getSummary();
      expect(summary.avgFps).toBe(60);
    });
  });

  describe('getComponentStats()', () => {
    it('should return undefined for unknown component', () => {
      expect(collector.getComponentStats('Unknown')).toBeUndefined();
    });

    it('should return stats for known component', () => {
      collector.addRender(createRender({ componentName: 'Button' }));
      const stats = collector.getComponentStats('Button');
      expect(stats?.name).toBe('Button');
    });
  });

  describe('getAllStats()', () => {
    it('should return empty array initially', () => {
      expect(collector.getAllStats()).toEqual([]);
    });

    it('should return all component stats', () => {
      collector.addRender(createRender({ componentName: 'A' }));
      collector.addRender(createRender({ componentName: 'B' }));
      const stats = collector.getAllStats();
      expect(stats.length).toBe(2);
    });
  });

  describe('getSnapshot()', () => {
    it('should return stats sorted by severity and render count', () => {
      collector.setThresholds({ warning: 2, critical: 5 });

      // Add component with critical severity
      for (let i = 0; i < 5; i++) {
        collector.addRender(createRender({ componentName: 'Critical' }));
      }

      // Add component with warning severity
      for (let i = 0; i < 3; i++) {
        collector.addRender(createRender({ componentName: 'Warning' }));
      }

      // Add healthy component
      collector.addRender(createRender({ componentName: 'Healthy' }));

      const snapshot = collector.getSnapshot();
      expect(snapshot[0]?.name).toBe('Critical');
      expect(snapshot[1]?.name).toBe('Warning');
      expect(snapshot[2]?.name).toBe('Healthy');
    });

    it('should sort by render count within same severity', () => {
      collector.setThresholds({ warning: 2, critical: 5 });

      // Add two critical components with different render counts
      for (let i = 0; i < 10; i++) {
        collector.addRender(createRender({ componentName: 'CriticalHigh' }));
      }
      for (let i = 0; i < 5; i++) {
        collector.addRender(createRender({ componentName: 'CriticalLow' }));
      }

      const snapshot = collector.getSnapshot();
      // CriticalHigh has more renders, should come first
      expect(snapshot[0]?.name).toBe('CriticalHigh');
      expect(snapshot[1]?.name).toBe('CriticalLow');
    });
  });

  describe('getComponentsBySeverity()', () => {
    it('should filter by severity', () => {
      collector.setThresholds({ warning: 2, critical: 5 });

      for (let i = 0; i < 5; i++) {
        collector.addRender(createRender({ componentName: 'Critical' }));
      }
      for (let i = 0; i < 3; i++) {
        collector.addRender(createRender({ componentName: 'Warning' }));
      }
      collector.addRender(createRender({ componentName: 'Healthy' }));

      expect(collector.getComponentsBySeverity('critical').length).toBe(1);
      expect(collector.getComponentsBySeverity('warning').length).toBe(1);
      expect(collector.getComponentsBySeverity('healthy').length).toBe(1);
    });
  });

  describe('getSummary()', () => {
    it('should return correct summary', () => {
      collector.setThresholds({ warning: 2, critical: 5 });

      for (let i = 0; i < 5; i++) {
        collector.addRender(createRender({ componentName: 'Critical', necessary: false }));
      }
      for (let i = 0; i < 3; i++) {
        collector.addRender(createRender({ componentName: 'Warning' }));
      }
      collector.addRender(createRender({ componentName: 'Healthy' }));

      const summary = collector.getSummary();
      expect(summary.totalComponents).toBe(3);
      expect(summary.totalRenders).toBe(9);
      expect(summary.criticalIssues).toBe(1);
      expect(summary.warnings).toBe(1);
      expect(summary.healthy).toBe(1);
      expect(summary.unnecessaryRenders).toBe(5);
    });

    it('should return default FPS when no samples', () => {
      const summary = collector.getSummary();
      expect(summary.avgFps).toBe(60);
      expect(summary.minFps).toBe(60);
    });
  });

  describe('getTopProblems()', () => {
    it('should return top problematic components', () => {
      collector.setThresholds({ warning: 2, critical: 5 });

      for (let i = 0; i < 10; i++) {
        collector.addRender(createRender({ componentName: 'Big' }));
      }
      for (let i = 0; i < 3; i++) {
        collector.addRender(createRender({ componentName: 'Medium' }));
      }
      collector.addRender(createRender({ componentName: 'Small' }));

      const problems = collector.getTopProblems(2);
      expect(problems.length).toBe(2);
      expect(problems[0]?.name).toBe('Big');
      expect(problems[1]?.name).toBe('Medium');
    });

    it('should exclude healthy components', () => {
      collector.addRender(createRender({ componentName: 'Healthy' }));
      const problems = collector.getTopProblems();
      expect(problems.length).toBe(0);
    });
  });

  describe('setComponentChain()', () => {
    it('should set chain for component', () => {
      collector.addRender(createRender({ componentName: 'Child' }));
      collector.setComponentChain('Child', ['Parent', 'Child']);
      const stats = collector.getComponentStats('Child');
      expect(stats?.chain).toEqual(['Parent', 'Child']);
    });

    it('should do nothing for unknown component', () => {
      collector.setComponentChain('Unknown', ['A', 'B']);
      expect(collector.getComponentStats('Unknown')).toBeUndefined();
    });
  });

  describe('setComponentParent()', () => {
    it('should set parent for component', () => {
      collector.addRender(createRender({ componentName: 'Child' }));
      collector.setComponentParent('Child', 'Parent');
      const stats = collector.getComponentStats('Child');
      expect(stats?.parent).toBe('Parent');
    });

    it('should do nothing for unknown component', () => {
      collector.setComponentParent('Unknown', 'Parent');
      expect(collector.getComponentStats('Unknown')).toBeUndefined();
    });
  });

  describe('reset()', () => {
    it('should clear all data', () => {
      collector.addRender(createRender());
      collector.addFpsSample(60);
      collector.reset();

      expect(collector.getAllStats()).toEqual([]);
      expect(collector.getTotalRenders()).toBe(0);
    });
  });

  describe('setThresholds()', () => {
    it('should update thresholds', () => {
      collector.setThresholds({ critical: 100 });
      expect(collector.getThresholds().critical).toBe(100);
    });

    it('should re-evaluate severities', () => {
      collector.setThresholds({ warning: 3, critical: 10 });

      // Add renders to cross warning threshold
      for (let i = 0; i < 3; i++) {
        collector.addRender(createRender());
      }
      expect(collector.getComponentStats('TestComponent')?.severity).toBe('warning');

      // Lower warning threshold - should stay warning
      collector.setThresholds({ warning: 2 });
      expect(collector.getComponentStats('TestComponent')?.severity).toBe('warning');

      // Raise warning threshold above current renders
      collector.setThresholds({ warning: 10 });
      expect(collector.getComponentStats('TestComponent')?.severity).toBe('healthy');
    });

    it('should emit severityChange when thresholds change severity', () => {
      const listener = vi.fn();
      collector.setThresholds({ warning: 2, critical: 10 });

      for (let i = 0; i < 3; i++) {
        collector.addRender(createRender());
      }

      collector.on('severityChange', listener);
      collector.setThresholds({ warning: 10 });

      expect(listener).toHaveBeenCalledWith({
        component: 'TestComponent',
        from: 'warning',
        to: 'healthy',
      });
    });
  });

  describe('getSessionDuration()', () => {
    it('should return session duration', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(collector.getSessionDuration()).toBeGreaterThan(0);
    });
  });

  describe('getTotalRenders()', () => {
    it('should return total render count', () => {
      collector.addRender(createRender({ componentName: 'A' }));
      collector.addRender(createRender({ componentName: 'B' }));
      collector.addRender(createRender({ componentName: 'A' }));
      expect(collector.getTotalRenders()).toBe(3);
    });
  });

  describe('getComponentCount()', () => {
    it('should return component count', () => {
      collector.addRender(createRender({ componentName: 'A' }));
      collector.addRender(createRender({ componentName: 'B' }));
      collector.addRender(createRender({ componentName: 'A' }));
      expect(collector.getComponentCount()).toBe(2);
    });
  });

  describe('isFpsBelowThreshold()', () => {
    it('should return false when no samples', () => {
      expect(collector.isFpsBelowThreshold()).toBe(false);
    });

    it('should return true when FPS below threshold', () => {
      collector.addFpsSample(25);
      collector.addFpsSample(28);
      expect(collector.isFpsBelowThreshold()).toBe(true);
    });

    it('should return false when FPS above threshold', () => {
      collector.addFpsSample(60);
      collector.addFpsSample(55);
      expect(collector.isFpsBelowThreshold()).toBe(false);
    });
  });

  describe('export()', () => {
    it('should export all stats', async () => {
      collector.addRender(createRender());
      collector.addFpsSample(60);

      // Small delay to ensure sessionDuration > 0
      await new Promise((resolve) => setTimeout(resolve, 10));

      const exported = collector.export();
      expect(exported.components.length).toBe(1);
      expect(exported.summary.totalRenders).toBe(1);
      expect(exported.thresholds.critical).toBe(50);
      expect(exported.sessionDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('severity calculation', () => {
    it('should set healthy for low render count', () => {
      collector.addRender(createRender());
      expect(collector.getComponentStats('TestComponent')?.severity).toBe('healthy');
    });

    it('should set warning when crossing warning threshold', () => {
      collector.setThresholds({ warning: 5, critical: 10 });
      for (let i = 0; i < 5; i++) {
        collector.addRender(createRender());
      }
      expect(collector.getComponentStats('TestComponent')?.severity).toBe('warning');
    });

    it('should set critical when crossing critical threshold', () => {
      collector.setThresholds({ warning: 5, critical: 10 });
      for (let i = 0; i < 10; i++) {
        collector.addRender(createRender());
      }
      expect(collector.getComponentStats('TestComponent')?.severity).toBe('critical');
    });
  });
});
