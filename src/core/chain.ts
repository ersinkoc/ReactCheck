/**
 * Render chain analyzer - traces cascading renders to find root causes
 * @packageDocumentation
 */

import type { RenderInfo, RenderChainInfo } from '../types.js';
import { EventEmitter } from '../utils/event-emitter.js';

/**
 * Events emitted by ChainAnalyzer
 */
export interface ChainEvents {
  /** Index signature for EventMap compatibility */
  [key: string]: unknown;
  /** Emitted when a render chain is detected */
  chain: RenderChainInfo;
  /** Emitted when a context-triggered chain is detected */
  contextChain: RenderChainInfo;
}

/**
 * Internal render event with additional tracking info
 */
interface TrackedRender extends RenderInfo {
  /** Parent component name if known */
  parent?: string;
  /** Whether this render was triggered by context */
  contextTriggered?: boolean;
}

/**
 * Window of renders for analysis
 */
interface RenderWindow {
  /** Renders in this window */
  renders: TrackedRender[];
  /** Window start timestamp */
  startTime: number;
}

/**
 * Analyzes render patterns to detect and trace render chains
 */
export class ChainAnalyzer extends EventEmitter<ChainEvents> {
  /** Time window size in ms (one frame at 60fps) */
  private readonly windowSize: number;

  /** Current render windows being tracked */
  private windows: Map<number, RenderWindow> = new Map();

  /** Component parent relationships */
  private parentMap: Map<string, string> = new Map();

  /** Recently detected chains to avoid duplicates */
  private recentChains: Set<string> = new Set();

  /** Minimum chain depth to report */
  private readonly minChainDepth: number;

  /** Maximum time to keep recent chains */
  private readonly recentChainTtl: number;

  /**
   * Create a new ChainAnalyzer
   * @param options - Configuration options
   */
  constructor(
    options: {
      windowSize?: number;
      minChainDepth?: number;
      recentChainTtl?: number;
    } = {}
  ) {
    super();
    this.windowSize = options.windowSize ?? 16; // 16ms = ~1 frame at 60fps
    this.minChainDepth = options.minChainDepth ?? 2;
    this.recentChainTtl = options.recentChainTtl ?? 1000; // 1 second
  }

  /**
   * Add a render event for analysis
   * @param render - Render information
   * @param parent - Optional parent component name
   */
  addRender(render: RenderInfo, parent?: string): void {
    const trackedRender: TrackedRender = {
      ...render,
      ...(parent !== undefined ? { parent } : {}),
      contextTriggered: this.isContextTriggered(render),
    };

    // Update parent map
    if (parent) {
      this.parentMap.set(render.componentName, parent);
    }

    // Get or create window for this timestamp
    const windowKey = this.getWindowKey(render.timestamp);
    let window = this.windows.get(windowKey);

    if (!window) {
      window = {
        renders: [],
        startTime: render.timestamp,
      };
      this.windows.set(windowKey, window);
    }

    window.renders.push(trackedRender);

    // Analyze window if we have enough renders
    if (window.renders.length >= this.minChainDepth) {
      this.analyzeWindow(windowKey);
    }

    // Clean up old windows
    this.cleanupWindows(render.timestamp);
  }

  /**
   * Set parent relationship for a component
   * @param child - Child component name
   * @param parent - Parent component name
   */
  setParent(child: string, parent: string): void {
    this.parentMap.set(child, parent);
  }

  /**
   * Get window key for a timestamp
   * @param timestamp - Timestamp in ms
   * @returns Window key
   */
  private getWindowKey(timestamp: number): number {
    return Math.floor(timestamp / this.windowSize);
  }

  /**
   * Check if a render was likely triggered by context
   * @param render - Render information
   * @returns true if context-triggered
   */
  private isContextTriggered(render: RenderInfo): boolean {
    // If neither props nor state changed, likely context-triggered
    return !render.changedProps?.length && !render.changedState?.length && render.phase === 'update';
  }

  /**
   * Analyze a render window for chains
   * @param windowKey - Window key to analyze
   */
  private analyzeWindow(windowKey: number): void {
    const window = this.windows.get(windowKey);
    if (!window || window.renders.length < this.minChainDepth) {
      return;
    }

    // Sort renders by timestamp
    const sortedRenders = [...window.renders].sort((a, b) => a.timestamp - b.timestamp);

    // Build chains from render sequence
    const chains = this.buildChains(sortedRenders);

    // Emit detected chains
    for (const chain of chains) {
      const chainKey = this.getChainKey(chain);

      // Skip if recently reported
      if (this.recentChains.has(chainKey)) {
        continue;
      }

      this.recentChains.add(chainKey);
      setTimeout(() => {
        this.recentChains.delete(chainKey);
      }, this.recentChainTtl);

      this.emit('chain', chain);

      if (chain.isContextTriggered) {
        this.emit('contextChain', chain);
      }
    }
  }

  /**
   * Build chains from a sorted render sequence
   * @param renders - Sorted render events
   * @returns Detected chains
   */
  private buildChains(renders: TrackedRender[]): RenderChainInfo[] {
    const chains: RenderChainInfo[] = [];

    // Group renders by potential chain relationships
    const visited = new Set<string>();
    const chainComponents: string[][] = [];

    for (const render of renders) {
      if (visited.has(render.componentName)) {
        continue;
      }

      // Find all renders connected to this one
      const chain = this.traceChain(render.componentName, renders, visited);
      if (chain.length >= this.minChainDepth) {
        chainComponents.push(chain);
      }
    }

    // Convert to RenderChainInfo
    for (const chain of chainComponents) {
      const chainRenders = renders.filter((r) => chain.includes(r.componentName));
      const isContextTriggered = chainRenders.some((r) => r.contextTriggered);

      const rootCause = this.findRootCause(chain, renders);
      const trigger = this.determineTrigger(rootCause, renders);

      chains.push({
        trigger,
        chain,
        depth: chain.length,
        totalRenders: chainRenders.length,
        rootCause,
        timestamp: Date.now(),
        isContextTriggered,
      });
    }

    return chains;
  }

  /**
   * Trace a chain starting from a component
   * @param startComponent - Starting component
   * @param renders - All renders in window
   * @param visited - Already visited components
   * @returns Chain of component names
   */
  private traceChain(startComponent: string, renders: TrackedRender[], visited: Set<string>): string[] {
    const chain: string[] = [];
    const queue: string[] = [startComponent];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }

      visited.add(current);
      chain.push(current);

      // Find parent in chain
      const parent = this.parentMap.get(current);
      if (parent && renders.some((r) => r.componentName === parent) && !visited.has(parent)) {
        queue.unshift(parent); // Add to front for proper ordering
      }

      // Find children in chain
      for (const [child, p] of this.parentMap) {
        if (p === current && renders.some((r) => r.componentName === child) && !visited.has(child)) {
          queue.push(child);
        }
      }
    }

    return chain;
  }

  /**
   * Find the root cause component in a chain
   * @param chain - Component chain
   * @param renders - All renders
   * @returns Root cause component name
   */
  private findRootCause(chain: string[], renders: TrackedRender[]): string {
    // The root cause is typically the first component that rendered
    // and had a state/prop change
    const chainRenders = renders
      .filter((r) => chain.includes(r.componentName))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Look for the first render that caused the cascade
    for (const render of chainRenders) {
      if (render.changedState?.length ?? render.changedProps?.length) {
        return render.componentName;
      }
    }

    // Default to first in chain
    return chain[0] ?? 'Unknown';
  }

  /**
   * Determine what triggered a chain
   * @param rootCause - Root cause component
   * @param renders - All renders
   * @returns Trigger description
   */
  private determineTrigger(rootCause: string, renders: TrackedRender[]): string {
    const render = renders.find((r) => r.componentName === rootCause);

    if (!render) {
      return `Unknown trigger in ${rootCause}`;
    }

    if (render.changedState?.length) {
      return `setState in ${rootCause}`;
    }

    if (render.changedProps?.length) {
      const props = render.changedProps.slice(0, 3).join(', ');
      const more = render.changedProps.length > 3 ? '...' : '';
      return `Props changed (${props}${more}) in ${rootCause}`;
    }

    if (render.contextTriggered) {
      return `Context update affecting ${rootCause}`;
    }

    if (render.phase === 'mount') {
      return `Initial mount of ${rootCause}`;
    }

    return `Re-render of ${rootCause}`;
  }

  /**
   * Generate a unique key for a chain to detect duplicates
   * @param chain - Chain info
   * @returns Unique key
   */
  private getChainKey(chain: RenderChainInfo): string {
    return `${chain.rootCause}:${chain.chain.join('->')}`;
  }

  /**
   * Clean up old render windows
   * @param currentTime - Current timestamp
   */
  private cleanupWindows(currentTime: number): void {
    const cutoff = currentTime - this.windowSize * 10; // Keep last 10 windows

    for (const [key, window] of this.windows) {
      if (window.startTime < cutoff) {
        this.windows.delete(key);
      }
    }
  }

  /**
   * Get the parent of a component
   * @param componentName - Component name
   * @returns Parent name or undefined
   */
  getParent(componentName: string): string | undefined {
    return this.parentMap.get(componentName);
  }

  /**
   * Get all known parent relationships
   * @returns Map of child to parent
   */
  getParentMap(): Map<string, string> {
    return new Map(this.parentMap);
  }

  /**
   * Build a full chain for a component (tracing up to root)
   * @param componentName - Starting component
   * @returns Chain from root to component
   */
  getComponentChain(componentName: string): string[] {
    const chain: string[] = [];
    let current: string | undefined = componentName;

    while (current) {
      chain.unshift(current);
      current = this.parentMap.get(current);

      // Prevent infinite loops
      if (chain.length > 100) {
        break;
      }
    }

    return chain;
  }

  /**
   * Clear all tracked data
   */
  reset(): void {
    this.windows.clear();
    this.parentMap.clear();
    this.recentChains.clear();
  }

  /**
   * Get statistics about current tracking
   * @returns Tracking statistics
   */
  getStats(): {
    windowCount: number;
    parentRelationships: number;
    recentChains: number;
  } {
    return {
      windowCount: this.windows.size,
      parentRelationships: this.parentMap.size,
      recentChains: this.recentChains.size,
    };
  }
}
