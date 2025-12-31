/**
 * Browser overlay for render visualization
 * @packageDocumentation
 */

import type { RenderInfo, RenderChainInfo, Severity } from '../types.js';

/**
 * Overlay configuration
 */
export interface OverlayConfig {
  /** Whether overlay is enabled */
  enabled: boolean;
  /** Whether to highlight renders */
  highlightRenders: boolean;
  /** Whether to show toolbar */
  showToolbar: boolean;
  /** Highlight duration in ms (0 = persistent until cleared) */
  highlightDuration: number;
}

/**
 * Default overlay configuration
 */
const DEFAULT_CONFIG: OverlayConfig = {
  enabled: true,
  highlightRenders: true,
  showToolbar: true,
  highlightDuration: 2000,
};

/**
 * Color scheme for severity levels
 */
const SEVERITY_COLORS: Record<Severity | 'healthy' | 'unnecessary', string> = {
  critical: '#ef4444',
  warning: '#f97316',
  info: '#3b82f6',
  healthy: '#22c55e',
  unnecessary: '#6b7280',
};

/**
 * Tracked component info for deduplication
 */
interface TrackedComponent {
  /** DOM element */
  element: Element;
  /** Highlight container element */
  highlightEl: HTMLElement;
  /** Last render timestamp */
  lastRender: number;
  /** Render count */
  count: number;
  /** Current severity */
  severity: Severity | 'healthy' | 'unnecessary';
  /** Render times for avg calculation */
  renderTimes: number[];
}

/** Tab types */
type TabType = 'overview' | 'components' | 'chains' | 'settings';

/**
 * Overlay for visualizing React renders in the browser
 */
export class Overlay {
  /** Shadow root for isolation */
  private shadowRoot: ShadowRoot | null = null;

  /** Host element */
  private host: HTMLElement | null = null;

  /** Overlay configuration */
  private config: OverlayConfig;

  /** Tracked components (deduplication) */
  private trackedComponents: Map<string, TrackedComponent> = new Map();

  /** Render chains */
  private renderChains: RenderChainInfo[] = [];

  /** Toolbar element */
  private toolbar: HTMLElement | null = null;

  /** Whether overlay is visible */
  private visible: boolean = true;

  /** Whether panel is collapsed to icon */
  private collapsed: boolean = false;

  /** Total render count */
  private totalRenders: number = 0;

  /** FPS value */
  private fps: number = 60;

  /** Scan start time */
  private startTime: number = Date.now();

  /** Fade timeout handles */
  private fadeTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /** Bound scroll handler for cleanup */
  private scrollHandler: (() => void) | null = null;

  /** Scroll update pending flag (for throttling) */
  private scrollUpdatePending: boolean = false;

  /** Stats update interval */
  private statsInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Create a new overlay
   * @param config - Overlay configuration
   */
  constructor(config: Partial<OverlayConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Retry count for init */
  private initRetryCount: number = 0;

  /**
   * Initialize the overlay
   */
  init(): void {
    // Prevent double initialization
    if (this.host) {
      return;
    }

    // Retry if document.body not ready (max 10 retries)
    if (!document.body) {
      if (this.initRetryCount < 10) {
        this.initRetryCount++;
        setTimeout(() => this.init(), 100);
      }
      return;
    }

    // Create host element
    this.host = document.createElement('div');
    this.host.id = 'reactcheck-overlay-host';
    this.host.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483647;
    `;

    // Create shadow DOM for isolation
    this.shadowRoot = this.host.attachShadow({ mode: 'closed' });

    // Inject styles
    this.injectStyles();

    // Create toolbar if enabled
    if (this.config.showToolbar) {
      this.createToolbar();
    }

    // Append to document
    document.body.appendChild(this.host);

    // Set up scroll listener to update highlight positions
    this.scrollHandler = () => this.onScroll();
    window.addEventListener('scroll', this.scrollHandler, { passive: true, capture: true });
    window.addEventListener('resize', this.scrollHandler, { passive: true });

    // Start stats update interval
    this.statsInterval = setInterval(() => this.updateStats(), 500);

    // eslint-disable-next-line no-console
    console.log('[ReactCheck] Overlay initialized');
  }

  /**
   * Destroy the overlay
   */
  destroy(): void {
    // Stop stats interval
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    // Remove scroll listener
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler, { capture: true });
      window.removeEventListener('resize', this.scrollHandler);
      this.scrollHandler = null;
    }

    // Clear all fade timeouts
    for (const timeout of this.fadeTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.fadeTimeouts.clear();

    // Clear tracked components
    this.trackedComponents.clear();
    this.renderChains = [];

    // Remove host element
    if (this.host) {
      this.host.remove();
      this.host = null;
    }

    this.shadowRoot = null;
    this.toolbar = null;
  }

  /**
   * Handle scroll/resize events - update all highlight positions
   */
  private onScroll(): void {
    // Throttle updates using requestAnimationFrame
    if (this.scrollUpdatePending) return;
    this.scrollUpdatePending = true;

    requestAnimationFrame(() => {
      this.updateAllPositions();
      this.scrollUpdatePending = false;
    });
  }

  /**
   * Update positions of all tracked highlights
   */
  private updateAllPositions(): void {
    for (const tracked of this.trackedComponents.values()) {
      // Get current position of the DOM element
      const rect = tracked.element.getBoundingClientRect();

      // Skip if element is no longer visible
      if (rect.width === 0 || rect.height === 0) {
        tracked.highlightEl.style.display = 'none';
        continue;
      }

      // Update position
      tracked.highlightEl.style.display = this.config.highlightRenders ? 'block' : 'none';
      tracked.highlightEl.style.left = `${rect.left}px`;
      tracked.highlightEl.style.top = `${rect.top}px`;
      tracked.highlightEl.style.width = `${rect.width}px`;
      tracked.highlightEl.style.height = `${rect.height}px`;
    }
  }

  /**
   * Inject CSS styles into shadow DOM
   */
  private injectStyles(): void {
    if (!this.shadowRoot) return;

    const style = document.createElement('style');
    style.textContent = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      /* Ensure all interactive elements are clickable */
      button, input, .toggle, .tab, .action-btn, .component-item, .panel-btn {
        pointer-events: auto !important;
        cursor: pointer;
      }

      /* Highlight styles */
      .highlight-container {
        position: fixed;
        pointer-events: none;
        z-index: 1;
      }

      .highlight-border {
        position: absolute;
        inset: 0;
        border: 2px solid currentColor;
        border-radius: 4px;
        transition: opacity 0.3s ease-out;
      }

      .highlight-container.fade .highlight-border {
        opacity: 0.3;
      }

      .label {
        position: absolute;
        font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 3px;
        color: white;
        white-space: nowrap;
        line-height: 1.2;
      }

      .label-name {
        top: -20px;
        left: 0;
      }

      .label-count {
        top: -20px;
        right: 0;
      }

      .label-count.bump {
        animation: bump 0.2s ease-out;
      }

      @keyframes bump {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }

      /* Panel styles */
      .panel {
        position: fixed;
        top: 12px;
        right: 12px;
        background: linear-gradient(135deg, rgba(17, 17, 23, 0.98) 0%, rgba(12, 12, 18, 0.98) 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        color: #e5e7eb;
        pointer-events: auto;
        z-index: 10;
        user-select: none;
        width: 320px;
        max-height: 480px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        backdrop-filter: blur(12px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
      }

      .panel.collapsed {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .panel.collapsed:hover {
        transform: scale(1.08);
        box-shadow: 0 8px 32px rgba(34, 197, 94, 0.3);
      }

      .panel.collapsed .panel-content {
        display: none;
      }

      .panel-icon {
        display: none;
        width: 28px;
        height: 28px;
        fill: #22c55e;
        filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.5));
      }

      .panel.collapsed .panel-icon {
        display: block;
      }

      .panel-content {
        display: flex;
        flex-direction: column;
        pointer-events: auto;
      }

      /* Header */
      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        cursor: move;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%);
      }

      .panel-brand {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .panel-logo {
        width: 20px;
        height: 20px;
        fill: #22c55e;
      }

      .panel-title {
        font-weight: 700;
        font-size: 13px;
        background: linear-gradient(135deg, #22c55e 0%, #4ade80 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .panel-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        color: #6b7280;
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 8px #22c55e;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .panel-actions {
        display: flex;
        gap: 4px;
      }

      .panel-btn {
        background: rgba(255, 255, 255, 0.05);
        border: none;
        border-radius: 6px;
        color: #9ca3af;
        width: 28px;
        height: 28px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }

      .panel-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      .panel-btn svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
      }

      /* Tabs */
      .panel-tabs {
        display: flex;
        padding: 0 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        background: rgba(0, 0, 0, 0.2);
      }

      .tab {
        flex: 1;
        padding: 10px 8px;
        background: none;
        border: none;
        color: #6b7280;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .tab svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
        opacity: 0.7;
      }

      .tab:hover {
        color: #d1d5db;
      }

      .tab.active {
        color: #22c55e;
      }

      .tab.active svg {
        opacity: 1;
      }

      .tab.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 24px;
        height: 2px;
        background: linear-gradient(90deg, #22c55e, #4ade80);
        border-radius: 2px;
      }

      /* Tab content */
      .tab-content {
        display: none;
        padding: 12px;
        overflow-y: auto;
        max-height: 340px;
        pointer-events: auto;
      }

      .tab-content.active {
        display: block;
      }

      .tab-content::-webkit-scrollbar {
        width: 4px;
      }

      .tab-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .tab-content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
      }

      /* Overview tab */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-bottom: 12px;
      }

      .stat-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 12px;
        text-align: center;
      }

      .stat-card.wide {
        grid-column: span 2;
      }

      .stat-value {
        font-size: 24px;
        font-weight: 700;
        font-family: ui-monospace, monospace;
        line-height: 1;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 10px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .stat-card.critical .stat-value { color: #ef4444; }
      .stat-card.warning .stat-value { color: #f97316; }
      .stat-card.healthy .stat-value { color: #22c55e; }
      .stat-card.info .stat-value { color: #3b82f6; }

      .fps-bar {
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        margin-top: 8px;
        overflow: hidden;
      }

      .fps-bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.3s, background 0.3s;
      }

      .quick-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .action-btn {
        flex: 1;
        padding: 10px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        color: #d1d5db;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .action-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.15);
      }

      .action-btn.active {
        background: rgba(34, 197, 94, 0.15);
        border-color: rgba(34, 197, 94, 0.3);
        color: #22c55e;
      }

      .action-btn svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
      }

      /* Components tab */
      .component-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .component-item {
        display: flex;
        align-items: center;
        padding: 10px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s;
      }

      .component-item:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
      }

      .component-severity {
        width: 4px;
        height: 32px;
        border-radius: 2px;
        margin-right: 10px;
      }

      .component-info {
        flex: 1;
        min-width: 0;
      }

      .component-name {
        font-weight: 600;
        font-size: 12px;
        color: #e5e7eb;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .component-meta {
        font-size: 10px;
        color: #6b7280;
        margin-top: 2px;
      }

      .component-count {
        font-family: ui-monospace, monospace;
        font-size: 14px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
      }

      .empty-state {
        text-align: center;
        padding: 32px 16px;
        color: #6b7280;
      }

      .empty-state svg {
        width: 40px;
        height: 40px;
        fill: currentColor;
        opacity: 0.3;
        margin-bottom: 12px;
      }

      /* Chains tab */
      .chain-item {
        padding: 12px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        margin-bottom: 8px;
      }

      .chain-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .chain-trigger {
        font-weight: 600;
        color: #f97316;
      }

      .chain-count {
        font-size: 10px;
        color: #6b7280;
        background: rgba(255, 255, 255, 0.05);
        padding: 2px 8px;
        border-radius: 4px;
      }

      .chain-flow {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
        font-size: 11px;
      }

      .chain-node {
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        color: #d1d5db;
      }

      .chain-arrow {
        color: #6b7280;
      }

      /* Settings tab */
      .setting-group {
        margin-bottom: 16px;
      }

      .setting-label {
        font-size: 11px;
        font-weight: 500;
        color: #9ca3af;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        margin-bottom: 6px;
      }

      .setting-name {
        font-size: 12px;
        color: #e5e7eb;
      }

      .setting-desc {
        font-size: 10px;
        color: #6b7280;
        margin-top: 2px;
      }

      /* Toggle switch */
      .toggle {
        position: relative;
        width: 40px;
        height: 22px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 11px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .toggle.active {
        background: #22c55e;
      }

      .toggle::after {
        content: '';
        position: absolute;
        top: 3px;
        left: 3px;
        width: 16px;
        height: 16px;
        background: white;
        border-radius: 50%;
        transition: transform 0.2s;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .toggle.active::after {
        transform: translateX(18px);
      }

      /* Range slider */
      .range-container {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .range-value {
        font-family: ui-monospace, monospace;
        font-size: 12px;
        color: #22c55e;
        min-width: 40px;
        text-align: right;
      }

      input[type="range"] {
        flex: 1;
        height: 4px;
        -webkit-appearance: none;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        outline: none;
      }

      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        background: #22c55e;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(34, 197, 94, 0.4);
      }
    `;

    this.shadowRoot.appendChild(style);
  }

  /**
   * Create the floating panel
   */
  private createToolbar(): void {
    if (!this.shadowRoot) return;

    this.toolbar = document.createElement('div');
    this.toolbar.className = 'panel';
    this.toolbar.innerHTML = `
      <!-- Collapsed icon -->
      <svg class="panel-icon" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>

      <div class="panel-content">
        <!-- Header -->
        <div class="panel-header">
          <div class="panel-brand">
            <svg class="panel-logo" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            <span class="panel-title">ReactCheck</span>
          </div>
          <div class="panel-status">
            <span class="status-dot"></span>
            <span id="rc-duration">0:00</span>
          </div>
          <div class="panel-actions">
            <button class="panel-btn" id="rc-collapse" title="Minimize">
              <svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="panel-tabs">
          <button class="tab active" data-tab="overview">
            <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
            Overview
          </button>
          <button class="tab" data-tab="components">
            <svg viewBox="0 0 24 24"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>
            Components
          </button>
          <button class="tab" data-tab="chains">
            <svg viewBox="0 0 24 24"><path d="M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.43-.98 2.63-2.31 2.98l1.46 1.46C20.88 15.61 22 13.95 22 12c0-2.76-2.24-5-5-5zm-1 4h-2.19l2 2H16zM2 4.27l3.11 3.11C3.29 8.12 2 9.91 2 12c0 2.76 2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1 0-1.59 1.21-2.9 2.76-3.07L8.73 11H8v2h2.73L13 15.27V17h1.73l4.01 4.01 1.41-1.41L3.41 2.86 2 4.27z"/></svg>
            Chains
          </button>
          <button class="tab" data-tab="settings">
            <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
            Settings
          </button>
        </div>

        <!-- Overview Tab -->
        <div class="tab-content active" data-content="overview">
          <div class="stats-grid">
            <div class="stat-card critical">
              <div class="stat-value" id="rc-critical">0</div>
              <div class="stat-label">Critical</div>
            </div>
            <div class="stat-card warning">
              <div class="stat-value" id="rc-warning">0</div>
              <div class="stat-label">Warning</div>
            </div>
            <div class="stat-card healthy">
              <div class="stat-value" id="rc-healthy">0</div>
              <div class="stat-label">Healthy</div>
            </div>
            <div class="stat-card info">
              <div class="stat-value" id="rc-renders">0</div>
              <div class="stat-label">Renders</div>
            </div>
            <div class="stat-card wide">
              <div class="stat-value" id="rc-fps">60</div>
              <div class="stat-label">FPS</div>
              <div class="fps-bar">
                <div class="fps-bar-fill" id="rc-fps-bar" style="width: 100%; background: #22c55e;"></div>
              </div>
            </div>
          </div>

          <div class="quick-actions">
            <button class="action-btn active" id="rc-toggle-highlights">
              <svg viewBox="0 0 24 24"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>
              Highlights
            </button>
            <button class="action-btn" id="rc-clear">
              <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              Clear
            </button>
          </div>
        </div>

        <!-- Components Tab -->
        <div class="tab-content" data-content="components">
          <div class="component-list" id="rc-component-list">
            <div class="empty-state">
              <svg viewBox="0 0 24 24"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>
              <div>No components rendered yet</div>
            </div>
          </div>
        </div>

        <!-- Chains Tab -->
        <div class="tab-content" data-content="chains">
          <div id="rc-chain-list">
            <div class="empty-state">
              <svg viewBox="0 0 24 24"><path d="M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.43-.98 2.63-2.31 2.98l1.46 1.46C20.88 15.61 22 13.95 22 12c0-2.76-2.24-5-5-5z"/></svg>
              <div>No render chains detected</div>
            </div>
          </div>
        </div>

        <!-- Settings Tab -->
        <div class="tab-content" data-content="settings">
          <div class="setting-group">
            <div class="setting-label">Display</div>
            <div class="setting-row">
              <div>
                <div class="setting-name">Show Highlights</div>
                <div class="setting-desc">Outline rendered components</div>
              </div>
              <div class="toggle active" id="rc-setting-highlights"></div>
            </div>
          </div>

          <div class="setting-group">
            <div class="setting-label">Timing</div>
            <div class="setting-row">
              <div>
                <div class="setting-name">Highlight Duration</div>
                <div class="setting-desc">How long highlights stay visible</div>
              </div>
              <div class="range-container">
                <input type="range" id="rc-setting-duration" min="500" max="10000" step="500" value="2000">
                <span class="range-value" id="rc-duration-value">2s</span>
              </div>
            </div>
          </div>

          <div class="setting-group">
            <div class="setting-label">About</div>
            <div class="setting-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
              <div class="setting-name">ReactCheck v1.1.6</div>
              <div class="setting-desc">React performance scanner</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Append to shadow DOM first
    this.shadowRoot.appendChild(this.toolbar);

    // Then set up event listeners (after DOM is ready)
    this.setupToolbarEvents();

    // Make draggable
    this.makeDraggable(this.toolbar);
  }

  /**
   * Set up toolbar event listeners
   */
  private setupToolbarEvents(): void {
    if (!this.toolbar || !this.shadowRoot) return;

    // Collapse/expand
    const collapseBtn = this.shadowRoot.getElementById('rc-collapse');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCollapse();
      });
    }

    // Click on collapsed panel to expand
    this.toolbar.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // Expand when clicking on collapsed panel or its icon
      if (this.collapsed && (target === this.toolbar || target.closest('.panel-icon'))) {
        this.toggleCollapse();
      }
    });

    // Tab switching
    const tabs = this.toolbar.querySelectorAll('.tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab') as TabType;
        this.switchTab(tabName);
      });
    });

    // Toggle highlights (overview)
    const highlightsBtn = this.shadowRoot.getElementById('rc-toggle-highlights');
    if (highlightsBtn) {
      highlightsBtn.addEventListener('click', () => {
        this.config.highlightRenders = !this.config.highlightRenders;
        highlightsBtn.classList.toggle('active', this.config.highlightRenders);
        this.updateHighlightsVisibility();
      });
    }

    // Clear button
    const clearBtn = this.shadowRoot.getElementById('rc-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clear();
      });
    }

    // Settings: highlights toggle
    const settingHighlights = this.shadowRoot.getElementById('rc-setting-highlights');
    if (settingHighlights) {
      settingHighlights.addEventListener('click', () => {
        this.config.highlightRenders = !this.config.highlightRenders;
        settingHighlights.classList.toggle('active', this.config.highlightRenders);
        highlightsBtn?.classList.toggle('active', this.config.highlightRenders);
        this.updateHighlightsVisibility();
      });
    }

    // Settings: duration slider
    const durationSlider = this.shadowRoot.getElementById('rc-setting-duration') as HTMLInputElement;
    const durationValue = this.shadowRoot.getElementById('rc-duration-value');
    if (durationSlider && durationValue) {
      durationSlider.addEventListener('input', () => {
        const value = parseInt(durationSlider.value, 10);
        this.config.highlightDuration = value;
        durationValue.textContent = value >= 1000 ? `${value / 1000}s` : `${value}ms`;
      });
    }
  }

  /**
   * Toggle collapse state
   */
  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    if (this.toolbar) {
      this.toolbar.classList.toggle('collapsed', this.collapsed);
    }
  }

  /**
   * Switch active tab
   */
  private switchTab(tabName: TabType): void {
    if (!this.toolbar) return;

    // Update tab buttons
    const tabs = this.toolbar.querySelectorAll('.tab');
    tabs.forEach((tab) => {
      const isActive = tab.getAttribute('data-tab') === tabName;
      tab.classList.toggle('active', isActive);
    });

    // Update tab content
    const contents = this.toolbar.querySelectorAll('.tab-content');
    contents.forEach((content) => {
      const isActive = content.getAttribute('data-content') === tabName;
      content.classList.toggle('active', isActive);
    });

    // Refresh content if needed
    if (tabName === 'components') {
      this.updateComponentList();
    } else if (tabName === 'chains') {
      this.updateChainList();
    }
  }

  /**
   * Update highlights visibility
   */
  private updateHighlightsVisibility(): void {
    for (const tracked of this.trackedComponents.values()) {
      tracked.highlightEl.style.display = this.config.highlightRenders ? 'block' : 'none';
    }
  }

  /**
   * Make an element draggable
   */
  private makeDraggable(element: HTMLElement): void {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;

    const header = element.querySelector('.panel-header');
    if (!header) return;

    header.addEventListener('mousedown', (e: Event) => {
      const mouseEvent = e as MouseEvent;
      if ((mouseEvent.target as HTMLElement).closest('.panel-btn')) return;
      isDragging = true;
      startX = mouseEvent.clientX;
      startY = mouseEvent.clientY;
      initialX = element.offsetLeft;
      initialY = element.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      element.style.left = `${initialX + dx}px`;
      element.style.top = `${initialY + dy}px`;
      element.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  /** Maximum number of highlights to show at once */
  private static readonly MAX_HIGHLIGHTS = 50;

  /** Component names to skip (generic/internal) */
  private static readonly SKIP_COMPONENTS = new Set([
    'ForwardRef',
    'Anonymous',
    'Unknown',
    'Fragment',
    'Suspense',
    'Context.Provider',
    'Context.Consumer',
    'Profiler',
    'Root',
    '#text',
  ]);

  /**
   * Highlight a component render
   */
  highlight(render: RenderInfo, element: Element): void {
    if (!this.shadowRoot || !this.visible) return;

    // Skip generic component names
    if (Overlay.SKIP_COMPONENTS.has(render.componentName)) {
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Limit total highlights to prevent flooding
    if (this.trackedComponents.size >= Overlay.MAX_HIGHLIGHTS &&
        !this.trackedComponents.has(render.componentName)) {
      // Remove oldest highlight
      const oldest = this.getOldestTrackedComponent();
      if (oldest) {
        this.removeHighlight(oldest);
      }
    }

    // Update total renders
    this.totalRenders++;

    // Get severity based on render count
    const severity = this.getSeverity(render);
    const color = SEVERITY_COLORS[severity];

    // Check if we already track this component (deduplication)
    let tracked = this.trackedComponents.get(render.componentName);

    if (tracked) {
      // Update existing
      tracked.count++;
      tracked.element = element;
      tracked.lastRender = Date.now();
      tracked.severity = severity;
      tracked.renderTimes.push(render.renderTime);
      if (tracked.renderTimes.length > 100) tracked.renderTimes.shift();

      // Update position
      this.updateHighlightPosition(tracked, rect, color);

      // Bump animation
      const countLabel = tracked.highlightEl.querySelector('.label-count');
      if (countLabel) {
        countLabel.classList.remove('bump');
        void (countLabel as HTMLElement).offsetWidth;
        countLabel.classList.add('bump');
      }
    } else {
      // Create new highlight
      const container = this.createHighlightElement(render.componentName, rect, color);
      tracked = {
        element,
        highlightEl: container,
        lastRender: Date.now(),
        count: 1,
        severity,
        renderTimes: [render.renderTime],
      };
      this.trackedComponents.set(render.componentName, tracked);
      this.shadowRoot.appendChild(container);
    }

    // Update count display
    const countLabel = tracked.highlightEl.querySelector('.label-count');
    if (countLabel) {
      countLabel.textContent = `×${tracked.count}`;
    }

    // Update color
    this.updateHighlightColor(tracked.highlightEl, color);

    // Reset fade timeout
    this.resetFadeTimeout(render.componentName, tracked);
  }

  /**
   * Add a render chain
   */
  addChain(chain: RenderChainInfo): void {
    this.renderChains.unshift(chain);
    if (this.renderChains.length > 50) {
      this.renderChains.pop();
    }
  }

  /**
   * Update FPS value
   */
  updateFps(fps: number): void {
    this.fps = fps;
  }

  /**
   * Create a highlight element
   */
  private createHighlightElement(name: string, rect: DOMRect, color: string): HTMLElement {
    const container = document.createElement('div');
    container.className = 'highlight-container';
    container.style.cssText = `
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      color: ${color};
      display: ${this.config.highlightRenders ? 'block' : 'none'};
    `;

    const border = document.createElement('div');
    border.className = 'highlight-border';
    container.appendChild(border);

    const nameLabel = document.createElement('div');
    nameLabel.className = 'label label-name';
    nameLabel.style.background = color;
    nameLabel.textContent = name;
    container.appendChild(nameLabel);

    const countLabel = document.createElement('div');
    countLabel.className = 'label label-count';
    countLabel.style.background = color;
    countLabel.textContent = '×1';
    container.appendChild(countLabel);

    return container;
  }

  /**
   * Update highlight position
   */
  private updateHighlightPosition(tracked: TrackedComponent, rect: DOMRect, color: string): void {
    tracked.highlightEl.style.left = `${rect.left}px`;
    tracked.highlightEl.style.top = `${rect.top}px`;
    tracked.highlightEl.style.width = `${rect.width}px`;
    tracked.highlightEl.style.height = `${rect.height}px`;
    tracked.highlightEl.style.color = color;
    tracked.highlightEl.classList.remove('fade');
  }

  /**
   * Update highlight color
   */
  private updateHighlightColor(container: HTMLElement, color: string): void {
    container.style.color = color;
    const labels = container.querySelectorAll('.label');
    labels.forEach((label) => {
      (label as HTMLElement).style.background = color;
    });
  }

  /**
   * Reset fade timeout
   */
  private resetFadeTimeout(name: string, tracked: TrackedComponent): void {
    const existing = this.fadeTimeouts.get(name);
    if (existing) {
      clearTimeout(existing);
    }

    if (this.config.highlightDuration > 0) {
      const timeout = setTimeout(() => {
        tracked.highlightEl.classList.add('fade');
        this.fadeTimeouts.delete(name);
      }, this.config.highlightDuration);
      this.fadeTimeouts.set(name, timeout);
    }
  }

  /**
   * Get the oldest tracked component by last render time
   */
  private getOldestTrackedComponent(): string | null {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [name, tracked] of this.trackedComponents) {
      if (tracked.lastRender < oldestTime) {
        oldestTime = tracked.lastRender;
        oldest = name;
      }
    }

    return oldest;
  }

  /**
   * Remove a highlight by component name
   */
  private removeHighlight(name: string): void {
    const tracked = this.trackedComponents.get(name);
    if (tracked) {
      tracked.highlightEl.remove();
      this.trackedComponents.delete(name);

      const timeout = this.fadeTimeouts.get(name);
      if (timeout) {
        clearTimeout(timeout);
        this.fadeTimeouts.delete(name);
      }
    }
  }

  /**
   * Get severity level
   */
  private getSeverity(render: RenderInfo): Severity | 'healthy' | 'unnecessary' {
    if (!render.necessary) return 'unnecessary';
    if (render.renderCount > 50) return 'critical';
    if (render.renderCount > 20) return 'warning';
    return 'healthy';
  }

  /**
   * Record a render event
   */
  recordRender(render: RenderInfo): void {
    const tracked = this.trackedComponents.get(render.componentName);
    if (tracked) {
      tracked.count++;
      tracked.lastRender = Date.now();
      tracked.severity = this.getSeverity(render);

      const countLabel = tracked.highlightEl.querySelector('.label-count');
      if (countLabel) {
        countLabel.textContent = `×${tracked.count}`;
      }
    }

    this.totalRenders++;
  }

  /**
   * Update all stats
   */
  private updateStats(): void {
    if (!this.shadowRoot) return;

    let critical = 0;
    let warning = 0;
    let healthy = 0;

    for (const tracked of this.trackedComponents.values()) {
      if (tracked.count > 50) critical++;
      else if (tracked.count > 20) warning++;
      else healthy++;
    }

    // Update stat values
    const criticalEl = this.shadowRoot.getElementById('rc-critical');
    const warningEl = this.shadowRoot.getElementById('rc-warning');
    const healthyEl = this.shadowRoot.getElementById('rc-healthy');
    const rendersEl = this.shadowRoot.getElementById('rc-renders');
    const fpsEl = this.shadowRoot.getElementById('rc-fps');
    const fpsBar = this.shadowRoot.getElementById('rc-fps-bar');
    const durationEl = this.shadowRoot.getElementById('rc-duration');

    if (criticalEl) criticalEl.textContent = String(critical);
    if (warningEl) warningEl.textContent = String(warning);
    if (healthyEl) healthyEl.textContent = String(healthy);
    if (rendersEl) rendersEl.textContent = String(this.totalRenders);

    if (fpsEl) fpsEl.textContent = String(Math.round(this.fps));
    if (fpsBar) {
      const percent = Math.min(100, (this.fps / 60) * 100);
      fpsBar.style.width = `${percent}%`;
      if (this.fps >= 50) {
        fpsBar.style.background = '#22c55e';
      } else if (this.fps >= 30) {
        fpsBar.style.background = '#f97316';
      } else {
        fpsBar.style.background = '#ef4444';
      }
    }

    // Duration
    if (durationEl) {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      durationEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Update component list in Components tab
   */
  private updateComponentList(): void {
    if (!this.shadowRoot) return;

    const list = this.shadowRoot.getElementById('rc-component-list');
    if (!list) return;

    const components = Array.from(this.trackedComponents.entries())
      .sort((a, b) => b[1].count - a[1].count);

    if (components.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>
          <div>No components rendered yet</div>
        </div>
      `;
      return;
    }

    list.innerHTML = components.map(([name, tracked]) => {
      const color = SEVERITY_COLORS[tracked.severity];
      const avgTime = tracked.renderTimes.length > 0
        ? (tracked.renderTimes.reduce((a, b) => a + b, 0) / tracked.renderTimes.length).toFixed(1)
        : '0';
      const timeSince = Math.floor((Date.now() - tracked.lastRender) / 1000);
      const timeStr = timeSince < 60 ? `${timeSince}s ago` : `${Math.floor(timeSince / 60)}m ago`;

      return `
        <div class="component-item">
          <div class="component-severity" style="background: ${color}"></div>
          <div class="component-info">
            <div class="component-name">${name}</div>
            <div class="component-meta">${avgTime}ms avg · ${timeStr}</div>
          </div>
          <div class="component-count" style="color: ${color}">${tracked.count}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Update chain list in Chains tab
   */
  private updateChainList(): void {
    if (!this.shadowRoot) return;

    const list = this.shadowRoot.getElementById('rc-chain-list');
    if (!list) return;

    if (this.renderChains.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><path d="M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.43-.98 2.63-2.31 2.98l1.46 1.46C20.88 15.61 22 13.95 22 12c0-2.76-2.24-5-5-5z"/></svg>
          <div>No render chains detected</div>
        </div>
      `;
      return;
    }

    list.innerHTML = this.renderChains.slice(0, 10).map((chain) => {
      const flow = chain.chain.map((c) => `<span class="chain-node">${c}</span>`).join('<span class="chain-arrow">→</span>');
      return `
        <div class="chain-item">
          <div class="chain-header">
            <span class="chain-trigger">${chain.trigger}</span>
            <span class="chain-count">${chain.chain.length} components</span>
          </div>
          <div class="chain-flow">${flow}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Clear all visualizations
   */
  clear(): void {
    for (const timeout of this.fadeTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.fadeTimeouts.clear();

    for (const tracked of this.trackedComponents.values()) {
      tracked.highlightEl.remove();
    }
    this.trackedComponents.clear();
    this.renderChains = [];

    this.totalRenders = 0;
    this.startTime = Date.now();
    this.updateStats();
    this.updateComponentList();
    this.updateChainList();
  }

  /**
   * Show the overlay
   */
  show(): void {
    if (this.host) {
      this.host.style.display = 'block';
      this.visible = true;
    }
  }

  /**
   * Hide the overlay
   */
  hide(): void {
    if (this.host) {
      this.host.style.display = 'none';
      this.visible = false;
    }
  }

  /**
   * Toggle overlay visibility
   */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Update configuration
   */
  configure(config: Partial<OverlayConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if overlay is visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Get render counts
   */
  getRenderCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const [name, tracked] of this.trackedComponents) {
      counts.set(name, tracked.count);
    }
    return counts;
  }
}
