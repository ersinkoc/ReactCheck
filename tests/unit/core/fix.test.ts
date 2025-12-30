/**
 * Tests for FixSuggester
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FixSuggester } from '../../../src/core/fix.js';
import type { ComponentStats, Severity } from '../../../src/types.js';

describe('FixSuggester', () => {
  let suggester: FixSuggester;

  beforeEach(() => {
    suggester = new FixSuggester();
  });

  const createStats = (overrides: Partial<ComponentStats> = {}): ComponentStats => ({
    name: 'TestComponent',
    renders: 10,
    expectedRenders: 5,
    avgRenderTime: 5,
    maxRenderTime: 10,
    minRenderTime: 1,
    totalRenderTime: 50,
    unnecessary: 5,
    severity: 'warning',
    chain: [],
    fixes: [],
    firstRender: Date.now() - 10000,
    lastRender: Date.now(),
    propsChanged: false,
    stateChanged: false,
    ...overrides,
  });

  describe('constructor', () => {
    it('should create with default rules', () => {
      const ids = suggester.getRuleIds();
      expect(ids.length).toBeGreaterThan(0);
    });

    it('should accept custom rule configuration', () => {
      const customSuggester = new FixSuggester({
        rules: {
          'unnecessary-rerenders-memo': 'off',
        },
      });

      const stats = createStats({ renders: 15, unnecessary: 10 });
      const suggestions = customSuggester.analyze(stats);

      // The memo rule should be disabled
      const memoSuggestions = suggestions.filter((s) => s.fix === 'React.memo');
      expect(memoSuggestions.length).toBe(0);
    });
  });

  describe('analyze()', () => {
    it('should return empty array for healthy component', () => {
      const stats = createStats({
        renders: 2,
        unnecessary: 0,
        avgRenderTime: 2,
        severity: 'healthy',
      });
      const suggestions = suggester.analyze(stats);
      expect(suggestions).toEqual([]);
    });

    it('should suggest React.memo for unnecessary re-renders', () => {
      const stats = createStats({
        renders: 20,
        unnecessary: 15, // 75% unnecessary
        propsChanged: false,
        severity: 'warning',
      });
      const suggestions = suggester.analyze(stats);
      const memoSuggestion = suggestions.find((s) => s.fix === 'React.memo');
      expect(memoSuggestion).toBeDefined();
      expect(memoSuggestion?.componentName).toBe('TestComponent');
    });

    it('should suggest useMemo for expensive computations', () => {
      const stats = createStats({
        renders: 10,
        avgRenderTime: 50, // Slow renders
        severity: 'warning',
      });
      const suggestions = suggester.analyze(stats);
      const memoSuggestion = suggestions.find((s) => s.fix === 'useMemo');
      expect(memoSuggestion).toBeDefined();
      expect(memoSuggestion?.severity).toBe('warning');
    });

    it('should suggest useCallback for unstable function props', () => {
      const stats = createStats({
        renders: 20,
        propsChanged: true,
        severity: 'warning',
      });
      const suggestions = suggester.analyze(stats);
      const callbackSuggestion = suggestions.find((s) => s.fix === 'useCallback');
      expect(callbackSuggestion).toBeDefined();
    });

    it('should suggest context-split for context over-subscription', () => {
      const stats = createStats({
        renders: 30,
        unnecessary: 25, // >70% unnecessary
        propsChanged: false,
        stateChanged: false,
        severity: 'warning',
      });
      const suggestions = suggester.analyze(stats);
      const contextSuggestion = suggestions.find((s) => s.fix === 'context-split');
      expect(contextSuggestion).toBeDefined();
    });

    it('should suggest state-colocation for high chain depth', () => {
      const stats = createStats({
        renders: 40,
        stateChanged: true,
        chain: ['A', 'B', 'C', 'D'],
        severity: 'warning',
      });
      const suggestions = suggester.analyze(stats);
      const colocationSuggestion = suggestions.find((s) => s.fix === 'state-colocation');
      expect(colocationSuggestion).toBeDefined();
    });

    it('should suggest component-extraction for high render count', () => {
      const stats = createStats({
        renders: 60,
        avgRenderTime: 10,
        severity: 'critical',
      });
      const suggestions = suggester.analyze(stats);
      const extractSuggestion = suggestions.find((s) => s.fix === 'component-extraction');
      expect(extractSuggestion).toBeDefined();
    });

    it('should emit suggestion event', () => {
      const listener = vi.fn();
      suggester.on('suggestion', listener);

      const stats = createStats({
        renders: 20,
        unnecessary: 15,
        propsChanged: false,
      });
      suggester.analyze(stats);

      expect(listener).toHaveBeenCalled();
    });

    it('should sort suggestions by severity and priority', () => {
      const stats = createStats({
        renders: 60,
        unnecessary: 50,
        avgRenderTime: 50,
        propsChanged: true,
        stateChanged: false,
        chain: ['A', 'B', 'C'],
      });
      const suggestions = suggester.analyze(stats);

      // Critical should come before warning
      if (suggestions.length >= 2) {
        const criticals = suggestions.filter((s) => s.severity === 'critical');
        const warnings = suggestions.filter((s) => s.severity === 'warning');
        if (criticals.length > 0 && warnings.length > 0) {
          const firstCriticalIdx = suggestions.findIndex((s) => s.severity === 'critical');
          const firstWarningIdx = suggestions.findIndex((s) => s.severity === 'warning');
          expect(firstCriticalIdx).toBeLessThan(
            firstWarningIdx === -1 ? Infinity : firstWarningIdx
          );
        }
      }
    });

    it('should include parent info in suggestion', () => {
      const stats = createStats({
        renders: 20,
        unnecessary: 15,
        propsChanged: false,
        parent: 'ParentComponent',
      });
      const suggestions = suggester.analyze(stats);
      const memoSuggestion = suggestions.find((s) => s.fix === 'React.memo');

      if (memoSuggestion) {
        expect(memoSuggestion.cause).toContain('ParentComponent');
      }
    });

    it('should include code examples in suggestions', () => {
      const stats = createStats({
        renders: 20,
        unnecessary: 15,
        propsChanged: false,
      });
      const suggestions = suggester.analyze(stats);

      for (const suggestion of suggestions) {
        expect(suggestion.codeBefore).toBeDefined();
        expect(suggestion.codeAfter).toBeDefined();
        expect(suggestion.explanation).toBeDefined();
      }
    });

    it('should cache suggestions', () => {
      const stats = createStats({ renders: 20, unnecessary: 15 });
      suggester.analyze(stats);

      const cached = suggester.getSuggestions('TestComponent');
      expect(cached.length).toBeGreaterThan(0);
    });
  });

  describe('getSuggestions()', () => {
    it('should return empty array for unknown component', () => {
      expect(suggester.getSuggestions('Unknown')).toEqual([]);
    });

    it('should return cached suggestions', () => {
      const stats = createStats({ renders: 20, unnecessary: 15 });
      const original = suggester.analyze(stats);

      const cached = suggester.getSuggestions('TestComponent');
      expect(cached).toEqual(original);
    });
  });

  describe('getAllSuggestions()', () => {
    it('should return empty array initially', () => {
      expect(suggester.getAllSuggestions()).toEqual([]);
    });

    it('should return all cached suggestions', () => {
      suggester.analyze(createStats({ name: 'A', renders: 20, unnecessary: 15 }));
      suggester.analyze(createStats({ name: 'B', renders: 30, unnecessary: 25 }));

      const all = suggester.getAllSuggestions();
      expect(all.length).toBeGreaterThan(0);
    });
  });

  describe('getSuggestionsBySeverity()', () => {
    it('should filter by severity', () => {
      suggester.analyze(createStats({ renders: 20, avgRenderTime: 50 })); // Critical

      const criticals = suggester.getSuggestionsBySeverity('critical');
      expect(criticals.every((s) => s.severity === 'critical')).toBe(true);
    });
  });

  describe('getSuggestionsByType()', () => {
    it('should filter by fix type', () => {
      suggester.analyze(createStats({ renders: 20, unnecessary: 15 }));

      const memos = suggester.getSuggestionsByType('React.memo');
      expect(memos.every((s) => s.fix === 'React.memo')).toBe(true);
    });
  });

  describe('clearSuggestions()', () => {
    it('should clear specific component suggestions', () => {
      suggester.analyze(createStats({ name: 'A', renders: 20, unnecessary: 15 }));
      suggester.analyze(createStats({ name: 'B', renders: 30, unnecessary: 25 }));

      suggester.clearSuggestions('A');

      expect(suggester.getSuggestions('A')).toEqual([]);
      expect(suggester.getSuggestions('B').length).toBeGreaterThan(0);
    });

    it('should clear all suggestions when no component specified', () => {
      suggester.analyze(createStats({ name: 'A', renders: 20, unnecessary: 15 }));
      suggester.analyze(createStats({ name: 'B', renders: 30, unnecessary: 25 }));

      suggester.clearSuggestions();

      expect(suggester.getAllSuggestions()).toEqual([]);
    });
  });

  describe('configureRule()', () => {
    it('should disable rule with off setting', () => {
      suggester.configureRule('unnecessary-rerenders-memo', 'off');

      const stats = createStats({ renders: 20, unnecessary: 15 });
      const suggestions = suggester.analyze(stats);

      const memoSuggestions = suggestions.filter((s) => s.fix === 'React.memo');
      expect(memoSuggestions.length).toBe(0);
    });

    it('should set severity to warning with warn setting', () => {
      suggester.configureRule('expensive-computation-memo', 'warn');

      const stats = createStats({
        renders: 10,
        avgRenderTime: 100, // Would normally be critical
      });
      const suggestions = suggester.analyze(stats);

      const useMemoSuggestion = suggestions.find((s) => s.fix === 'useMemo');
      expect(useMemoSuggestion?.severity).toBe('warning');
    });

    it('should set severity to critical with error setting', () => {
      suggester.configureRule('unnecessary-rerenders-memo', 'error');

      const stats = createStats({
        renders: 20,
        unnecessary: 15,
        severity: 'healthy' as Severity | 'healthy',
      });
      const suggestions = suggester.analyze(stats);

      const memoSuggestion = suggestions.find((s) => s.fix === 'React.memo');
      expect(memoSuggestion?.severity).toBe('critical');
    });
  });

  describe('getRuleIds()', () => {
    it('should return all rule IDs', () => {
      const ids = suggester.getRuleIds();
      expect(ids).toContain('unnecessary-rerenders-memo');
      expect(ids).toContain('expensive-computation-memo');
      expect(ids).toContain('function-prop-stability');
      expect(ids).toContain('context-over-subscription');
      expect(ids).toContain('state-too-high');
      expect(ids).toContain('extract-heavy-child');
    });
  });

  describe('getRule()', () => {
    it('should return rule info for valid ID', () => {
      const rule = suggester.getRule('unnecessary-rerenders-memo');
      expect(rule).toBeDefined();
      expect(rule?.name).toBe('Unnecessary Re-renders (memo)');
      expect(rule?.fixType).toBe('React.memo');
    });

    it('should return undefined for invalid ID', () => {
      expect(suggester.getRule('invalid-rule')).toBeUndefined();
    });
  });

  describe('rule detection logic', () => {
    describe('React.memo rule', () => {
      it('should detect when unnecessary ratio >= 50% and renders >= 10', () => {
        const stats = createStats({
          renders: 10,
          unnecessary: 5,
          propsChanged: false,
        });
        const suggestions = suggester.analyze(stats);
        expect(suggestions.some((s) => s.fix === 'React.memo')).toBe(true);
      });

      it('should not detect when props changed', () => {
        const stats = createStats({
          renders: 10,
          unnecessary: 5,
          propsChanged: true,
        });
        const suggestions = suggester.analyze(stats);
        const memoSuggestion = suggestions.find((s) => s.fix === 'React.memo');
        // Should not suggest memo when props actually changed
        // (because memo wouldn't help if props are changing)
        expect(memoSuggestion).toBeUndefined();
      });

      it('should not detect when render count too low', () => {
        const stats = createStats({
          renders: 5,
          unnecessary: 4,
          propsChanged: false,
        });
        const suggestions = suggester.analyze(stats);
        expect(suggestions.some((s) => s.fix === 'React.memo')).toBe(false);
      });
    });

    describe('useMemo rule', () => {
      it('should detect when avgRenderTime > 16ms', () => {
        const stats = createStats({
          renders: 10,
          avgRenderTime: 20,
        });
        const suggestions = suggester.analyze(stats);
        expect(suggestions.some((s) => s.fix === 'useMemo')).toBe(true);
      });

      it('should set critical severity when avgRenderTime > 50ms', () => {
        const stats = createStats({
          renders: 10,
          avgRenderTime: 60,
        });
        const suggestions = suggester.analyze(stats);
        const memoSuggestion = suggestions.find((s) => s.fix === 'useMemo');
        expect(memoSuggestion?.severity).toBe('critical');
      });
    });

    describe('context-split rule', () => {
      it('should detect context over-subscription pattern', () => {
        const stats = createStats({
          renders: 25,
          unnecessary: 20, // 80% unnecessary
          propsChanged: false,
          stateChanged: false,
        });
        const suggestions = suggester.analyze(stats);
        expect(suggestions.some((s) => s.fix === 'context-split')).toBe(true);
      });

      it('should not detect when state changed', () => {
        const stats = createStats({
          renders: 25,
          unnecessary: 20,
          propsChanged: false,
          stateChanged: true,
        });
        const suggestions = suggester.analyze(stats);
        expect(suggestions.some((s) => s.fix === 'context-split')).toBe(false);
      });
    });
  });

  describe('suggestion content', () => {
    it('should include impact estimate', () => {
      const stats = createStats({
        renders: 20,
        unnecessary: 15,
        propsChanged: false,
      });
      const suggestions = suggester.analyze(stats);
      const memoSuggestion = suggestions.find((s) => s.fix === 'React.memo');
      expect(memoSuggestion?.impact).toContain('15');
    });

    it('should include proper code examples', () => {
      const stats = createStats({
        name: 'Button',
        renders: 20,
        unnecessary: 15,
        propsChanged: false,
      });
      const suggestions = suggester.analyze(stats);
      const memoSuggestion = suggestions.find((s) => s.fix === 'React.memo');

      expect(memoSuggestion?.codeBefore).toContain('Button');
      expect(memoSuggestion?.codeAfter).toContain('memo');
      expect(memoSuggestion?.codeAfter).toContain('Button');
    });
  });

  describe('component extraction suggestion', () => {
    it('should suggest class component extraction for class-like names', () => {
      const stats = createStats({
        name: 'ClassComponent',
        renders: 60,
        avgRenderTime: 10,
        severity: 'critical',
      });
      const suggestions = suggester.analyze(stats);
      const extractSuggestion = suggestions.find((s) => s.fix === 'component-extraction');

      if (extractSuggestion) {
        // Should include component name in the code
        expect(extractSuggestion.codeBefore).toContain('ClassComponent');
        expect(extractSuggestion.codeAfter).toBeDefined();
      }
    });

    it('should handle high render count with state colocation', () => {
      const stats = createStats({
        name: 'HighRenderComponent',
        renders: 100,
        stateChanged: true,
        chain: ['Parent', 'Child', 'GrandChild', 'GreatGrandChild'],
        severity: 'critical',
      });
      const suggestions = suggester.analyze(stats);
      const colocationSuggestion = suggestions.find((s) => s.fix === 'state-colocation');

      expect(colocationSuggestion).toBeDefined();
      if (colocationSuggestion) {
        // Cause should be a string describing why colocation is suggested
        expect(colocationSuggestion.cause).toBeDefined();
        expect(typeof colocationSuggestion.cause).toBe('string');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle component with zero unnecessary renders', () => {
      const stats = createStats({
        renders: 20,
        unnecessary: 0,
        avgRenderTime: 5,
        severity: 'healthy',
      });
      const suggestions = suggester.analyze(stats);
      // May still have suggestions based on other metrics
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should handle component with very high render time', () => {
      const stats = createStats({
        renders: 5,
        avgRenderTime: 200, // Very slow
        severity: 'critical',
      });
      const suggestions = suggester.analyze(stats);
      const memoSuggestion = suggestions.find((s) => s.fix === 'useMemo');
      expect(memoSuggestion?.severity).toBe('critical');
    });

    it('should handle empty chain array', () => {
      const stats = createStats({
        renders: 40,
        stateChanged: true,
        chain: [],
        severity: 'warning',
      });
      const suggestions = suggester.analyze(stats);
      // Should not suggest state-colocation with empty chain
      const colocationSuggestion = suggestions.find((s) => s.fix === 'state-colocation');
      expect(colocationSuggestion).toBeUndefined();
    });

    it('should handle info severity stats', () => {
      const stats = createStats({
        renders: 10,
        unnecessary: 2,
        avgRenderTime: 3,
        severity: 'info' as Severity,
      });
      const suggestions = suggester.analyze(stats);
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });
});
