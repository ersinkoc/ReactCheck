/**
 * WebUI server for real-time dashboard
 * @packageDocumentation
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import { EventEmitter } from '../utils/event-emitter.js';
import type { ComponentStats, SessionSummary, RenderChainInfo, RenderInfo } from '../types.js';
import { generateDashboardHTML } from './dashboard.js';

/**
 * WebSocket frame opcodes
 */
const OPCODE = {
  TEXT: 0x1,
  CLOSE: 0x8,
  PING: 0x9,
  PONG: 0xa,
} as const;

/**
 * WebSocket GUID for handshake
 */
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/**
 * Dashboard state sent to clients
 */
export interface DashboardState {
  target: string;
  startTime: number;
  scanning: boolean;
  paused: boolean;
  fps: number;
  summary: SessionSummary;
  components: ComponentStats[];
  chains: RenderChainInfo[];
  recentRenders: RenderInfo[];
}

/**
 * Dashboard message types
 */
export type DashboardMessage =
  | { type: 'state'; payload: DashboardState }
  | { type: 'summary-update'; payload: SessionSummary }
  | { type: 'component-update'; payload: ComponentStats }
  | { type: 'render-event'; payload: RenderInfo }
  | { type: 'chain-detected'; payload: RenderChainInfo }
  | { type: 'scanning-status'; payload: { scanning: boolean; paused: boolean } };

/**
 * WebUI server events
 */
interface WebUIServerEvents {
  [key: string]: unknown;
  listening: number;
  error: Error;
  close: void;
  'client-connected': void;
  'client-disconnected': void;
}

/**
 * Dashboard WebSocket client
 */
class DashboardClient {
  private socket: import('node:net').Socket;
  private isOpen: boolean = true;

  constructor(socket: import('node:net').Socket) {
    this.socket = socket;
    this.socket.on('close', () => {
      this.isOpen = false;
    });
    this.socket.on('error', () => {
      this.isOpen = false;
    });
  }

  /**
   * Send a message to the client
   */
  send(message: DashboardMessage): void {
    if (!this.isOpen) return;

    try {
      const data = JSON.stringify(message);
      const frame = this.createFrame(data);
      this.socket.write(frame);
    } catch {
      // Ignore send errors
    }
  }

  /**
   * Create a WebSocket frame
   */
  private createFrame(data: string): Buffer {
    const payload = Buffer.from(data, 'utf8');
    const length = payload.length;

    let frame: Buffer;
    if (length < 126) {
      frame = Buffer.alloc(2 + length);
      frame[0] = 0x81; // FIN + TEXT opcode
      frame[1] = length;
      payload.copy(frame, 2);
    } else if (length < 65536) {
      frame = Buffer.alloc(4 + length);
      frame[0] = 0x81;
      frame[1] = 126;
      frame.writeUInt16BE(length, 2);
      payload.copy(frame, 4);
    } else {
      frame = Buffer.alloc(10 + length);
      frame[0] = 0x81;
      frame[1] = 127;
      frame.writeBigUInt64BE(BigInt(length), 2);
      payload.copy(frame, 10);
    }

    return frame;
  }

  /**
   * Close the connection
   */
  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;

    try {
      // Send close frame
      const frame = Buffer.alloc(2);
      frame[0] = 0x88; // FIN + CLOSE opcode
      frame[1] = 0;
      this.socket.write(frame);
      this.socket.end();
    } catch {
      // Ignore close errors
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.isOpen;
  }
}

/**
 * WebUI server for real-time dashboard
 */
export class WebUIServer extends EventEmitter<WebUIServerEvents> {
  private server: Server | null = null;
  private clients: Set<DashboardClient> = new Set();
  private port: number;
  private target: string;
  private currentState: DashboardState;

  constructor(port: number = 3199, target: string = '') {
    super();
    this.port = port;
    this.target = target;
    this.currentState = this.createInitialState();
  }

  /**
   * Create initial dashboard state
   */
  private createInitialState(): DashboardState {
    return {
      target: this.target,
      startTime: Date.now(),
      scanning: false,
      paused: false,
      fps: 60,
      summary: {
        totalComponents: 0,
        totalRenders: 0,
        criticalIssues: 0,
        warnings: 0,
        healthy: 0,
        avgFps: 60,
        minFps: 60,
        unnecessaryRenders: 0,
      },
      components: [],
      chains: [],
      recentRenders: [],
    };
  }

  /**
   * Start the server
   */
  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleHttpRequest(req, res);
      });

      this.server.on('upgrade', (req, socket, head) => {
        this.handleUpgrade(req, socket as import('node:net').Socket);
      });

      this.server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          // Try next port
          this.port++;
          this.server?.close();
          this.start().then(resolve).catch(reject);
        } else {
          this.emit('error', error);
          reject(error);
        }
      });

      this.server.listen(this.port, () => {
        this.emit('listening', this.port);
        resolve(this.port);
      });
    });
  }

  /**
   * Stop the server
   */
  stop(): void {
    // Close all clients
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();

    // Close server
    if (this.server) {
      this.server.close();
      this.server = null;
    }

    this.emit('close', undefined);
  }

  /**
   * Handle HTTP requests
   */
  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url ?? '/';

    if (url === '/' || url === '/index.html') {
      // Serve dashboard HTML
      const html = generateDashboardHTML(this.port, this.target);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(html);
    } else if (url === '/health') {
      // Health check endpoint
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', clients: this.clients.size }));
    } else {
      // 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }

  /**
   * Handle WebSocket upgrade
   */
  private handleUpgrade(req: IncomingMessage, socket: import('node:net').Socket): void {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    // Calculate accept key
    const acceptKey = createHash('sha1')
      .update(key + WS_GUID)
      .digest('base64');

    // Send handshake response
    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '',
      '',
    ].join('\r\n');

    socket.write(headers);

    // Create client
    const client = new DashboardClient(socket);
    this.clients.add(client);
    this.emit('client-connected', undefined);

    // Send current state
    client.send({ type: 'state', payload: this.currentState });

    // Handle disconnect
    socket.on('close', () => {
      this.clients.delete(client);
      this.emit('client-disconnected', undefined);
    });

    // Handle incoming messages (ping/pong)
    socket.on('data', (data) => {
      this.handleClientData(client, socket, data);
    });
  }

  /**
   * Handle data from client
   */
  private handleClientData(
    client: DashboardClient,
    socket: import('node:net').Socket,
    data: Buffer
  ): void {
    if (data.length < 2) return;

    const opcode = data[0] & 0x0f;

    if (opcode === OPCODE.PING) {
      // Respond with pong
      const pong = Buffer.alloc(2);
      pong[0] = 0x8a; // FIN + PONG
      pong[1] = 0;
      socket.write(pong);
    } else if (opcode === OPCODE.CLOSE) {
      this.clients.delete(client);
      client.close();
    }
  }

  /**
   * Update target URL
   */
  setTarget(target: string): void {
    this.target = target;
    this.currentState.target = target;
  }

  /**
   * Update scanning status
   */
  setScanning(scanning: boolean, paused: boolean = false): void {
    this.currentState.scanning = scanning;
    this.currentState.paused = paused;
    this.broadcast({ type: 'scanning-status', payload: { scanning, paused } });
  }

  /**
   * Update summary
   */
  updateSummary(summary: SessionSummary): void {
    this.currentState.summary = summary;
    this.broadcast({ type: 'summary-update', payload: summary });
  }

  /**
   * Update components
   */
  updateComponents(components: ComponentStats[]): void {
    this.currentState.components = components;
    // Broadcast full state periodically for component updates
    // Individual component updates are handled by updateComponent
  }

  /**
   * Update FPS
   */
  updateFps(fps: number): void {
    this.currentState.fps = fps;
    // FPS is included in full state broadcasts
  }

  /**
   * Broadcast components to all clients (for batch updates)
   */
  broadcastComponents(): void {
    for (const component of this.currentState.components) {
      this.broadcast({ type: 'component-update', payload: component });
    }
  }

  /** Last render broadcast time */
  private lastRenderBroadcast: number = 0;

  /**
   * Add render event
   */
  addRenderEvent(render: RenderInfo): void {
    // Keep only last 50 renders
    this.currentState.recentRenders.unshift(render);
    if (this.currentState.recentRenders.length > 50) {
      this.currentState.recentRenders.pop();
    }

    // Throttle render broadcasts to max 10 per second
    const now = Date.now();
    if (now - this.lastRenderBroadcast >= 100) {
      this.lastRenderBroadcast = now;
      this.broadcast({ type: 'render-event', payload: render });
    }
  }

  /**
   * Add chain detected
   */
  addChain(chain: RenderChainInfo): void {
    this.currentState.chains.unshift(chain);
    if (this.currentState.chains.length > 20) {
      this.currentState.chains.pop();
    }
    this.broadcast({ type: 'chain-detected', payload: chain });
  }

  /**
   * Update component
   */
  updateComponent(component: ComponentStats): void {
    const index = this.currentState.components.findIndex(c => c.name === component.name);
    if (index >= 0) {
      this.currentState.components[index] = component;
    } else {
      this.currentState.components.push(component);
    }
    this.broadcast({ type: 'component-update', payload: component });
  }

  /**
   * Broadcast full state to all clients
   */
  broadcastState(): void {
    this.broadcast({ type: 'state', payload: this.currentState });
  }

  /**
   * Broadcast message to all clients
   */
  private broadcast(message: DashboardMessage): void {
    for (const client of this.clients) {
      if (client.isConnected()) {
        client.send(message);
      } else {
        this.clients.delete(client);
      }
    }
  }

  /**
   * Get current port
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Get client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get dashboard URL
   */
  getUrl(): string {
    return `http://localhost:${this.port}`;
  }
}
