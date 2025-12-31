/**
 * Browser-side scanner for React render tracking
 * @packageDocumentation
 */

import type {
  RenderInfo,
  FiberNode,
  ReactDevToolsHook,
  WindowWithReactDevTools,
  ScannerConfig,
} from '../types.js';
import { EventEmitter } from '../utils/event-emitter.js';
import {
  getComponentName,
  isUserComponent,
  createRenderInfo,
} from '../core/fiber.js';
import { Overlay } from './overlay.js';

/**
 * Render event with DOM element reference
 */
export interface RenderEvent {
  /** Render information */
  render: RenderInfo;
  /** DOM element associated with this render (if found) */
  element: Element | null;
}

/**
 * Browser scanner events
 */
export interface BrowserScannerEvents {
  /** Index signature for EventMap compatibility */
  [key: string]: unknown;
  /** Emitted on each render with DOM element */
  render: RenderEvent;
  /** Emitted when scanner is ready */
  ready: { reactVersion: string };
  /** Emitted on error */
  error: Error;
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
 * Browser-side scanner that hooks into React to track renders
 */
export class BrowserScanner extends EventEmitter<BrowserScannerEvents> {
  /** Scanner configuration */
  private config: ScannerConfig;

  /** Whether scanner is running */
  private running: boolean = false;

  /** React version detected */
  private reactVersion: string = 'unknown';

  /** Previous fiber states for comparison */
  private prevFiberStates: WeakMap<FiberNode, { props: unknown; state: unknown }> = new WeakMap();

  /** Component render counts */
  private renderCounts: Map<string, number> = new Map();

  /** Original DevTools hook methods */
  private originalOnCommitFiberRoot: ReactDevToolsHook['onCommitFiberRoot'] | null = null;

  /** Window reference */
  private win: WindowWithReactDevTools;

  /** Overlay for visual feedback */
  private overlay: Overlay | null = null;

  /**
   * Create a new browser scanner
   * @param config - Scanner configuration
   * @param win - Window object (for testing)
   */
  constructor(config: Partial<ScannerConfig> = {}, win?: WindowWithReactDevTools) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.win = win ?? (typeof window !== 'undefined' ? window as WindowWithReactDevTools : {} as WindowWithReactDevTools);
  }

  /**
   * Get DOM element from fiber node
   * React stores the DOM node in fiber.stateNode for host components
   * or we need to walk down to find the first DOM node
   * @param fiber - Fiber node
   * @returns DOM Element or null
   */
  private getDOMElement(fiber: FiberNode): Element | null {
    // First try stateNode directly
    if (fiber.stateNode instanceof Element) {
      return fiber.stateNode;
    }

    // Walk down to find the first DOM node (for function/class components)
    let current: FiberNode | null = fiber.child;
    while (current) {
      if (current.stateNode instanceof Element) {
        return current.stateNode;
      }
      // Try next child or sibling
      if (current.child) {
        current = current.child;
      } else if (current.sibling) {
        current = current.sibling;
      } else {
        // Go back up and try siblings
        let parent = current.return;
        while (parent && parent !== fiber && !parent.sibling) {
          parent = parent.return;
        }
        current = parent && parent !== fiber ? parent.sibling : null;
      }
    }

    return null;
  }

  /**
   * Enable visual overlay for render highlighting
   */
  enableOverlay(): void {
    if (this.overlay) return;

    this.overlay = new Overlay({
      enabled: true,
      highlightRenders: this.config.highlightRenders ?? true,
      animationSpeed: this.config.animationSpeed ?? 'fast',
      showBadges: true,
      showToolbar: true,
    });

    this.overlay.init();
  }

  /**
   * Disable visual overlay
   */
  disableOverlay(): void {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }

  /**
   * Get overlay instance
   * @returns Overlay instance or null
   */
  getOverlay(): Overlay | null {
    return this.overlay;
  }

  /**
   * Start the scanner
   */
  start(): void {
    if (this.running) return;

    try {
      this.hookIntoReact();
      this.running = true;
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Stop the scanner
   */
  stop(): void {
    if (!this.running) return;

    this.unhookFromReact();
    this.disableOverlay();
    this.running = false;
  }

  /**
   * Reset the scanner state
   */
  reset(): void {
    this.renderCounts.clear();
    this.prevFiberStates = new WeakMap();
  }

  /**
   * Hook into React DevTools global hook
   */
  private hookIntoReact(): void {
    const hook = this.win.__REACT_DEVTOOLS_GLOBAL_HOOK__;

    if (!hook) {
      // No DevTools hook, need to install our own
      this.installHook();
      return;
    }

    // Store original method
    this.originalOnCommitFiberRoot = hook.onCommitFiberRoot.bind(hook);

    // Override commit method
    hook.onCommitFiberRoot = (rendererID, root, priorityLevel) => {
      // Call original first
      if (this.originalOnCommitFiberRoot) {
        this.originalOnCommitFiberRoot(rendererID, root, priorityLevel);
      }

      // Process the commit
      this.processCommit(root.current);
    };

    // Detect React version
    this.reactVersion = this.detectReactVersion(hook);

    this.emit('ready', { reactVersion: this.reactVersion });
  }

  /**
   * Install our own hook if DevTools hook is not present
   */
  private installHook(): void {
    const hook: ReactDevToolsHook = {
      renderers: new Map(),
      supportsFiber: true,
      inject: (renderer) => {
        const id = hook.renderers.size + 1;
        hook.renderers.set(id, renderer);
        return id;
      },
      onCommitFiberRoot: (_rendererID, root, _priorityLevel) => {
        this.processCommit(root.current);
      },
      onCommitFiberUnmount: () => {},
    };

    this.win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;
    this.emit('ready', { reactVersion: 'unknown (hook installed)' });
  }

  /**
   * Unhook from React
   */
  private unhookFromReact(): void {
    const hook = this.win.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook && this.originalOnCommitFiberRoot) {
      hook.onCommitFiberRoot = this.originalOnCommitFiberRoot;
      this.originalOnCommitFiberRoot = null;
    }
  }

  /**
   * Detect React version from hook
   * @param hook - DevTools hook
   * @returns React version string
   */
  private detectReactVersion(hook: ReactDevToolsHook): string {
    if (hook.renderers.size === 0) {
      return 'unknown';
    }

    const renderer = hook.renderers.values().next().value;
    if (renderer && typeof renderer === 'object' && 'version' in renderer) {
      return String(renderer.version);
    }

    return 'unknown';
  }

  /**
   * Process a fiber commit (public for IIFE hook integration)
   * @param rootFiber - Root fiber of the committed tree
   */
  processCommit(rootFiber: FiberNode): void {
    // Walk the fiber tree and find all user components that rendered
    this.walkFiber(rootFiber, null);
  }

  /**
   * Walk the fiber tree
   * @param fiber - Current fiber
   * @param parent - Parent component name
   */
  private walkFiber(fiber: FiberNode | null, parent: string | null): void {
    if (!fiber) return;

    // Process this fiber if it's a user component
    if (isUserComponent(fiber)) {
      this.processFiber(fiber, parent);
      parent = getComponentName(fiber);
    }

    // Walk children
    this.walkFiber(fiber.child, parent);

    // Walk siblings
    this.walkFiber(fiber.sibling, parent);
  }

  /**
   * Process a single fiber
   * @param fiber - Fiber to process
   * @param parent - Parent component name
   */
  private processFiber(fiber: FiberNode, _parent: string | null): void {
    const componentName = getComponentName(fiber);

    // Skip filtered components
    if (this.shouldFilterComponent(componentName)) {
      return;
    }

    // Get previous state
    const prevState = this.prevFiberStates.get(fiber);

    // Determine render phase
    const phase: 'mount' | 'update' = prevState ? 'update' : 'mount';

    // Create render info
    const renderInfo = createRenderInfo(
      fiber,
      phase,
      prevState?.props as Record<string, unknown> | null,
      prevState?.state
    );

    // Update render count
    const currentCount = this.renderCounts.get(componentName) ?? 0;
    const newCount = currentCount + 1;
    this.renderCounts.set(componentName, newCount);
    renderInfo.renderCount = newCount;

    // Store current state for future comparison
    this.prevFiberStates.set(fiber, {
      props: fiber.memoizedProps,
      state: fiber.memoizedState,
    });

    // Get DOM element for this fiber
    const domElement = this.getDOMElement(fiber);

    // Visual highlight if overlay is enabled
    if (this.overlay && this.config.highlightRenders) {
      if (domElement) {
        this.overlay.highlight(renderInfo, domElement);
      } else {
        // Still record render even without DOM element
        this.overlay.recordRender(renderInfo);
      }
    }

    // Emit render event with DOM element
    this.emit('render', { render: renderInfo, element: domElement });
  }

  /**
   * Check if component should be filtered out
   * @param name - Component name
   * @returns true if should be filtered
   */
  private shouldFilterComponent(name: string): boolean {
    // Filter React internal components
    if (name.startsWith('__')) return true;
    if (name === 'Fragment') return true;
    if (name === 'Suspense') return true;
    if (name === 'Profiler') return true;

    // Check include/exclude patterns
    const { include, exclude } = this.config;

    if (include && include.length > 0) {
      const included = include.some((pattern) => this.matchPattern(name, pattern));
      if (!included) return true;
    }

    if (exclude && exclude.length > 0) {
      const excluded = exclude.some((pattern) => this.matchPattern(name, pattern));
      if (excluded) return true;
    }

    return false;
  }

  /**
   * Simple glob pattern matching
   * @param name - Component name
   * @param pattern - Glob pattern
   * @returns true if matches
   */
  private matchPattern(name: string, pattern: string): boolean {
    // Simple pattern matching (supports * wildcard)
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    try {
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(name);
    } catch {
      return false;
    }
  }

  /**
   * Get current configuration
   * @returns Scanner configuration
   */
  getConfig(): ScannerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param config - Partial configuration
   */
  configure(config: Partial<ScannerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if scanner is running
   * @returns true if running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get detected React version
   * @returns React version string
   */
  getReactVersion(): string {
    return this.reactVersion;
  }

  /**
   * Get render count for a component
   * @param name - Component name
   * @returns Render count
   */
  getRenderCount(name: string): number {
    return this.renderCounts.get(name) ?? 0;
  }

  /**
   * Get all render counts
   * @returns Map of component names to render counts
   */
  getAllRenderCounts(): Map<string, number> {
    return new Map(this.renderCounts);
  }
}
