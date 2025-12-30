/**
 * Browser injection script - main entry point for browser-side code
 * This file is bundled as an IIFE for injection into target pages
 * @packageDocumentation
 */

import type { BrowserMessage, CLIMessage, ScannerConfig, WindowWithReactDevTools } from '../types.js';
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

    // Start the scanner
    this.scanner.start();

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
    this.scanner.on('render', (render) => {
      // Send to CLI
      this.send({ type: 'render', payload: render });

      // Always record render for stats (even without DOM element)
      this.overlay.recordRender(render);

      // Try to highlight if we can find the DOM element
      const element = this.findDOMElement(render.componentName);
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

        // Start scanning (scanner may already be started by hook)
        this.scanner.start();
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
    }
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
   * Find DOM element for a component
   * @param componentName - Component name
   * @returns DOM element or null
   */
  private findDOMElement(componentName: string): Element | null {
    // This is a simplified approach
    // In production, we would use fiber.stateNode or traverse the fiber tree
    // to find the actual DOM node

    // Try to find by data attribute (if available)
    const byAttr = document.querySelector(`[data-component="${componentName}"]`);
    if (byAttr) return byAttr;

    // Try to find by React internal attributes
    const allElements = document.querySelectorAll('[class*="' + componentName + '"]');
    if (allElements.length > 0) return allElements[0] ?? null;

    return null;
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

  // CRITICAL: Install React DevTools hook IMMEDIATELY before React loads
  // This must happen synchronously before any React code runs
  if (!win.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    // Queue to store commits until injector is ready
    const pendingCommits: Array<{ rendererID: number; root: unknown }> = [];
    let injectorReady = false;

    const hook = {
      renderers: new Map(),
      supportsFiber: true,
      inject: function(renderer: unknown) {
        const id = this.renderers.size + 1;
        this.renderers.set(id, renderer);
        return id;
      },
      onCommitFiberRoot: function(rendererID: number, root: unknown) {
        if (injectorReady) {
          // Forward to injector's scanner
          const scanner = (injector as unknown as { scanner: BrowserScanner }).scanner;
          if (scanner) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            scanner['processCommit']((root as any).current);
          }
        } else {
          // Queue for later
          pendingCommits.push({ rendererID, root });
        }
      },
      onCommitFiberUnmount: function() {},
      // Method to process pending commits when injector is ready
      _processPending: function() {
        injectorReady = true;
        const scanner = (injector as unknown as { scanner: BrowserScanner }).scanner;
        if (scanner) {
          for (const { root } of pendingCommits) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            scanner['processCommit']((root as any).current);
          }
          pendingCommits.length = 0;
        }
      },
    };
    win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;
    // eslint-disable-next-line no-console
    console.log('[ReactCheck] DevTools hook installed');

    // Mark injector ready callback
    (injector as unknown as { _markHookReady: () => void })._markHookReady = () => {
      hook._processPending();
    };
  }

  // Initialize after DOM is ready (for overlay and WebSocket)
  // The hook is already installed above, so React will register with it
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
