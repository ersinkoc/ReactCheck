/**
 * Scrollable list component for TUI
 * @packageDocumentation
 */

import type { ScreenBuffer } from './screen.js';
import { colors, getSeverityColor, getSeverityEmoji } from '../../utils/colors.js';
import type { Severity } from '../../types.js';

/**
 * List item data
 */
export interface ListItem<T = unknown> {
  /** Display label */
  label: string;
  /** Secondary text */
  secondary?: string;
  /** Item value/data */
  value: T;
  /** Severity level */
  severity?: Severity | 'healthy';
  /** Whether item is disabled */
  disabled?: boolean;
  /** Badge text */
  badge?: string;
}

/**
 * List options
 */
export interface ListOptions {
  /** Title above list */
  title?: string;
  /** Show scrollbar */
  showScrollbar?: boolean;
  /** Show item numbers */
  showNumbers?: boolean;
  /** Selected item style */
  selectedStyle?: string;
  /** Enable severity colors */
  severityColors?: boolean;
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * Scrollable list component
 */
export class List<T = unknown> {
  /** List items */
  private items: ListItem<T>[] = [];

  /** Selected index */
  private selectedIndex: number = 0;

  /** Scroll offset */
  private scrollOffset: number = 0;

  /** Visible height */
  private visibleHeight: number;

  /** List options */
  private options: ListOptions;

  /**
   * Create a new list
   * @param visibleHeight - Number of visible rows
   * @param options - List options
   */
  constructor(visibleHeight: number, options: ListOptions = {}) {
    this.visibleHeight = visibleHeight;
    this.options = {
      showScrollbar: true,
      showNumbers: false,
      severityColors: true,
      emptyMessage: '(empty)',
      ...options,
    };
  }

  /**
   * Set list items
   * @param items - Items to display
   */
  setItems(items: ListItem<T>[]): void {
    this.items = items;
    // Clamp selection
    if (this.selectedIndex >= items.length) {
      this.selectedIndex = Math.max(0, items.length - 1);
    }
    this.ensureVisible();
  }

  /**
   * Get all items
   * @returns Items array
   */
  getItems(): ListItem<T>[] {
    return this.items;
  }

  /**
   * Get selected item
   * @returns Selected item or undefined
   */
  getSelected(): ListItem<T> | undefined {
    return this.items[this.selectedIndex];
  }

  /**
   * Get selected index
   * @returns Selected index
   */
  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  /**
   * Set selected index
   * @param index - New index
   */
  setSelectedIndex(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.selectedIndex = index;
      this.ensureVisible();
    }
  }

  /**
   * Move selection up
   * @param count - Number of items to move
   */
  moveUp(count: number = 1): void {
    let newIndex = this.selectedIndex - count;

    // Skip disabled items
    while (newIndex >= 0 && this.items[newIndex]?.disabled) {
      newIndex--;
    }

    if (newIndex >= 0) {
      this.selectedIndex = newIndex;
      this.ensureVisible();
    }
  }

  /**
   * Move selection down
   * @param count - Number of items to move
   */
  moveDown(count: number = 1): void {
    let newIndex = this.selectedIndex + count;

    // Skip disabled items
    while (newIndex < this.items.length && this.items[newIndex]?.disabled) {
      newIndex++;
    }

    if (newIndex < this.items.length) {
      this.selectedIndex = newIndex;
      this.ensureVisible();
    }
  }

  /**
   * Move to first item
   */
  moveToStart(): void {
    this.selectedIndex = 0;
    // Skip disabled items
    while (this.selectedIndex < this.items.length && this.items[this.selectedIndex]?.disabled) {
      this.selectedIndex++;
    }
    this.ensureVisible();
  }

  /**
   * Move to last item
   */
  moveToEnd(): void {
    this.selectedIndex = this.items.length - 1;
    // Skip disabled items
    while (this.selectedIndex >= 0 && this.items[this.selectedIndex]?.disabled) {
      this.selectedIndex--;
    }
    this.ensureVisible();
  }

  /**
   * Page up
   */
  pageUp(): void {
    this.moveUp(this.visibleHeight - 1);
  }

  /**
   * Page down
   */
  pageDown(): void {
    this.moveDown(this.visibleHeight - 1);
  }

  /**
   * Ensure selected item is visible
   */
  private ensureVisible(): void {
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + this.visibleHeight) {
      this.scrollOffset = this.selectedIndex - this.visibleHeight + 1;
    }
  }

  /**
   * Render list to screen buffer
   * @param buffer - Screen buffer
   * @param x - Left position
   * @param y - Top position
   * @param width - Available width
   */
  render(buffer: ScreenBuffer, x: number, y: number, width: number): void {
    // Calculate content width (minus scrollbar if shown)
    const scrollbarWidth = this.options.showScrollbar && this.items.length > this.visibleHeight ? 1 : 0;
    const contentWidth = width - scrollbarWidth;

    // Empty state
    if (this.items.length === 0) {
      const msg = this.options.emptyMessage ?? '(empty)';
      buffer.writeText(x, y, colors.gray + msg + colors.reset, contentWidth);
      return;
    }

    // Render visible items
    for (let i = 0; i < this.visibleHeight; i++) {
      const itemIndex = this.scrollOffset + i;
      const item = this.items[itemIndex];
      const row = y + i;

      if (!item) {
        // Clear empty rows
        buffer.writeText(x, row, '', contentWidth);
        continue;
      }

      const isSelected = itemIndex === this.selectedIndex;
      let line = '';

      // Selection indicator
      if (isSelected) {
        line += colors.cyan + '▶ ' + colors.reset;
      } else {
        line += '  ';
      }

      // Severity emoji
      if (this.options.severityColors && item.severity) {
        line += getSeverityEmoji(item.severity) + ' ';
      }

      // Item number
      if (this.options.showNumbers) {
        const num = (itemIndex + 1).toString().padStart(3);
        line += colors.gray + num + ' ' + colors.reset;
      }

      // Label with severity color
      let labelColor = '';
      if (this.options.severityColors && item.severity) {
        labelColor = getSeverityColor(item.severity);
      }
      if (item.disabled) {
        labelColor = colors.gray;
      }
      if (isSelected) {
        labelColor = colors.bold + (labelColor || colors.white);
      }

      line += labelColor + item.label + colors.reset;

      // Badge
      if (item.badge) {
        line += ' ' + colors.gray + '[' + item.badge + ']' + colors.reset;
      }

      // Secondary text
      if (item.secondary) {
        line += ' ' + colors.gray + item.secondary + colors.reset;
      }

      // Render line
      buffer.writeText(x, row, line, contentWidth);
    }

    // Render scrollbar
    if (scrollbarWidth > 0) {
      this.renderScrollbar(buffer, x + contentWidth, y, this.visibleHeight);
    }
  }

  /**
   * Render scrollbar
   * @param buffer - Screen buffer
   * @param x - Scrollbar column
   * @param y - Top position
   * @param height - Scrollbar height
   */
  private renderScrollbar(buffer: ScreenBuffer, x: number, y: number, height: number): void {
    const totalItems = this.items.length;
    if (totalItems <= height) {
      // No scrollbar needed
      for (let i = 0; i < height; i++) {
        buffer.writeChar(x, y + i, ' ');
      }
      return;
    }

    // Calculate thumb position and size
    const thumbSize = Math.max(1, Math.floor((height * height) / totalItems));
    const scrollRange = height - thumbSize;
    const scrollProgress = this.scrollOffset / (totalItems - height);
    const thumbPos = Math.round(scrollProgress * scrollRange);

    // Render track and thumb
    for (let i = 0; i < height; i++) {
      if (i >= thumbPos && i < thumbPos + thumbSize) {
        buffer.writeChar(x, y + i, '█', colors.gray);
      } else {
        buffer.writeChar(x, y + i, '░', colors.gray);
      }
    }
  }

  /**
   * Set visible height
   * @param height - New visible height
   */
  setVisibleHeight(height: number): void {
    this.visibleHeight = height;
    this.ensureVisible();
  }

  /**
   * Find item by predicate
   * @param predicate - Search function
   * @returns Item index or -1
   */
  findIndex(predicate: (item: ListItem<T>) => boolean): number {
    return this.items.findIndex(predicate);
  }

  /**
   * Select item by predicate
   * @param predicate - Search function
   * @returns true if found and selected
   */
  selectBy(predicate: (item: ListItem<T>) => boolean): boolean {
    const index = this.findIndex(predicate);
    if (index >= 0) {
      this.setSelectedIndex(index);
      return true;
    }
    return false;
  }

  /**
   * Get visible item count
   * @returns Number of currently visible items
   */
  getVisibleCount(): number {
    return Math.min(this.items.length - this.scrollOffset, this.visibleHeight);
  }

  /**
   * Get total item count
   * @returns Total number of items
   */
  getTotalCount(): number {
    return this.items.length;
  }

  /**
   * Check if list is empty
   * @returns true if no items
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items = [];
    this.selectedIndex = 0;
    this.scrollOffset = 0;
  }
}

/**
 * Create list items from component stats
 * @param stats - Component statistics
 * @returns List items
 */
export function createComponentListItems<T extends { name: string; renders: number; severity: Severity | 'healthy' }>(
  stats: T[]
): ListItem<T>[] {
  return stats.map((stat) => ({
    label: stat.name,
    value: stat,
    severity: stat.severity,
    badge: `${stat.renders} renders`,
  }));
}
