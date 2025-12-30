/**
 * Box drawing utilities for TUI
 * @packageDocumentation
 */

import type { ScreenBuffer } from './screen.js';
import { colors, visibleLength } from '../../utils/colors.js';

/**
 * Box drawing characters (Unicode)
 */
export const BoxChars = {
  // Single line
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  leftT: '├',
  rightT: '┤',
  topT: '┬',
  bottomT: '┴',
  cross: '┼',

  // Double line
  dTopLeft: '╔',
  dTopRight: '╗',
  dBottomLeft: '╚',
  dBottomRight: '╝',
  dHorizontal: '═',
  dVertical: '║',

  // Rounded
  rTopLeft: '╭',
  rTopRight: '╮',
  rBottomLeft: '╰',
  rBottomRight: '╯',

  // Heavy
  hTopLeft: '┏',
  hTopRight: '┓',
  hBottomLeft: '┗',
  hBottomRight: '┛',
  hHorizontal: '━',
  hVertical: '┃',
} as const;

/**
 * Box style options
 */
export type BoxStyle = 'single' | 'double' | 'rounded' | 'heavy' | 'none';

/**
 * Get box characters for a style
 * @param style - Box style
 * @returns Box character set
 */
function getBoxCharSet(style: BoxStyle): {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
} {
  switch (style) {
    case 'double':
      return {
        topLeft: BoxChars.dTopLeft,
        topRight: BoxChars.dTopRight,
        bottomLeft: BoxChars.dBottomLeft,
        bottomRight: BoxChars.dBottomRight,
        horizontal: BoxChars.dHorizontal,
        vertical: BoxChars.dVertical,
      };
    case 'rounded':
      return {
        topLeft: BoxChars.rTopLeft,
        topRight: BoxChars.rTopRight,
        bottomLeft: BoxChars.rBottomLeft,
        bottomRight: BoxChars.rBottomRight,
        horizontal: BoxChars.horizontal,
        vertical: BoxChars.vertical,
      };
    case 'heavy':
      return {
        topLeft: BoxChars.hTopLeft,
        topRight: BoxChars.hTopRight,
        bottomLeft: BoxChars.hBottomLeft,
        bottomRight: BoxChars.hBottomRight,
        horizontal: BoxChars.hHorizontal,
        vertical: BoxChars.hVertical,
      };
    case 'none':
      return {
        topLeft: ' ',
        topRight: ' ',
        bottomLeft: ' ',
        bottomRight: ' ',
        horizontal: ' ',
        vertical: ' ',
      };
    case 'single':
    default:
      return {
        topLeft: BoxChars.topLeft,
        topRight: BoxChars.topRight,
        bottomLeft: BoxChars.bottomLeft,
        bottomRight: BoxChars.bottomRight,
        horizontal: BoxChars.horizontal,
        vertical: BoxChars.vertical,
      };
  }
}

/**
 * Box options
 */
export interface BoxOptions {
  /** Box style */
  style?: BoxStyle;
  /** Title (displayed in top border) */
  title?: string;
  /** Title alignment */
  titleAlign?: 'left' | 'center' | 'right';
  /** Border color */
  borderColor?: string;
  /** Title color */
  titleColor?: string;
  /** Background color */
  bgColor?: string;
  /** Padding inside box */
  padding?: number;
}

/**
 * Draw a box on the screen buffer
 * @param buffer - Screen buffer
 * @param x - Left position
 * @param y - Top position
 * @param width - Box width
 * @param height - Box height
 * @param options - Box options
 */
export function drawBox(
  buffer: ScreenBuffer,
  x: number,
  y: number,
  width: number,
  height: number,
  options: BoxOptions = {}
): void {
  const {
    style = 'single',
    title,
    titleAlign = 'left',
    borderColor,
    bgColor,
  } = options;

  const chars = getBoxCharSet(style);
  const fg = borderColor;
  const bg = bgColor;

  // Draw corners
  buffer.writeChar(x, y, chars.topLeft, fg, bg);
  buffer.writeChar(x + width - 1, y, chars.topRight, fg, bg);
  buffer.writeChar(x, y + height - 1, chars.bottomLeft, fg, bg);
  buffer.writeChar(x + width - 1, y + height - 1, chars.bottomRight, fg, bg);

  // Draw horizontal borders
  for (let col = x + 1; col < x + width - 1; col++) {
    buffer.writeChar(col, y, chars.horizontal, fg, bg);
    buffer.writeChar(col, y + height - 1, chars.horizontal, fg, bg);
  }

  // Draw vertical borders
  for (let row = y + 1; row < y + height - 1; row++) {
    buffer.writeChar(x, row, chars.vertical, fg, bg);
    buffer.writeChar(x + width - 1, row, chars.vertical, fg, bg);
  }

  // Fill interior if background color specified
  if (bg) {
    buffer.fill(x + 1, y + 1, width - 2, height - 2, ' ', undefined, bg);
  }

  // Draw title
  if (title) {
    const titleText = ` ${title} `;
    const titleLen = visibleLength(titleText);
    const availableWidth = width - 4;

    if (titleLen <= availableWidth) {
      let titleX: number;
      switch (titleAlign) {
        case 'center':
          titleX = x + Math.floor((width - titleLen) / 2);
          break;
        case 'right':
          titleX = x + width - titleLen - 2;
          break;
        case 'left':
        default:
          titleX = x + 2;
      }

      const titleColor = options.titleColor ?? colors.bold;
      buffer.writeText(titleX, y, titleColor + titleText + colors.reset);
    }
  }
}

/**
 * Draw a horizontal line
 * @param buffer - Screen buffer
 * @param x - Start column
 * @param y - Row
 * @param width - Line width
 * @param style - Line style
 * @param color - Line color
 */
export function drawHLine(
  buffer: ScreenBuffer,
  x: number,
  y: number,
  width: number,
  style: BoxStyle = 'single',
  color?: string
): void {
  const chars = getBoxCharSet(style);
  for (let col = x; col < x + width; col++) {
    buffer.writeChar(col, y, chars.horizontal, color);
  }
}

/**
 * Draw a vertical line
 * @param buffer - Screen buffer
 * @param x - Column
 * @param y - Start row
 * @param height - Line height
 * @param style - Line style
 * @param color - Line color
 */
export function drawVLine(
  buffer: ScreenBuffer,
  x: number,
  y: number,
  height: number,
  style: BoxStyle = 'single',
  color?: string
): void {
  const chars = getBoxCharSet(style);
  for (let row = y; row < y + height; row++) {
    buffer.writeChar(x, row, chars.vertical, color);
  }
}

/**
 * Draw a horizontal divider in a box
 * @param buffer - Screen buffer
 * @param x - Box left position
 * @param y - Divider row
 * @param width - Box width
 * @param style - Box style
 * @param color - Line color
 */
export function drawDivider(
  buffer: ScreenBuffer,
  x: number,
  y: number,
  width: number,
  style: BoxStyle = 'single',
  color?: string
): void {
  const chars = getBoxCharSet(style);

  // Left T junction
  buffer.writeChar(x, y, BoxChars.leftT, color);

  // Horizontal line
  for (let col = x + 1; col < x + width - 1; col++) {
    buffer.writeChar(col, y, chars.horizontal, color);
  }

  // Right T junction
  buffer.writeChar(x + width - 1, y, BoxChars.rightT, color);
}

/**
 * Create a text box with content
 * @param content - Text content (array of lines)
 * @param options - Box options
 * @returns Box as string array
 */
export function createTextBox(content: string[], options: BoxOptions = {}): string[] {
  const { style = 'single', title, titleAlign = 'left' } = options;
  const chars = getBoxCharSet(style);

  // Calculate width
  const contentWidth = Math.max(...content.map((line) => visibleLength(line)), 0);
  const titleWidth = title ? visibleLength(title) + 4 : 0;
  const width = Math.max(contentWidth + 4, titleWidth + 4);

  const lines: string[] = [];

  // Top border with title
  let topBorder = chars.topLeft + chars.horizontal.repeat(width - 2) + chars.topRight;
  if (title) {
    const titleText = ` ${title} `;
    const titleLen = visibleLength(titleText);
    let insertPos: number;
    switch (titleAlign) {
      case 'center':
        insertPos = Math.floor((width - titleLen) / 2);
        break;
      case 'right':
        insertPos = width - titleLen - 2;
        break;
      case 'left':
      default:
        insertPos = 2;
    }
    topBorder =
      chars.topLeft +
      chars.horizontal.repeat(insertPos - 1) +
      titleText +
      chars.horizontal.repeat(width - insertPos - titleLen - 1) +
      chars.topRight;
  }
  lines.push(topBorder);

  // Content lines
  for (const line of content) {
    const padding = width - 4 - visibleLength(line);
    lines.push(`${chars.vertical} ${line}${' '.repeat(Math.max(0, padding))} ${chars.vertical}`);
  }

  // Bottom border
  lines.push(chars.bottomLeft + chars.horizontal.repeat(width - 2) + chars.bottomRight);

  return lines;
}

/**
 * Progress bar options
 */
export interface ProgressBarOptions {
  /** Bar width */
  width?: number;
  /** Filled character */
  filled?: string;
  /** Empty character */
  empty?: string;
  /** Show percentage */
  showPercent?: boolean;
  /** Filled color */
  filledColor?: string;
  /** Empty color */
  emptyColor?: string;
}

/**
 * Create a progress bar string
 * @param value - Current value (0-1)
 * @param options - Progress bar options
 * @returns Progress bar string
 */
export function createProgressBar(value: number, options: ProgressBarOptions = {}): string {
  const {
    width = 20,
    filled = '█',
    empty = '░',
    showPercent = true,
    filledColor = '',
    emptyColor = colors.gray,
  } = options;

  const normalizedValue = Math.max(0, Math.min(1, value));
  const filledCount = Math.round(normalizedValue * width);
  const emptyCount = width - filledCount;

  let bar = '';
  if (filledColor) {
    bar += filledColor + filled.repeat(filledCount) + colors.reset;
  } else {
    bar += filled.repeat(filledCount);
  }
  if (emptyColor) {
    bar += emptyColor + empty.repeat(emptyCount) + colors.reset;
  } else {
    bar += empty.repeat(emptyCount);
  }

  if (showPercent) {
    const percent = Math.round(normalizedValue * 100);
    bar += ` ${percent}%`;
  }

  return bar;
}

/**
 * Create a spinner animation frame
 * @param frame - Current frame number
 * @returns Spinner character
 */
export function getSpinner(frame: number): string {
  const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  return spinners[frame % spinners.length] ?? '⠋';
}

/**
 * Create a simple table
 * @param headers - Table headers
 * @param rows - Table rows
 * @param options - Table options
 * @returns Table as string array
 */
export function createTable(
  headers: string[],
  rows: string[][],
  options: { minWidth?: number; maxWidth?: number; padding?: number } = {}
): string[] {
  const { minWidth = 4, maxWidth = 40, padding = 1 } = options;

  // Calculate column widths
  const colWidths: number[] = headers.map((h, i) => {
    const headerWidth = visibleLength(h);
    const maxCellWidth = Math.max(0, ...rows.map((row) => visibleLength(row[i] ?? '')));
    return Math.min(maxWidth, Math.max(minWidth, headerWidth, maxCellWidth));
  });

  const lines: string[] = [];
  const pad = ' '.repeat(padding);

  // Header row
  const headerLine = headers
    .map((h, i) => {
      const width = colWidths[i] ?? minWidth;
      const text = visibleLength(h) > width ? h.slice(0, width - 1) + '…' : h;
      return pad + text.padEnd(width) + pad;
    })
    .join('│');
  lines.push(headerLine);

  // Separator
  const separator = colWidths.map((w) => '─'.repeat(w + padding * 2)).join('┼');
  lines.push(separator);

  // Data rows
  for (const row of rows) {
    const rowLine = headers
      .map((_, i) => {
        const cell = row[i] ?? '';
        const width = colWidths[i] ?? minWidth;
        const text = visibleLength(cell) > width ? cell.slice(0, width - 1) + '…' : cell;
        return pad + text.padEnd(width) + pad;
      })
      .join('│');
    lines.push(rowLine);
  }

  return lines;
}
