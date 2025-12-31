/**
 * Browser injection script - main entry point for browser-side code
 * This file is bundled as an IIFE for injection into target pages
 * @packageDocumentation
 */

import type { BrowserMessage, CLIMessage, FiberNode, ScannerConfig, WindowWithReactDevTools } from '../types.js';
import { BrowserScanner } from './scanner.js';
import { Overlay } from './overlay.js';

/**
 * Main injector class that coordinates browser-side scanning
 */
class ReactCheckInjector {
  /** Browser scanner instance */
  private scanner: BrowserScanner;

  /** Overlay instance */
  private overlay: Overlay;

  /** WebSocket connection to CLI */
  private ws: WebSocket | null = null;

  /** WebSocket port */
  private wsPort: number;

  /** Reconnect timeout handle */
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Whether initialized */
  private initialized: boolean = false;

  /**
   * Create the injector
   */
  constructor() {
    const win = window as WindowWithReactDevTools;

    // Get WebSocket port from global
    this.wsPort = win.__REACTCHECK_PORT__ ?? 3099;

    // Create scanner and overlay
    this.scanner = new BrowserScanner({
      trackUnnecessary: true,
      highlightRenders: true,
      animationSpeed: 'fast',
    }, win);

    this.overlay = new Overlay({
      enabled: true,
      highlightRenders: true,
      showBadges: true,
      showToolbar: true,
    });
  }

  /**
   * Initialize the injector
   */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Initialize overlay
    this.overlay.init();

    // Set up scanner events
    this.setupScannerEvents();

    // Note: Don't call scanner.start() here - the IIFE hook handles commit forwarding
    // scanner.start() would override our already-installed hook

    // Connect to CLI
    this.connect();

    // Notify hook that we're ready to process commits
    const markHookReady = (this as unknown as { _markHookReady?: () => void })._markHookReady;
    if (markHookReady) {
      markHookReady();
    }

    // Log initialization
    // eslint-disable-next-line no-console
    console.log('[ReactCheck] Initialized');
  }

  /**
   * Set up scanner event handlers
   */
  private setupScannerEvents(): void {
    this.scanner.on('render', ({ render, element }) => {
      // Send to CLI
      this.send({ type: 'render', payload: render });

      // Always record render for stats (even without DOM element)
      this.overlay.recordRender(render);

      // Highlight if we have a DOM element from fiber
      if (element) {
        this.overlay.highlight(render, element);
      }
    });

    this.scanner.on('ready', (info) => {
      this.send({ type: 'ready', payload: info });
    });

    this.scanner.on('error', (error) => {
      this.send({
        type: 'error',
        payload: { message: error.message, code: 'SCANNER_ERROR' },
      });
    });
  }

  /**
   * Connect to CLI WebSocket server
   */
  private connect(): void {
    if (this.ws) {
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(`ws://localhost:${this.wsPort}`);

      this.ws.onopen = () => {
        // eslint-disable-next-line no-console
        console.log('[ReactCheck] Connected to CLI');

        // Clear reconnect timeout
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }

        // Send ready message with React version
        this.send({
          type: 'ready',
          payload: { reactVersion: this.scanner.getReactVersion() },
        });

        // Flush any queued messages (renders that happened before connection)
        this.flushMessageQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as CLIMessage;
          this.handleMessage(message);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('[ReactCheck] Invalid message:', error);
        }
      };

      this.ws.onerror = (error) => {
        // eslint-disable-next-line no-console
        console.warn('[ReactCheck] WebSocket error:', error);
      };

      this.ws.onclose = () => {
        // eslint-disable-next-line no-console
        console.log('[ReactCheck] Disconnected from CLI');
        this.scheduleReconnect();
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[ReactCheck] Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      // eslint-disable-next-line no-console
      console.log('[ReactCheck] Attempting to reconnect...');
      this.connect();
    }, 2000);
  }

  /**
   * Handle message from CLI
   * @param message - CLI message
   */
  private handleMessage(message: CLIMessage): void {
    switch (message.type) {
      case 'start':
        this.scanner.start();
        this.overlay.show();
        break;

      case 'stop':
        this.scanner.stop();
        break;

      case 'reset':
        this.scanner.reset();
        this.overlay.clear();
        break;

      case 'config':
        this.handleConfig(message.payload);
        break;

      case 'highlight':
        // Toggle highlight for specific component
        break;

      case 'toggle-overlay':
        this.handleToggleOverlay(message.payload.enabled);
        break;
    }
  }

  /**
   * Toggle overlay visibility
   * @param enabled - Whether overlay should be visible
   */
  private handleToggleOverlay(enabled: boolean): void {
    if (enabled) {
      this.overlay.show();
      this.overlay.configure({ highlightRenders: true });
      // eslint-disable-next-line no-console
      console.log('[ReactCheck] Overlay enabled');
    } else {
      this.overlay.hide();
      this.overlay.configure({ highlightRenders: false });
      // eslint-disable-next-line no-console
      console.log('[ReactCheck] Overlay disabled');
    }
  }

  /**
   * Get overlay visibility status
   * @returns Whether overlay is visible
   */
  isOverlayEnabled(): boolean {
    return this.overlay.isVisible();
  }

  /**
   * Toggle overlay (public method for console access)
   */
  toggleOverlay(): void {
    const enabled = !this.overlay.isVisible();
    this.handleToggleOverlay(enabled);
  }

  /**
   * Handle config update
   * @param config - New configuration
   */
  private handleConfig(config: Partial<ScannerConfig>): void {
    this.scanner.configure(config);

    if (config.highlightRenders !== undefined) {
      this.overlay.configure({ highlightRenders: config.highlightRenders });
    }

    if (config.animationSpeed !== undefined) {
      this.overlay.configure({ animationSpeed: config.animationSpeed });
    }
  }

  /** Message queue for messages sent before connection */
  private messageQueue: BrowserMessage[] = [];

  /**
   * Send message to CLI
   * @param message - Browser message
   */
  private send(message: BrowserMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  /**
   * Flush queued messages after connection
   */
  private flushMessageQueue(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.messageQueue.length > 0) {
      for (const message of this.messageQueue) {
        this.ws.send(JSON.stringify(message));
      }
      this.messageQueue = [];
    }
  }


  /**
   * Destroy the injector
   */
  destroy(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.ws) {
      this.ws.close();
    }

    this.scanner.stop();
    this.overlay.destroy();
    this.initialized = false;
  }
}

// ============================================================================
// IIFE Entry Point
// ============================================================================

(function() {
  // Check if already injected
  const win = window as WindowWithReactDevTools;
  if (win.__REACTCHECK_INJECTED__) {
    return;
  }
  win.__REACTCHECK_INJECTED__ = true;

  // Create injector instance first (but don't init yet)
  const injector = new ReactCheckInjector();

  // Queue to store commits until injector is ready
  const pendingCommits: Array<{ rendererID: number; root: unknown }> = [];
  let injectorReady = false;

  // Handler for processing commits
  const handleCommit = (root: unknown) => {
    if (injectorReady) {
      // Forward to injector's scanner
      const scanner = (injector as unknown as { scanner: BrowserScanner }).scanner;
      if (scanner) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fiber = (root as any).current;
        scanner.processCommit(fiber);
      }
    } else {
      // Queue for later
      pendingCommits.push({ rendererID: 0, root });
    }
  };

  // Process pending commits when ready
  const processPendingCommits = () => {
    injectorReady = true;
    const scanner = (injector as unknown as { scanner: BrowserScanner }).scanner;
    if (scanner) {
      for (const { root } of pendingCommits) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        scanner.processCommit((root as any).current);
      }
      pendingCommits.length = 0;
    }
  };

  // CRITICAL: Install or hook into React DevTools hook
  if (!win.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    // No existing hook - install our own
    const hook = {
      renderers: new Map(),
      supportsFiber: true,
      inject: function(renderer: unknown) {
        const id = this.renderers.size + 1;
        this.renderers.set(id, renderer);
        return id;
      },
      onCommitFiberRoot: function(_rendererID: number, root: unknown) {
        handleCommit(root);
      },
      onCommitFiberUnmount: function() {},
    };
    win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;
    // eslint-disable-next-line no-console
    console.log('[ReactCheck] DevTools hook installed');
  } else {
    // Hook already exists (e.g., Vite refresh, React DevTools) - wrap it
    const existingHook = win.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    const originalOnCommit = existingHook.onCommitFiberRoot.bind(existingHook);

    existingHook.onCommitFiberRoot = (rendererID: number, root: { current: FiberNode }, priorityLevel?: unknown) => {
      // Call original first
      originalOnCommit(rendererID, root, priorityLevel);
      // Then our handler
      handleCommit(root);
    };
    // eslint-disable-next-line no-console
    console.log('[ReactCheck] Wrapped existing DevTools hook');
  }

  // Mark injector ready callback
  (injector as unknown as { _markHookReady: () => void })._markHookReady = () => {
    processPendingCommits();
  };

  // Initialize after DOM is ready (for overlay and WebSocket)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injector.init();
    });
  } else {
    // DOM already loaded, init immediately
    injector.init();
  }

  // Expose for debugging
  (window as unknown as { __REACTCHECK__: ReactCheckInjector }).__REACTCHECK__ = injector;
})();

// Export for module usage
export { ReactCheckInjector, BrowserScanner, Overlay };
