/**
 * Screen buffer management for TUI
 * @packageDocumentation
 */

import { stripAnsi } from '../../utils/colors.js';

/**
 * ANSI escape sequences
 */
export const ANSI = {
  /** Clear entire screen */
  clearScreen: '\x1b[2J',
  /** Clear from cursor to end of screen */
  clearToEnd: '\x1b[J',
  /** Clear current line */
  clearLine: '\x1b[2K',
  /** Move cursor to home (top-left) */
  home: '\x1b[H',
  /** Hide cursor */
  hideCursor: '\x1b[?25l',
  /** Show cursor */
  showCursor: '\x1b[?25h',
  /** Save cursor position */
  saveCursor: '\x1b[s',
  /** Restore cursor position */
  restoreCursor: '\x1b[u',
  /** Enable alternative screen buffer */
  altScreenOn: '\x1b[?1049h',
  /** Disable alternative screen buffer */
  altScreenOff: '\x1b[?1049l',
  /** Move cursor to position (1-indexed) */
  moveTo: (row: number, col: number): string => `\x1b[${row};${col}H`,
  /** Move cursor up n rows */
  moveUp: (n: number): string => `\x1b[${n}A`,
  /** Move cursor down n rows */
  moveDown: (n: number): string => `\x1b[${n}B`,
  /** Move cursor right n columns */
  moveRight: (n: number): string => `\x1b[${n}C`,
  /** Move cursor left n columns */
  moveLeft: (n: number): string => `\x1b[${n}D`,
};

/**
 * Screen buffer cell
 */
interface Cell {
  /** Character to display */
  char: string;
  /** Foreground color code */
  fg?: string;
  /** Background color code */
  bg?: string;
  /** Whether cell has been modified */
  dirty: boolean;
}

/**
 * Screen buffer for efficient terminal rendering
 */
export class ScreenBuffer {
  /** Buffer width */
  private width: number;

  /** Buffer height */
  private height: number;

  /** Current buffer */
  private buffer: Cell[][];

  /** Previous buffer for diff rendering */
  private prevBuffer: Cell[][] | null = null;

  /** Output stream */
  private output: NodeJS.WriteStream;

  /** Whether using alternative screen buffer */
  private altScreen: boolean = false;

  /**
   * Create a new screen buffer
   * @param width - Buffer width
   * @param height - Buffer height
   * @param output - Output stream
   */
  constructor(
    width?: number,
    height?: number,
    output: NodeJS.WriteStream = process.stdout
  ) {
    this.output = output;
    this.width = width ?? output.columns ?? 80;
    this.height = height ?? output.rows ?? 24;
    this.buffer = this.createBuffer();
  }

  /**
   * Create an empty buffer
   * @returns Empty buffer
   */
  private createBuffer(): Cell[][] {
    return Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => ({
        char: ' ',
        dirty: true,
      }))
    );
  }

  /**
   * Get buffer dimensions
   * @returns Width and height
   */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Resize the buffer
   * @param width - New width
   * @param height - New height
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.buffer = this.createBuffer();
    this.prevBuffer = null;
  }

  /**
   * Update buffer size from terminal
   */
  updateSize(): void {
    const newWidth = this.output.columns ?? 80;
    const newHeight = this.output.rows ?? 24;

    if (newWidth !== this.width || newHeight !== this.height) {
      this.resize(newWidth, newHeight);
    }
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    for (let y = 0; y < this.height; y++) {
      const row = this.buffer[y];
      if (row) {
        for (let x = 0; x < this.width; x++) {
          const cell = row[x];
          if (cell) {
            cell.char = ' ';
            cell.fg = undefined;
            cell.bg = undefined;
            cell.dirty = true;
          }
        }
      }
    }
  }

  /**
   * Write a character at a position
   * @param x - Column (0-indexed)
   * @param y - Row (0-indexed)
   * @param char - Character to write
   * @param fg - Foreground color
   * @param bg - Background color
   */
  writeChar(x: number, y: number, char: string, fg?: string, bg?: string): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }

    const row = this.buffer[y];
    if (!row) return;

    const cell = row[x];
    if (!cell) return;

    // Handle ANSI codes in char
    const cleanChar = stripAnsi(char);
    const charToWrite = cleanChar[0] ?? ' ';

    if (
      cell.char !== charToWrite ||
      cell.fg !== fg ||
      cell.bg !== bg
    ) {
      cell.char = charToWrite;
      cell.fg = fg;
      cell.bg = bg;
      cell.dirty = true;
    }
  }

  /**
   * Write a string at a position
   * @param x - Starting column
   * @param y - Row
   * @param text - Text to write (may contain ANSI codes)
   * @param maxWidth - Maximum width to write
   */
  writeText(x: number, y: number, text: string, maxWidth?: number): void {
    if (y < 0 || y >= this.height) {
      return;
    }

    const max = maxWidth ?? this.width - x;
    let col = x;

    // Parse text for ANSI codes
    let currentFg: string | undefined;
    let currentBg: string | undefined;
    let i = 0;

    while (i < text.length && col < x + max && col < this.width) {
      // Check for ANSI escape sequence
      if (text[i] === '\x1b' && text[i + 1] === '[') {
        // Find end of sequence
        let j = i + 2;
        while (j < text.length && text[j] !== 'm') {
          j++;
        }

        if (text[j] === 'm') {
          const code = text.slice(i, j + 1);
          // Parse color codes
          if (code.includes('0m')) {
            currentFg = undefined;
            currentBg = undefined;
          } else if (code.includes('3') || code.includes('9')) {
            currentFg = code;
          } else if (code.includes('4') || code.includes('10')) {
            currentBg = code;
          }
          i = j + 1;
          continue;
        }
      }

      const char = text[i];
      if (char !== undefined) {
        this.writeChar(col, y, char, currentFg, currentBg);
        col++;
      }
      i++;
    }

    // Fill remaining width with spaces if maxWidth specified
    if (maxWidth) {
      while (col < x + maxWidth && col < this.width) {
        this.writeChar(col, y, ' ');
        col++;
      }
    }
  }

  /**
   * Fill a region with a character
   * @param x - Starting column
   * @param y - Starting row
   * @param width - Region width
   * @param height - Region height
   * @param char - Character to fill with
   * @param fg - Foreground color
   * @param bg - Background color
   */
  fill(
    x: number,
    y: number,
    width: number,
    height: number,
    char: string = ' ',
    fg?: string,
    bg?: string
  ): void {
    for (let row = y; row < y + height && row < this.height; row++) {
      for (let col = x; col < x + width && col < this.width; col++) {
        this.writeChar(col, row, char, fg, bg);
      }
    }
  }

  /**
   * Render the buffer to the output stream
   * @param full - Force full redraw
   */
  render(full: boolean = false): void {
    let output = '';

    if (full || !this.prevBuffer) {
      // Full redraw
      output += ANSI.home;

      for (let y = 0; y < this.height; y++) {
        const row = this.buffer[y];
        if (!row) continue;

        let line = '';
        let lastFg: string | undefined;
        let lastBg: string | undefined;

        for (let x = 0; x < this.width; x++) {
          const cell = row[x];
          if (!cell) continue;

          // Add color codes if changed
          if (cell.fg !== lastFg) {
            line += cell.fg ?? '\x1b[0m';
            lastFg = cell.fg;
          }
          if (cell.bg !== lastBg) {
            line += cell.bg ?? '';
            lastBg = cell.bg;
          }

          line += cell.char;
          cell.dirty = false;
        }

        // Reset at end of line
        line += '\x1b[0m';

        if (y < this.height - 1) {
          line += '\n';
        }

        output += line;
      }
    } else {
      // Diff redraw - only update changed cells
      for (let y = 0; y < this.height; y++) {
        const row = this.buffer[y];
        const prevRow = this.prevBuffer[y];
        if (!row) continue;

        for (let x = 0; x < this.width; x++) {
          const cell = row[x];
          const prevCell = prevRow?.[x];

          if (
            cell?.dirty ||
            cell?.char !== prevCell?.char ||
            cell?.fg !== prevCell?.fg ||
            cell?.bg !== prevCell?.bg
          ) {
            if (cell) {
              output += ANSI.moveTo(y + 1, x + 1);
              if (cell.fg) output += cell.fg;
              if (cell.bg) output += cell.bg;
              output += cell.char;
              output += '\x1b[0m';
              cell.dirty = false;
            }
          }
        }
      }
    }

    if (output) {
      this.output.write(output);
    }

    // Save current buffer as previous
    this.prevBuffer = this.buffer.map((row) =>
      row.map((cell) => ({ ...cell }))
    );
  }

  /**
   * Enable alternative screen buffer
   */
  enableAltScreen(): void {
    if (!this.altScreen) {
      this.output.write(ANSI.altScreenOn + ANSI.hideCursor);
      this.altScreen = true;
    }
  }

  /**
   * Disable alternative screen buffer
   */
  disableAltScreen(): void {
    if (this.altScreen) {
      this.output.write(ANSI.altScreenOff + ANSI.showCursor);
      this.altScreen = false;
    }
  }

  /**
   * Hide the cursor
   */
  hideCursor(): void {
    this.output.write(ANSI.hideCursor);
  }

  /**
   * Show the cursor
   */
  showCursor(): void {
    this.output.write(ANSI.showCursor);
  }

  /**
   * Write directly to output (bypass buffer)
   * @param text - Text to write
   */
  writeRaw(text: string): void {
    this.output.write(text);
  }

  /**
   * Get a line from the buffer
   * @param y - Row index
   * @returns Line content
   */
  getLine(y: number): string {
    const row = this.buffer[y];
    if (!row) return '';
    return row.map((cell) => cell.char).join('');
  }

  /**
   * Get the entire buffer content as string
   * @returns Buffer content
   */
  getContent(): string {
    return this.buffer.map((row) => row.map((cell) => cell.char).join('')).join('\n');
  }
}
