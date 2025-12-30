/**
 * WebSocket server implementation (zero dependencies)
 * @packageDocumentation
 */

import { createServer, type Server, type IncomingMessage } from 'node:http';
import { createHash } from 'node:crypto';
import { EventEmitter } from '../utils/event-emitter.js';
import type { BrowserMessage, CLIMessage } from '../types.js';

/**
 * WebSocket frame opcodes
 */
const OPCODE = {
  CONTINUATION: 0x0,
  TEXT: 0x1,
  BINARY: 0x2,
  CLOSE: 0x8,
  PING: 0x9,
  PONG: 0xa,
} as const;

/**
 * WebSocket GUID for handshake
 */
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/**
 * WebSocket client connection
 */
export class WebSocketClient extends EventEmitter<{
  message: string;
  binary: Buffer;
  close: { code: number; reason: string };
  error: Error;
  pong: void;
}> {
  /** Socket connection */
  private socket: import('node:net').Socket;

  /** Whether connection is open */
  private isOpen: boolean = true;

  /** Partial frame buffer */
  private frameBuffer: Buffer = Buffer.alloc(0);

  /**
   * Create a new WebSocket client
   * @param socket - TCP socket
   */
  constructor(socket: import('node:net').Socket) {
    super();
    this.socket = socket;
    this.setupSocketHandlers();
  }

  /**
   * Set up socket event handlers
   */
  private setupSocketHandlers(): void {
    this.socket.on('data', (data) => {
      this.frameBuffer = Buffer.concat([this.frameBuffer, data]);
      this.processFrames();
    });

    this.socket.on('close', () => {
      this.isOpen = false;
      this.emit('close', { code: 1000, reason: 'Connection closed' });
    });

    this.socket.on('error', (error) => {
      this.emit('error', error);
    });
  }

  /**
   * Process received frames
   */
  private processFrames(): void {
    while (this.frameBuffer.length >= 2) {
      const frame = this.parseFrame();
      if (!frame) break;

      switch (frame.opcode) {
        case OPCODE.TEXT:
          this.emit('message', frame.payload.toString('utf8'));
          break;
        case OPCODE.BINARY:
          this.emit('binary', frame.payload);
          break;
        case OPCODE.CLOSE:
          this.handleClose(frame.payload);
          break;
        case OPCODE.PING:
          this.sendPong(frame.payload);
          break;
        case OPCODE.PONG:
          this.emit('pong', undefined);
          break;
      }
    }
  }

  /**
   * Parse a WebSocket frame
   * @returns Parsed frame or null if incomplete
   */
  private parseFrame(): { opcode: number; payload: Buffer } | null {
    if (this.frameBuffer.length < 2) return null;

    const firstByte = this.frameBuffer[0]!;
    const secondByte = this.frameBuffer[1]!;

    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) !== 0;
    let payloadLength = secondByte & 0x7f;
    let offset = 2;

    // Extended payload length
    if (payloadLength === 126) {
      if (this.frameBuffer.length < 4) return null;
      payloadLength = this.frameBuffer.readUInt16BE(2);
      offset = 4;
    } else if (payloadLength === 127) {
      if (this.frameBuffer.length < 10) return null;
      // For simplicity, we only handle 32-bit lengths
      payloadLength = this.frameBuffer.readUInt32BE(6);
      offset = 10;
    }

    // Masking key
    let maskingKey: Buffer | null = null;
    if (masked) {
      if (this.frameBuffer.length < offset + 4) return null;
      maskingKey = this.frameBuffer.subarray(offset, offset + 4);
      offset += 4;
    }

    // Check if we have the full payload
    if (this.frameBuffer.length < offset + payloadLength) return null;

    // Extract payload
    let payload = this.frameBuffer.subarray(offset, offset + payloadLength);

    // Unmask if needed
    if (masked && maskingKey) {
      payload = Buffer.from(payload);
      for (let i = 0; i < payload.length; i++) {
        payload[i] = payload[i]! ^ maskingKey[i % 4]!;
      }
    }

    // Remove processed frame from buffer
    this.frameBuffer = this.frameBuffer.subarray(offset + payloadLength);

    return { opcode, payload };
  }

  /**
   * Handle close frame
   * @param payload - Close frame payload
   */
  private handleClose(payload: Buffer): void {
    let code = 1000;
    let reason = '';

    if (payload.length >= 2) {
      code = payload.readUInt16BE(0);
      reason = payload.subarray(2).toString('utf8');
    }

    this.close(code, reason);
    this.emit('close', { code, reason });
  }

  /**
   * Send a pong frame
   * @param payload - Pong payload (echo of ping)
   */
  private sendPong(payload: Buffer): void {
    this.sendFrame(OPCODE.PONG, payload);
  }

  /**
   * Send a WebSocket frame
   * @param opcode - Frame opcode
   * @param payload - Frame payload
   */
  private sendFrame(opcode: number, payload: Buffer | string): void {
    if (!this.isOpen) return;

    const data = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;
    const length = data.length;

    let header: Buffer;

    if (length < 126) {
      header = Buffer.alloc(2);
      header[0] = 0x80 | opcode; // FIN + opcode
      header[1] = length;
    } else if (length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeUInt32BE(0, 2); // High 32 bits (0 for our purposes)
      header.writeUInt32BE(length, 6);
    }

    this.socket.write(Buffer.concat([header, data]));
  }

  /**
   * Send a text message
   * @param message - Message to send
   */
  send(message: string): void {
    this.sendFrame(OPCODE.TEXT, message);
  }

  /**
   * Send a binary message
   * @param data - Binary data to send
   */
  sendBinary(data: Buffer): void {
    this.sendFrame(OPCODE.BINARY, data);
  }

  /**
   * Send a ping frame
   * @param payload - Optional ping payload
   */
  ping(payload: Buffer = Buffer.alloc(0)): void {
    this.sendFrame(OPCODE.PING, payload);
  }

  /**
   * Close the connection
   * @param code - Close code
   * @param reason - Close reason
   */
  close(code: number = 1000, reason: string = ''): void {
    if (!this.isOpen) return;

    const reasonBuffer = Buffer.from(reason, 'utf8');
    const payload = Buffer.alloc(2 + reasonBuffer.length);
    payload.writeUInt16BE(code, 0);
    reasonBuffer.copy(payload, 2);

    this.sendFrame(OPCODE.CLOSE, payload);
    this.isOpen = false;

    // Give time for close frame to be sent
    setTimeout(() => {
      this.socket.end();
    }, 100);
  }

  /**
   * Check if connection is open
   * @returns true if open
   */
  isConnected(): boolean {
    return this.isOpen;
  }
}

/**
 * WebSocket server events
 */
export interface WebSocketServerEvents {
  /** Index signature for EventMap compatibility */
  [key: string]: unknown;
  connection: WebSocketClient;
  error: Error;
  listening: { port: number };
  close: void;
}

/**
 * WebSocket server
 */
export class WebSocketServer extends EventEmitter<WebSocketServerEvents> {
  /** HTTP server */
  private server: Server;

  /** Connected clients */
  private clients: Set<WebSocketClient> = new Set();

  /** Server port */
  private port: number;

  /**
   * Create a new WebSocket server
   * @param port - Port to listen on
   */
  constructor(port: number) {
    super();
    this.port = port;
    this.server = createServer();
    this.setupServer();
  }

  /**
   * Set up HTTP server for WebSocket upgrade
   */
  private setupServer(): void {
    this.server.on('upgrade', (req, socket, head) => {
      this.handleUpgrade(req, socket as import('node:net').Socket, head);
    });

    this.server.on('error', (error) => {
      this.emit('error', error);
    });

    this.server.on('close', () => {
      this.emit('close', undefined);
    });
  }

  /**
   * Handle WebSocket upgrade request
   * @param req - HTTP request
   * @param socket - TCP socket
   * @param head - Upgrade head
   */
  private handleUpgrade(req: IncomingMessage, socket: import('node:net').Socket, head: Buffer): void {
    // Verify WebSocket upgrade
    const upgrade = req.headers['upgrade'];
    if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
      socket.destroy();
      return;
    }

    // Get WebSocket key
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    // Generate accept key
    const acceptKey = this.generateAcceptKey(key);

    // Send upgrade response
    const response = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '',
      '',
    ].join('\r\n');

    socket.write(response);

    // Handle any remaining data from upgrade
    if (head.length > 0) {
      socket.unshift(head);
    }

    // Create WebSocket client
    const client = new WebSocketClient(socket);
    this.clients.add(client);

    client.on('close', () => {
      this.clients.delete(client);
    });

    this.emit('connection', client);
  }

  /**
   * Generate WebSocket accept key
   * @param key - Client key
   * @returns Accept key
   */
  private generateAcceptKey(key: string): string {
    return createHash('sha1').update(key + WS_GUID).digest('base64');
  }

  /**
   * Start the server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.port, () => {
        this.server.removeListener('error', reject);
        this.emit('listening', { port: this.port });
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      // Close all clients
      for (const client of this.clients) {
        client.close(1001, 'Server shutting down');
      }
      this.clients.clear();

      // Close server
      this.server.close(() => {
        resolve();
      });
    });
  }

  /**
   * Broadcast message to all clients
   * @param message - Message to broadcast
   */
  broadcast(message: string): void {
    for (const client of this.clients) {
      if (client.isConnected()) {
        client.send(message);
      }
    }
  }

  /**
   * Broadcast CLI message to all clients
   * @param message - CLI message to broadcast
   */
  broadcastCLIMessage(message: CLIMessage): void {
    this.broadcast(JSON.stringify(message));
  }

  /**
   * Get connected client count
   * @returns Number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get all connected clients
   * @returns Array of connected clients
   */
  getClients(): WebSocketClient[] {
    return Array.from(this.clients);
  }
}

/**
 * Create a typed message handler
 * @param client - WebSocket client
 * @param handler - Message handler function
 */
export function handleBrowserMessages(
  client: WebSocketClient,
  handler: (message: BrowserMessage) => void
): void {
  client.on('message', (data) => {
    try {
      const message = JSON.parse(data) as BrowserMessage;
      handler(message);
    } catch (error) {
      // Invalid JSON, ignore
    }
  });
}
