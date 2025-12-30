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

    // Connect to CLI
    this.connect();

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

      // Update overlay
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

        // Start scanning
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

  /**
   * Send message to CLI
   * @param message - Browser message
   */
  private send(message: BrowserMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
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

  // Create and initialize injector
  const injector = new ReactCheckInjector();

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injector.init();
    });
  } else {
    injector.init();
  }

  // Expose for debugging
  (window as unknown as { __REACTCHECK__: ReactCheckInjector }).__REACTCHECK__ = injector;
})();

// Export for module usage
export { ReactCheckInjector, BrowserScanner, Overlay };
