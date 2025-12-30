/**
 * HTTP proxy server for script injection
 * @packageDocumentation
 */

import {
  createServer,
  request as httpRequest,
  type Server,
  type IncomingMessage,
  type ServerResponse,
  type RequestOptions,
} from 'node:http';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';
import { EventEmitter } from '../utils/event-emitter.js';
import { Logger, LogLevel } from '../utils/logger.js';

const logger = new Logger({ prefix: 'proxy', level: LogLevel.DEBUG });

/**
 * Proxy server events
 */
export interface ProxyServerEvents {
  /** Index signature for EventMap compatibility */
  [key: string]: unknown;
  /** Server started listening */
  listening: { port: number };
  /** Request received */
  request: { url: string; method: string };
  /** HTML page served with injection */
  inject: { url: string };
  /** Error occurred */
  error: Error;
  /** Server closed */
  close: void;
}

/**
 * Proxy server options
 */
export interface ProxyOptions {
  /** Target URL to proxy */
  target: string;
  /** Port to listen on */
  port: number;
  /** WebSocket port for injection script */
  wsPort: number;
  /** Injection script content (optional, will use built-in if not provided) */
  injectionScript?: string;
}

/**
 * HTTP proxy server that injects ReactCheck scanner into HTML pages
 */
export class ProxyServer extends EventEmitter<ProxyServerEvents> {
  /** HTTP server instance */
  private server: Server;

  /** Proxy options */
  private options: ProxyOptions;

  /** Target URL parsed */
  private targetUrl: URL;

  /** Injection script */
  private injectionScript: string;

  /**
   * Create a new proxy server
   * @param options - Proxy options
   */
  constructor(options: ProxyOptions) {
    super();
    this.options = options;
    this.targetUrl = new URL(options.target);

    // Build injection script
    this.injectionScript = options.injectionScript ?? this.buildInjectionScript();

    // Create server
    this.server = createServer((req, res) => {
      this.handleRequest(req, res).catch((error) => {
        logger.error('Request handling error:', error);
        this.emit('error', error as Error);
        res.statusCode = 500;
        res.end('Internal Server Error');
      });
    });

    this.server.on('error', (error) => {
      this.emit('error', error);
    });
  }

  /**
   * Build the injection script
   * @returns Injection script string
   */
  private buildInjectionScript(): string {
    const { wsPort } = this.options;

    return `
(function() {
  if (window.__REACTCHECK_INJECTED__) return;
  window.__REACTCHECK_INJECTED__ = true;
  window.__REACTCHECK_PORT__ = ${wsPort};

  // Load the main scanner script
  const script = document.createElement('script');
  script.src = '/__reactcheck__/scanner.js';
  script.async = true;
  document.head.appendChild(script);

  // Fallback: Connect WebSocket directly if script fails to load
  script.onerror = function() {
    console.warn('[ReactCheck] Failed to load scanner script, using minimal mode');
    connectWebSocket();
  };

  function connectWebSocket() {
    const ws = new WebSocket('ws://localhost:${wsPort}');

    ws.onopen = function() {
      ws.send(JSON.stringify({
        type: 'ready',
        payload: { reactVersion: detectReactVersion() }
      }));
    };

    ws.onmessage = function(event) {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch (e) {}
    };

    ws.onerror = function(error) {
      console.error('[ReactCheck] WebSocket error:', error);
    };

    ws.onclose = function() {
      // Try to reconnect after 2 seconds
      setTimeout(connectWebSocket, 2000);
    };
  }

  function detectReactVersion() {
    if (window.React && window.React.version) {
      return window.React.version;
    }
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const renderers = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers;
      if (renderers && renderers.size > 0) {
        const renderer = renderers.values().next().value;
        if (renderer && renderer.version) {
          return renderer.version;
        }
      }
    }
    return 'unknown';
  }

  function handleMessage(msg) {
    switch (msg.type) {
      case 'start':
        console.log('[ReactCheck] Scanning started');
        break;
      case 'stop':
        console.log('[ReactCheck] Scanning stopped');
        break;
      case 'config':
        console.log('[ReactCheck] Config updated:', msg.payload);
        break;
    }
  }
})();
`;
  }

  /**
   * Handle incoming request
   * @param req - Client request
   * @param res - Server response
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const requestUrl = req.url ?? '/';

    // Handle special ReactCheck routes
    if (requestUrl.startsWith('/__reactcheck__/')) {
      this.handleReactCheckRoute(requestUrl, res);
      return;
    }

    this.emit('request', { url: requestUrl, method: req.method ?? 'GET' });

    // Build target URL
    const targetUrl = new URL(requestUrl, this.targetUrl);

    // Proxy the request
    await this.proxyRequest(req, res, targetUrl);
  }

  /**
   * Handle ReactCheck special routes
   * @param url - Request URL
   * @param res - Server response
   */
  private handleReactCheckRoute(url: string, res: ServerResponse): void {
    if (url === '/__reactcheck__/scanner.js') {
      // Serve the browser scanner script
      res.writeHead(200, {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache',
      });
      // In production, this would serve the bundled browser-inject.js
      res.end('// ReactCheck Scanner - loaded from proxy');
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  }

  /**
   * Proxy a request to the target
   * @param req - Client request
   * @param res - Server response
   * @param targetUrl - Target URL
   */
  private proxyRequest(
    req: IncomingMessage,
    res: ServerResponse,
    targetUrl: URL
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const isHttps = targetUrl.protocol === 'https:';
      const requestFn = isHttps ? httpsRequest : httpRequest;

      // Build headers without accept-encoding (don't request compressed responses)
      const headers: Record<string, string | string[] | undefined> = { ...req.headers };
      delete headers['accept-encoding'];
      headers['host'] = targetUrl.host;

      // Build request options
      const options: RequestOptions = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: req.method,
        headers,
      };

      const proxyReq = requestFn(options, (proxyRes) => {
        const contentType = proxyRes.headers['content-type'] ?? '';

        // Check if this is HTML
        if (contentType.includes('text/html')) {
          this.injectAndRespond(proxyRes, res, targetUrl.href);
          resolve();
          return;
        }

        // Pass through non-HTML responses
        res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
        proxyRes.pipe(res);
        proxyRes.on('end', resolve);
      });

      proxyReq.on('error', (error) => {
        logger.error('Proxy request error:', error);
        reject(error);
      });

      // Pipe request body
      req.pipe(proxyReq);
    });
  }

  /**
   * Inject script and respond with modified HTML
   * @param proxyRes - Proxy response
   * @param res - Client response
   * @param url - Request URL
   */
  private injectAndRespond(
    proxyRes: IncomingMessage,
    res: ServerResponse,
    url: string
  ): void {
    const chunks: Buffer[] = [];

    proxyRes.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    proxyRes.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf-8');

      // Inject script before </body> or </head>
      let injected: string;
      const scriptTag = `<script>${this.injectionScript}</script>`;

      if (body.includes('</body>')) {
        injected = body.replace('</body>', `${scriptTag}</body>`);
      } else if (body.includes('</head>')) {
        injected = body.replace('</head>', `${scriptTag}</head>`);
      } else {
        // Append to end
        injected = body + scriptTag;
      }

      this.emit('inject', { url });

      // Build response headers
      const headers: Record<string, string | number> = {};
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (key.toLowerCase() !== 'content-length' && value !== undefined) {
          headers[key] = Array.isArray(value) ? value.join(', ') : value;
        }
      }
      headers['content-length'] = Buffer.byteLength(injected);

      res.writeHead(proxyRes.statusCode ?? 200, headers);
      res.end(injected);
    });

    proxyRes.on('error', (error) => {
      logger.error('Proxy response error:', error);
      res.writeHead(502);
      res.end('Bad Gateway');
    });
  }

  /**
   * Start the proxy server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.options.port, () => {
        this.server.removeListener('error', reject);
        this.emit('listening', { port: this.options.port });
        logger.info(`Proxy server listening on http://localhost:${this.options.port}`);
        logger.info(`Proxying to ${this.options.target}`);
        resolve();
      });
    });
  }

  /**
   * Stop the proxy server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        this.emit('close', undefined);
        resolve();
      });
    });
  }

  /**
   * Get the proxy URL
   * @returns Local proxy URL
   */
  getProxyUrl(): string {
    return `http://localhost:${this.options.port}`;
  }

  /**
   * Update injection script
   * @param script - New injection script
   */
  setInjectionScript(script: string): void {
    this.injectionScript = script;
  }
}
