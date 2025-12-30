/**
 * Keyboard input handling for TUI
 * @packageDocumentation
 */

import { EventEmitter } from '../../utils/event-emitter.js';

/**
 * Key event data
 */
export interface KeyEvent {
  /** Key name */
  name: string;
  /** Whether Ctrl was pressed */
  ctrl: boolean;
  /** Whether Alt/Meta was pressed */
  meta: boolean;
  /** Whether Shift was pressed */
  shift: boolean;
  /** Raw sequence */
  sequence: string;
}

/**
 * Input handler events
 */
export interface InputEvents {
  /** Index signature for EventMap compatibility */
  [key: string]: unknown;
  /** Emitted on any key press */
  key: KeyEvent;
  /** Emitted for specific keys */
  'key:up': KeyEvent;
  'key:down': KeyEvent;
  'key:left': KeyEvent;
  'key:right': KeyEvent;
  'key:enter': KeyEvent;
  'key:escape': KeyEvent;
  'key:tab': KeyEvent;
  'key:backspace': KeyEvent;
  'key:delete': KeyEvent;
  'key:home': KeyEvent;
  'key:end': KeyEvent;
  'key:pageup': KeyEvent;
  'key:pagedown': KeyEvent;
  'key:space': KeyEvent;
  /** Character input */
  char: string;
  /** Line input (after Enter) */
  line: string;
}

/**
 * Common key sequences
 */
const KEY_SEQUENCES: Record<string, Partial<KeyEvent>> = {
  // Arrow keys
  '\x1b[A': { name: 'up' },
  '\x1b[B': { name: 'down' },
  '\x1b[C': { name: 'right' },
  '\x1b[D': { name: 'left' },
  '\x1bOA': { name: 'up' },
  '\x1bOB': { name: 'down' },
  '\x1bOC': { name: 'right' },
  '\x1bOD': { name: 'left' },

  // Function keys
  '\x1bOP': { name: 'f1' },
  '\x1bOQ': { name: 'f2' },
  '\x1bOR': { name: 'f3' },
  '\x1bOS': { name: 'f4' },
  '\x1b[15~': { name: 'f5' },
  '\x1b[17~': { name: 'f6' },
  '\x1b[18~': { name: 'f7' },
  '\x1b[19~': { name: 'f8' },
  '\x1b[20~': { name: 'f9' },
  '\x1b[21~': { name: 'f10' },
  '\x1b[23~': { name: 'f11' },
  '\x1b[24~': { name: 'f12' },

  // Navigation
  '\x1b[H': { name: 'home' },
  '\x1b[F': { name: 'end' },
  '\x1b[1~': { name: 'home' },
  '\x1b[4~': { name: 'end' },
  '\x1b[5~': { name: 'pageup' },
  '\x1b[6~': { name: 'pagedown' },
  '\x1b[2~': { name: 'insert' },
  '\x1b[3~': { name: 'delete' },

  // Special keys
  // Note: \r, \n, \t, \b are same as ctrl+m, ctrl+j, ctrl+i, ctrl+h respectively
  // We handle them as enter/tab/backspace in the ctrl section below
  '\x1b': { name: 'escape' },
  '\x7f': { name: 'backspace' },
  ' ': { name: 'space' },

  // Ctrl combinations (some double as special keys)
  '\x01': { name: 'a', ctrl: true },
  '\x02': { name: 'b', ctrl: true },
  '\x03': { name: 'c', ctrl: true },
  '\x04': { name: 'd', ctrl: true },
  '\x05': { name: 'e', ctrl: true },
  '\x06': { name: 'f', ctrl: true },
  '\x07': { name: 'g', ctrl: true },
  '\x08': { name: 'backspace' }, // ctrl+h / backspace
  '\x09': { name: 'tab' }, // ctrl+i / tab
  '\x0a': { name: 'enter' }, // ctrl+j / newline
  '\x0b': { name: 'k', ctrl: true },
  '\x0c': { name: 'l', ctrl: true },
  '\x0d': { name: 'enter' }, // ctrl+m / carriage return
  '\x0e': { name: 'n', ctrl: true },
  '\x0f': { name: 'o', ctrl: true },
  '\x10': { name: 'p', ctrl: true },
  '\x11': { name: 'q', ctrl: true },
  '\x12': { name: 'r', ctrl: true },
  '\x13': { name: 's', ctrl: true },
  '\x14': { name: 't', ctrl: true },
  '\x15': { name: 'u', ctrl: true },
  '\x16': { name: 'v', ctrl: true },
  '\x17': { name: 'w', ctrl: true },
  '\x18': { name: 'x', ctrl: true },
  '\x19': { name: 'y', ctrl: true },
  '\x1a': { name: 'z', ctrl: true },
};

/**
 * Input handler for terminal keyboard input
 */
export class InputHandler extends EventEmitter<InputEvents> {
  /** Input stream */
  private input: NodeJS.ReadStream;

  /** Whether raw mode is enabled */
  private rawMode: boolean = false;

  /** Line buffer for line mode */
  private lineBuffer: string = '';

  /** Bound data handler */
  private dataHandler: (data: Buffer) => void;

  /**
   * Create a new input handler
   * @param input - Input stream (defaults to process.stdin)
   */
  constructor(input: NodeJS.ReadStream = process.stdin) {
    super();
    this.input = input;
    this.dataHandler = this.handleData.bind(this);
  }

  /**
   * Start listening for input
   * @param rawMode - Enable raw mode for immediate key events
   */
  start(rawMode: boolean = true): void {
    if (rawMode && this.input.isTTY) {
      this.input.setRawMode(true);
      this.rawMode = true;
    }

    this.input.resume();
    this.input.setEncoding('utf8');
    this.input.on('data', this.dataHandler);
  }

  /**
   * Stop listening for input
   */
  stop(): void {
    this.input.removeListener('data', this.dataHandler);
    this.input.pause();

    if (this.rawMode && this.input.isTTY) {
      this.input.setRawMode(false);
      this.rawMode = false;
    }
  }

  /**
   * Handle incoming data
   * @param data - Input data
   */
  private handleData(data: Buffer): void {
    const str = data.toString('utf8');

    // Try to match known sequences
    let i = 0;
    while (i < str.length) {
      let matched = false;

      // Try escape sequences (longest first)
      for (const [seq, keyData] of Object.entries(KEY_SEQUENCES)) {
        if (str.startsWith(seq, i)) {
          const event = this.createKeyEvent(seq, keyData);
          this.emitKey(event);
          i += seq.length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Single character
        const char = str[i];
        if (char !== undefined) {
          const event = this.createKeyEvent(char, { name: char });
          this.emitKey(event);

          // Also emit char event for printable characters
          if (char.length === 1 && char >= ' ' && char <= '~') {
            this.emit('char', char);

            // Handle line mode
            if (!this.rawMode) {
              if (char === '\r' || char === '\n') {
                this.emit('line', this.lineBuffer);
                this.lineBuffer = '';
              } else {
                this.lineBuffer += char;
              }
            }
          }
        }
        i++;
      }
    }
  }

  /**
   * Create a key event
   * @param sequence - Key sequence
   * @param data - Partial key data
   * @returns Complete key event
   */
  private createKeyEvent(sequence: string, data: Partial<KeyEvent>): KeyEvent {
    return {
      name: data.name ?? sequence,
      ctrl: data.ctrl ?? false,
      meta: data.meta ?? false,
      shift: data.shift ?? false,
      sequence,
    };
  }

  /**
   * Emit key events
   * @param event - Key event
   */
  private emitKey(event: KeyEvent): void {
    this.emit('key', event);

    // Emit specific key event
    const specificEvent = `key:${event.name}` as keyof InputEvents;
    if (specificEvent in this.listeners) {
      // @ts-expect-error - dynamic event name
      this.emit(specificEvent, event);
    }
  }

  /**
   * Check if a key matches
   * @param event - Key event
   * @param key - Key to match (e.g., 'q', 'ctrl+c', 'escape')
   * @returns true if matches
   */
  static matches(event: KeyEvent, key: string): boolean {
    const parts = key.toLowerCase().split('+');
    const keyName = parts[parts.length - 1];
    const wantCtrl = parts.includes('ctrl');
    const wantMeta = parts.includes('meta') || parts.includes('alt');
    const wantShift = parts.includes('shift');

    return (
      event.name.toLowerCase() === keyName &&
      event.ctrl === wantCtrl &&
      event.meta === wantMeta &&
      event.shift === wantShift
    );
  }

  /**
   * Wait for a specific key
   * @param key - Key to wait for
   * @param timeout - Optional timeout in ms
   * @returns Promise that resolves when key is pressed
   */
  waitForKey(key: string, timeout?: number): Promise<KeyEvent> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;

      const handler = (event: KeyEvent): void => {
        if (InputHandler.matches(event, key)) {
          if (timeoutId) clearTimeout(timeoutId);
          this.off('key', handler);
          resolve(event);
        }
      };

      this.on('key', handler);

      if (timeout) {
        timeoutId = setTimeout(() => {
          this.off('key', handler);
          reject(new Error(`Timeout waiting for key: ${key}`));
        }, timeout);
      }
    });
  }

  /**
   * Wait for any key
   * @param timeout - Optional timeout in ms
   * @returns Promise that resolves with the pressed key
   */
  waitForAnyKey(timeout?: number): Promise<KeyEvent> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;

      const handler = (event: KeyEvent): void => {
        if (timeoutId) clearTimeout(timeoutId);
        this.off('key', handler);
        resolve(event);
      };

      this.once('key', handler);

      if (timeout) {
        timeoutId = setTimeout(() => {
          this.off('key', handler);
          reject(new Error('Timeout waiting for key'));
        }, timeout);
      }
    });
  }

  /**
   * Wait for a line of input
   * @param timeout - Optional timeout in ms
   * @returns Promise that resolves with the input line
   */
  waitForLine(timeout?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;

      const handler = (line: string): void => {
        if (timeoutId) clearTimeout(timeoutId);
        this.off('line', handler);
        resolve(line);
      };

      this.once('line', handler);

      if (timeout) {
        timeoutId = setTimeout(() => {
          this.off('line', handler);
          reject(new Error('Timeout waiting for input'));
        }, timeout);
      }
    });
  }
}

/**
 * Key bindings manager
 */
export class KeyBindings {
  /** Registered bindings */
  private bindings: Map<string, () => void | Promise<void>> = new Map();

  /** Input handler */
  private input: InputHandler;

  /**
   * Create key bindings manager
   * @param input - Input handler
   */
  constructor(input: InputHandler) {
    this.input = input;
    this.input.on('key', this.handleKey.bind(this));
  }

  /**
   * Register a key binding
   * @param key - Key combination (e.g., 'q', 'ctrl+c')
   * @param handler - Handler function
   */
  bind(key: string, handler: () => void | Promise<void>): void {
    this.bindings.set(key.toLowerCase(), handler);
  }

  /**
   * Remove a key binding
   * @param key - Key combination
   */
  unbind(key: string): void {
    this.bindings.delete(key.toLowerCase());
  }

  /**
   * Clear all bindings
   */
  clear(): void {
    this.bindings.clear();
  }

  /**
   * Handle key press
   * @param event - Key event
   */
  private handleKey(event: KeyEvent): void {
    for (const [key, handler] of this.bindings) {
      if (InputHandler.matches(event, key)) {
        const result = handler();
        if (result instanceof Promise) {
          result.catch((err: unknown) => {
            console.error('Key handler error:', err);
          });
        }
        break;
      }
    }
  }
}
