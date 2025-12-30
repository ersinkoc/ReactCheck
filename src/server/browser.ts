/**
 * Browser launcher using Puppeteer
 * @packageDocumentation
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { Logger, LogLevel } from '../utils/logger.js';

const logger = new Logger({ prefix: 'browser', level: LogLevel.DEBUG });

/**
 * Browser launch options
 */
export interface BrowserLaunchOptions {
  /** URL to navigate to */
  url: string;
  /** Run in headless mode */
  headless?: boolean;
  /** Browser window width */
  width?: number;
  /** Browser window height */
  height?: number;
  /** WebSocket port for injection */
  wsPort?: number;
  /** Additional Chrome arguments */
  args?: string[];
  /** Slow down operations by specified ms */
  slowMo?: number;
  /** Timeout for operations in ms */
  timeout?: number;
}

/**
 * Browser events
 */
export interface BrowserEvents {
  /** Index signature for EventMap compatibility */
  [key: string]: unknown;
  /** Browser launched successfully */
  launched: void;
  /** Page navigated */
  navigated: { url: string };
  /** Page loaded */
  loaded: void;
  /** Console message from page */
  console: { type: string; text: string };
  /** Error occurred */
  error: Error;
  /** Browser closed */
  closed: void;
}

// Puppeteer types (dynamic import)
type Browser = import('puppeteer').Browser;
type Page = import('puppeteer').Page;

/**
 * Browser launcher wrapper around Puppeteer
 */
export class BrowserLauncher extends EventEmitter<BrowserEvents> {
  /** Puppeteer browser instance */
  private browser: Browser | null = null;

  /** Active page */
  private page: Page | null = null;

  /** Launch options */
  private options: Required<BrowserLaunchOptions>;

  /** Injection script */
  private injectionScript: string | null = null;

  /**
   * Create a new browser launcher
   * @param options - Launch options
   */
  constructor(options: BrowserLaunchOptions) {
    super();
    this.options = {
      url: options.url,
      headless: options.headless ?? false,
      width: options.width ?? 1280,
      height: options.height ?? 800,
      wsPort: options.wsPort ?? 3099,
      args: options.args ?? [],
      slowMo: options.slowMo ?? 0,
      timeout: options.timeout ?? 30000,
    };
  }

  /**
   * Set the injection script
   * @param script - Script to inject before page loads
   */
  setInjectionScript(script: string): void {
    this.injectionScript = script;
  }

  /**
   * Launch the browser
   */
  async launch(): Promise<void> {
    try {
      // Dynamic import of Puppeteer
      const puppeteer = await import('puppeteer');

      // Build launch arguments
      const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        `--window-size=${this.options.width},${this.options.height}`,
        ...this.options.args,
      ];

      // Launch browser
      this.browser = await puppeteer.default.launch({
        headless: this.options.headless,
        args,
        slowMo: this.options.slowMo,
        defaultViewport: {
          width: this.options.width,
          height: this.options.height,
        },
      });

      // Get first page or create new one
      const pages = await this.browser.pages();
      this.page = pages[0] ?? await this.browser.newPage();

      // Set up page event handlers
      this.setupPageHandlers();

      // Inject script before navigation if provided
      if (this.injectionScript) {
        await this.page.evaluateOnNewDocument(this.injectionScript);
      }

      // Build default injection script
      const wsPort = this.options.wsPort;
      await this.page.evaluateOnNewDocument(`
        window.__REACTCHECK_PORT__ = ${wsPort};
        window.__REACTCHECK_INJECTED__ = true;
      `);

      this.emit('launched', undefined);
      logger.info('Browser launched');

      // Navigate to URL
      await this.navigate(this.options.url);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Set up page event handlers
   */
  private setupPageHandlers(): void {
    if (!this.page) return;

    // Console messages
    this.page.on('console', (msg) => {
      this.emit('console', {
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Page errors
    this.page.on('pageerror', (error) => {
      this.emit('error', error);
    });

    // Navigation
    this.page.on('framenavigated', (frame) => {
      if (frame === this.page?.mainFrame()) {
        this.emit('navigated', { url: frame.url() });
      }
    });

    // Load
    this.page.on('load', () => {
      this.emit('loaded', undefined);
    });
  }

  /**
   * Navigate to a URL
   * @param url - URL to navigate to
   */
  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    try {
      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.options.timeout,
      });

      this.emit('navigated', { url });
      logger.info(`Navigated to ${url}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Execute script in page context
   * @param script - Script to execute
   * @returns Script result
   */
  async evaluate<T>(script: string | (() => T)): Promise<T> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    return this.page.evaluate(script);
  }

  /**
   * Wait for selector
   * @param selector - CSS selector
   * @param timeout - Timeout in ms
   */
  async waitForSelector(selector: string, timeout?: number): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.page.waitForSelector(selector, {
      timeout: timeout ?? this.options.timeout,
    });
  }

  /**
   * Take a screenshot
   * @param path - File path to save screenshot
   */
  async screenshot(path: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.page.screenshot({ path, fullPage: true });
    logger.info(`Screenshot saved to ${path}`);
  }

  /**
   * Reload the page
   */
  async reload(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    await this.page.reload({ waitUntil: 'networkidle2' });
  }

  /**
   * Get current URL
   * @returns Current page URL
   */
  getUrl(): string | null {
    return this.page?.url() ?? null;
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.emit('closed', undefined);
      logger.info('Browser closed');
    }
  }

  /**
   * Check if browser is open
   * @returns true if browser is open
   */
  isOpen(): boolean {
    return this.browser !== null && this.browser.connected;
  }

  /**
   * Get the page instance (for advanced usage)
   * @returns Puppeteer page or null
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Get the browser instance (for advanced usage)
   * @returns Puppeteer browser or null
   */
  getBrowser(): Browser | null {
    return this.browser;
  }
}

/**
 * Check if Puppeteer is available
 * @returns true if Puppeteer can be imported
 */
export async function isPuppeteerAvailable(): Promise<boolean> {
  try {
    await import('puppeteer');
    return true;
  } catch {
    return false;
  }
}
