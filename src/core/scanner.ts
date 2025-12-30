/**
 * Core scanner implementation for tracking React renders
 * @packageDocumentation
 */

import type {
  RenderInfo,
  RenderChainInfo,
  ThresholdOptions,
  ScannerConfig,
  ComponentStats,
  FixSuggestion,
} from '../types.js';
import { EventEmitter } from '../utils/event-emitter.js';
import { StatsCollector } from './stats.js';
import { ChainAnalyzer } from './chain.js';
import { FixSuggester } from './fix.js';

/**
 * Events emitted by Scanner
 */
export interface ScannerEvents {
  /** Index signature for EventMap compatibility */
  [key: string]: unknown;
  /** Emitted on each render */
  render: RenderInfo;
  /** Emitted when a render chain is detected */
  chain: RenderChainInfo;
  /** Emitted when FPS drops below threshold */
  'fps-drop': number;
  /** Emitted when a fix suggestion is generated */
  fix: FixSuggestion;
  /** Emitted when component stats are updated */
  stats: ComponentStats;
  /** Emitted when scanner starts */
  start: void;
  /** Emitted when scanner stops */
  stop: void;
  /** Emitted when scanner is reset */
  reset: void;
  /** Emitted when severity changes for a component */
  severityChange: { component: string; from: string; to: string };
}

/**
 * Default scanner configuration
 */
const DEFAULT_CONFIG: ScannerConfig = {
  trackUnnecessary: true,
  fpsThreshold: 30,
  highlightRenders: true,
  animationSpeed: 'fast',
};

/**
 * Default threshold configuration
 */
const DEFAULT_THRESHOLDS: ThresholdOptions = {
  critical: 50,
  warning: 20,
  fps: 30,
};

/**
 * Core scanner class that coordinates render tracking and analysis
 */
export class Scanner extends EventEmitter<ScannerEvents> {
  /** Statistics collector */
  private stats: StatsCollector;

  /** Chain analyzer */
  private chainAnalyzer: ChainAnalyzer;

  /** Fix suggester */
  private fixSuggester: FixSuggester;

  /** Scanner configuration */
  private config: ScannerConfig;

  /** Whether scanner is currently running */
  private running: boolean = false;

  /** Last recorded FPS */
  private lastFps: number = 60;

  /** FPS tracking */
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private fpsInterval: ReturnType<typeof setInterval> | null = null;

  /** Batch processing */
  private renderBatch: RenderInfo[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly batchSize: number = 10;
  private readonly batchDelay: number = 100;

  /**
   * Create a new Scanner instance
   * @param options - Configuration options
   */
  constructor(
    options: {
      config?: Partial<ScannerConfig>;
      thresholds?: Partial<ThresholdOptions>;
    } = {}
  ) {
    super();

    this.config = { ...DEFAULT_CONFIG, ...options.config };
    const thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };

    // Initialize sub-modules
    this.stats = new StatsCollector(thresholds);
    this.chainAnalyzer = new ChainAnalyzer();
    this.fixSuggester = new FixSuggester();

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  /**
   * Set up event forwarding from sub-modules
   */
  private setupEventForwarding(): void {
    // Forward stats events
    this.stats.on('update', (stats) => {
      this.emit('stats', stats);
    });

    this.stats.on('severityChange', (change) => {
      this.emit('severityChange', change);

      // Generate fix suggestions on severity change
      const stats = this.stats.getComponentStats(change.component);
      if (stats && (change.to === 'critical' || change.to === 'warning')) {
        const suggestions = this.fixSuggester.analyze(stats);
        for (const suggestion of suggestions) {
          this.emit('fix', suggestion);
        }
      }
    });

    // Forward chain events
    this.chainAnalyzer.on('chain', (chain) => {
      this.emit('chain', chain);

      // Update component chains in stats
      for (const componentName of chain.chain) {
        this.stats.setComponentChain(componentName, chain.chain);
      }
    });
  }

  /**
   * Start the scanner
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.lastFpsUpdate = Date.now();
    this.frameCount = 0;

    // Start FPS monitoring
    this.startFpsMonitoring();

    this.emit('start', undefined);
  }

  /**
   * Stop the scanner
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;

    // Stop FPS monitoring
    this.stopFpsMonitoring();

    // Flush any pending batches
    this.flushBatch();

    this.emit('stop', undefined);
  }

  /**
   * Reset the scanner, clearing all data
   */
  reset(): void {
    this.stop();

    this.stats.reset();
    this.chainAnalyzer.reset();
    this.fixSuggester.clearSuggestions();
    this.renderBatch = [];

    this.emit('reset', undefined);
  }

  /**
   * Process a render event
   * @param render - Render information
   * @param parent - Optional parent component name
   */
  addRender(render: RenderInfo, parent?: string): void {
    if (!this.running) return;

    // Add to batch
    this.renderBatch.push(render);

    // Update stats immediately
    this.stats.addRender(render);

    // Add to chain analyzer
    this.chainAnalyzer.addRender(render, parent);

    // Emit render event
    this.emit('render', render);

    // Update frame count for FPS
    this.frameCount++;

    // Schedule batch processing
    this.scheduleBatchProcessing();
  }

  /**
   * Record a frame for FPS calculation
   */
  recordFrame(): void {
    this.frameCount++;
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimeout) return;

    if (this.renderBatch.length >= this.batchSize) {
      this.flushBatch();
    } else {
      this.batchTimeout = setTimeout(() => {
        this.flushBatch();
      }, this.batchDelay);
    }
  }

  /**
   * Flush the render batch
   */
  private flushBatch(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.renderBatch.length === 0) return;

    // Process batch for pattern detection
    this.processBatch(this.renderBatch);
    this.renderBatch = [];
  }

  /**
   * Process a batch of renders for patterns
   * @param batch - Render batch
   */
  private processBatch(batch: RenderInfo[]): void {
    // Group by component for analysis
    const byComponent = new Map<string, RenderInfo[]>();

    for (const render of batch) {
      const existing = byComponent.get(render.componentName) ?? [];
      existing.push(render);
      byComponent.set(render.componentName, existing);
    }

    // Check for high-frequency renders
    for (const [componentName, renders] of byComponent) {
      if (renders.length >= 3) {
        // Component rendered 3+ times in one batch - potential issue
        const stats = this.stats.getComponentStats(componentName);
        if (stats) {
          const suggestions = this.fixSuggester.analyze(stats);
          for (const suggestion of suggestions) {
            this.emit('fix', suggestion);
          }
        }
      }
    }
  }

  /**
   * Start FPS monitoring
   */
  private startFpsMonitoring(): void {
    this.fpsInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - this.lastFpsUpdate;

      if (elapsed > 0) {
        this.lastFps = Math.round((this.frameCount * 1000) / elapsed);
        this.stats.addFpsSample(this.lastFps);

        // Check for FPS drop
        if (this.lastFps < this.config.fpsThreshold) {
          this.emit('fps-drop', this.lastFps);
        }
      }

      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }, 1000);
  }

  /**
   * Stop FPS monitoring
   */
  private stopFpsMonitoring(): void {
    if (this.fpsInterval) {
      clearInterval(this.fpsInterval);
      this.fpsInterval = null;
    }
  }

  /**
   * Get current FPS
   * @returns Current FPS value
   */
  getFps(): number {
    return this.lastFps;
  }

  /**
   * Check if scanner is running
   * @returns true if running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get scanner configuration
   * @returns Current configuration
   */
  getConfig(): ScannerConfig {
    return { ...this.config };
  }

  /**
   * Update scanner configuration
   * @param config - Partial configuration to update
   */
  configure(config: Partial<ScannerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Update threshold configuration
   * @param thresholds - New thresholds
   */
  setThresholds(thresholds: Partial<ThresholdOptions>): void {
    this.stats.setThresholds(thresholds);
  }

  /**
   * Get current thresholds
   * @returns Current threshold configuration
   */
  getThresholds(): ThresholdOptions {
    return this.stats.getThresholds();
  }

  /**
   * Get component statistics
   * @param name - Component name (optional, returns all if not specified)
   * @returns Component stats
   */
  getStats(name?: string): ComponentStats | ComponentStats[] | undefined {
    if (name) {
      return this.stats.getComponentStats(name);
    }
    return this.stats.getAllStats();
  }

  /**
   * Get a snapshot of all stats sorted by severity
   * @returns Sorted stats array
   */
  getSnapshot(): ComponentStats[] {
    return this.stats.getSnapshot();
  }

  /**
   * Get session summary
   * @returns Session summary statistics
   */
  getSummary(): ReturnType<StatsCollector['getSummary']> {
    return this.stats.getSummary();
  }

  /**
   * Get top problematic components
   * @param limit - Maximum number to return
   * @returns Top problems
   */
  getTopProblems(limit: number = 10): ComponentStats[] {
    return this.stats.getTopProblems(limit);
  }

  /**
   * Get all fix suggestions
   * @returns All suggestions
   */
  getSuggestions(): FixSuggestion[] {
    return this.fixSuggester.getAllSuggestions();
  }

  /**
   * Get suggestions for a specific component
   * @param componentName - Component name
   * @returns Component suggestions
   */
  getComponentSuggestions(componentName: string): FixSuggestion[] {
    return this.fixSuggester.getSuggestions(componentName);
  }

  /**
   * Set parent relationship for a component
   * @param child - Child component name
   * @param parent - Parent component name
   */
  setParent(child: string, parent: string): void {
    this.chainAnalyzer.setParent(child, parent);
    this.stats.setComponentParent(child, parent);
  }

  /**
   * Get the render chain for a component
   * @param componentName - Component name
   * @returns Render chain
   */
  getComponentChain(componentName: string): string[] {
    return this.chainAnalyzer.getComponentChain(componentName);
  }

  /**
   * Get session duration
   * @returns Duration in milliseconds
   */
  getSessionDuration(): number {
    return this.stats.getSessionDuration();
  }

  /**
   * Export scanner data for reporting
   * @returns Exportable data object
   */
  export(): {
    stats: ReturnType<StatsCollector['export']>;
    suggestions: FixSuggestion[];
    config: ScannerConfig;
  } {
    return {
      stats: this.stats.export(),
      suggestions: this.getSuggestions(),
      config: this.getConfig(),
    };
  }

  /**
   * Analyze a specific component and generate suggestions
   * @param componentName - Component name
   * @returns Fix suggestions for the component
   */
  analyzeComponent(componentName: string): FixSuggestion[] {
    const stats = this.stats.getComponentStats(componentName);
    if (!stats) return [];
    return this.fixSuggester.analyze(stats);
  }

  /**
   * Analyze all components and generate suggestions
   * @returns All fix suggestions
   */
  analyzeAll(): FixSuggestion[] {
    const allStats = this.stats.getAllStats();
    const allSuggestions: FixSuggestion[] = [];

    for (const stats of allStats) {
      const suggestions = this.fixSuggester.analyze(stats);
      allSuggestions.push(...suggestions);
    }

    return allSuggestions;
  }
}
