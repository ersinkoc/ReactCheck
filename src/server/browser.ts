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
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
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
      // Note: The injection script already contains the port configuration
      if (this.injectionScript) {
        logger.debug('Injecting ReactCheck script into page...');
        await this.page.evaluateOnNewDocument(this.injectionScript);
        logger.debug('Injection script registered');
      }

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
   * Navigate to a URL with retry support
   * @param url - URL to navigate to
   * @param retries - Number of retries (default: 3)
   * @param retryDelay - Delay between retries in ms (default: 2000)
   */
  async navigate(url: string, retries: number = 3, retryDelay: number = 2000): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: this.options.timeout,
        });

        this.emit('navigated', { url });
        logger.info(`Navigated to ${url}`);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.emit('error', lastError);

        // Check if it's a connection refused error - target might not be ready
        if (lastError.message.includes('ERR_CONNECTION_REFUSED') && attempt < retries) {
          logger.warn(`Connection refused, retrying in ${retryDelay}ms... (${attempt}/${retries})`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        throw lastError;
      }
    }

    throw lastError ?? new Error('Navigation failed');
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
