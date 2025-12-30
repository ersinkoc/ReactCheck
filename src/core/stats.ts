/**
 * Statistics collector for component render data
 * @packageDocumentation
 */

import type {
  RenderInfo,
  ComponentStats,
  Severity,
  ThresholdOptions,
  SessionSummary,
} from '../types.js';
import { EventEmitter } from '../utils/event-emitter.js';

/**
 * Events emitted by StatsCollector
 */
export interface StatsEvents {
  /** Index signature for EventMap compatibility */
  [key: string]: unknown;
  /** Emitted when component stats are updated */
  update: ComponentStats;
  /** Emitted when severity changes */
  severityChange: { component: string; from: Severity | 'healthy'; to: Severity | 'healthy' };
  /** Emitted when a critical threshold is crossed */
  critical: ComponentStats;
  /** Emitted when a warning threshold is crossed */
  warning: ComponentStats;
}

/**
 * Default threshold values
 */
const DEFAULT_THRESHOLDS: ThresholdOptions = {
  critical: 50,
  warning: 20,
  fps: 30,
};

/**
 * Statistics collector that aggregates render data into meaningful stats
 */
export class StatsCollector extends EventEmitter<StatsEvents> {
  /** Map of component names to their statistics */
  private components: Map<string, ComponentStats> = new Map();

  /** Threshold configuration */
  private thresholds: ThresholdOptions;

  /** Session start time */
  private sessionStart: number;

  /** Total render count across all components */
  private totalRenders: number = 0;

  /** FPS samples for averaging */
  private fpsSamples: number[] = [];

  /** Maximum FPS samples to keep */
  private readonly maxFpsSamples: number = 100;

  /**
   * Create a new StatsCollector
   * @param thresholds - Threshold configuration
   */
  constructor(thresholds: Partial<ThresholdOptions> = {}) {
    super();
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.sessionStart = Date.now();
  }

  /**
   * Add a render event to the statistics
   * @param render - Render information
   */
  addRender(render: RenderInfo): void {
    const stats = this.getOrCreateStats(render.componentName);
    const previousSeverity = stats.severity;

    // Update basic stats
    stats.renders++;
    this.totalRenders++;

    // Update render times
    stats.totalRenderTime += render.renderTime;
    stats.avgRenderTime = stats.totalRenderTime / stats.renders;
    stats.maxRenderTime = Math.max(stats.maxRenderTime, render.renderTime);
    stats.minRenderTime = Math.min(stats.minRenderTime, render.renderTime);

    // Update unnecessary renders
    if (!render.necessary) {
      stats.unnecessary++;
    }

    // Update timestamps
    if (stats.firstRender === 0) {
      stats.firstRender = render.timestamp;
    }
    stats.lastRender = render.timestamp;

    // Update prop/state change tracking
    if (render.changedProps && render.changedProps.length > 0) {
      stats.propsChanged = true;
    }
    if (render.changedState && render.changedState.length > 0) {
      stats.stateChanged = true;
    }

    // Calculate expected renders (heuristic based on session duration)
    const sessionDuration = Date.now() - this.sessionStart;
    const sessionMinutes = sessionDuration / 60000;
    stats.expectedRenders = Math.max(1, Math.ceil(sessionMinutes * 5)); // ~5 renders per minute baseline

    // Update severity
    this.updateSeverity(stats);

    // Emit events
    this.emit('update', stats);

    if (stats.severity !== previousSeverity) {
      this.emit('severityChange', {
        component: stats.name,
        from: previousSeverity,
        to: stats.severity,
      });

      if (stats.severity === 'critical' && previousSeverity !== 'critical') {
        this.emit('critical', stats);
      } else if (stats.severity === 'warning' && previousSeverity === 'healthy') {
        this.emit('warning', stats);
      }
    }
  }

  /**
   * Record an FPS sample
   * @param fps - FPS value
   */
  addFpsSample(fps: number): void {
    this.fpsSamples.push(fps);
    if (this.fpsSamples.length > this.maxFpsSamples) {
      this.fpsSamples.shift();
    }
  }

  /**
   * Get or create stats for a component
   * @param name - Component name
   * @returns Component stats
   */
  private getOrCreateStats(name: string): ComponentStats {
    let stats = this.components.get(name);
    if (!stats) {
      stats = this.createEmptyStats(name);
      this.components.set(name, stats);
    }
    return stats;
  }

  /**
   * Create empty stats for a component
   * @param name - Component name
   * @returns Empty component stats
   */
  private createEmptyStats(name: string): ComponentStats {
    return {
      name,
      renders: 0,
      expectedRenders: 1,
      avgRenderTime: 0,
      maxRenderTime: 0,
      minRenderTime: Infinity,
      totalRenderTime: 0,
      unnecessary: 0,
      severity: 'healthy',
      chain: [],
      fixes: [],
      firstRender: 0,
      lastRender: 0,
      propsChanged: false,
      stateChanged: false,
    };
  }

  /**
   * Update severity for a component based on thresholds
   * @param stats - Component stats to update
   */
  private updateSeverity(stats: ComponentStats): void {
    if (stats.renders >= this.thresholds.critical) {
      stats.severity = 'critical';
    } else if (stats.renders >= this.thresholds.warning) {
      stats.severity = 'warning';
    } else {
      stats.severity = 'healthy';
    }
  }

  /**
   * Get stats for a specific component
   * @param name - Component name
   * @returns Component stats or undefined
   */
  getComponentStats(name: string): ComponentStats | undefined {
    return this.components.get(name);
  }

  /**
   * Get all component stats
   * @returns Array of component stats
   */
  getAllStats(): ComponentStats[] {
    return Array.from(this.components.values());
  }

  /**
   * Get a snapshot of all stats sorted by severity/render count
   * @returns Sorted array of component stats
   */
  getSnapshot(): ComponentStats[] {
    return this.getAllStats().sort((a, b) => {
      // Sort by severity first (critical > warning > healthy)
      const severityOrder: Record<Severity | 'healthy', number> = {
        critical: 0,
        warning: 1,
        info: 2,
        healthy: 3,
      };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Then by render count (descending)
      return b.renders - a.renders;
    });
  }

  /**
   * Get components by severity
   * @param severity - Severity level to filter
   * @returns Array of matching component stats
   */
  getComponentsBySeverity(severity: Severity | 'healthy'): ComponentStats[] {
    return this.getAllStats().filter((s) => s.severity === severity);
  }

  /**
   * Get session summary
   * @returns Session summary statistics
   */
  getSummary(): SessionSummary {
    const stats = this.getAllStats();
    const criticalCount = stats.filter((s) => s.severity === 'critical').length;
    const warningCount = stats.filter((s) => s.severity === 'warning').length;
    const healthyCount = stats.filter((s) => s.severity === 'healthy').length;
    const unnecessaryCount = stats.reduce((sum, s) => sum + s.unnecessary, 0);

    // Calculate FPS stats
    let avgFps = 60;
    let minFps = 60;
    if (this.fpsSamples.length > 0) {
      avgFps = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
      minFps = Math.min(...this.fpsSamples);
    }

    return {
      totalComponents: stats.length,
      totalRenders: this.totalRenders,
      criticalIssues: criticalCount,
      warnings: warningCount,
      healthy: healthyCount,
      avgFps: Math.round(avgFps),
      minFps: Math.round(minFps),
      unnecessaryRenders: unnecessaryCount,
    };
  }

  /**
   * Get the most problematic components
   * @param limit - Maximum number to return
   * @returns Top problematic components
   */
  getTopProblems(limit: number = 10): ComponentStats[] {
    return this.getSnapshot()
      .filter((s) => s.severity !== 'healthy')
      .slice(0, limit);
  }

  /**
   * Update chain information for a component
   * @param componentName - Component name
   * @param chain - Render chain
   */
  setComponentChain(componentName: string, chain: string[]): void {
    const stats = this.components.get(componentName);
    if (stats) {
      stats.chain = chain;
    }
  }

  /**
   * Update parent information for a component
   * @param componentName - Component name
   * @param parentName - Parent component name
   */
  setComponentParent(componentName: string, parentName: string): void {
    const stats = this.components.get(componentName);
    if (stats) {
      stats.parent = parentName;
    }
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.components.clear();
    this.totalRenders = 0;
    this.fpsSamples = [];
    this.sessionStart = Date.now();
  }

  /**
   * Update threshold configuration
   * @param thresholds - New thresholds
   */
  setThresholds(thresholds: Partial<ThresholdOptions>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };

    // Re-evaluate all severities
    for (const stats of this.components.values()) {
      const previousSeverity = stats.severity;
      this.updateSeverity(stats);
      if (stats.severity !== previousSeverity) {
        this.emit('severityChange', {
          component: stats.name,
          from: previousSeverity,
          to: stats.severity,
        });
      }
    }
  }

  /**
   * Get current thresholds
   * @returns Current threshold configuration
   */
  getThresholds(): ThresholdOptions {
    return { ...this.thresholds };
  }

  /**
   * Get session duration in milliseconds
   * @returns Session duration
   */
  getSessionDuration(): number {
    return Date.now() - this.sessionStart;
  }

  /**
   * Get total render count
   * @returns Total renders across all components
   */
  getTotalRenders(): number {
    return this.totalRenders;
  }

  /**
   * Get component count
   * @returns Number of tracked components
   */
  getComponentCount(): number {
    return this.components.size;
  }

  /**
   * Check if FPS is below threshold
   * @returns true if average FPS is below threshold
   */
  isFpsBelowThreshold(): boolean {
    if (this.fpsSamples.length === 0) return false;
    const avgFps = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
    return avgFps < this.thresholds.fps;
  }

  /**
   * Export stats for serialization
   * @returns Serializable stats object
   */
  export(): {
    components: ComponentStats[];
    summary: SessionSummary;
    thresholds: ThresholdOptions;
    sessionDuration: number;
  } {
    return {
      components: this.getSnapshot(),
      summary: this.getSummary(),
      thresholds: this.getThresholds(),
      sessionDuration: this.getSessionDuration(),
    };
  }
}
