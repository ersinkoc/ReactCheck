/**
 * Browser overlay for render visualization
 * @packageDocumentation
 */

import type { RenderInfo, Severity } from '../types.js';

/**
 * Overlay configuration
 */
export interface OverlayConfig {
  /** Whether overlay is enabled */
  enabled: boolean;
  /** Whether to highlight renders */
  highlightRenders: boolean;
  /** Animation speed */
  animationSpeed: 'slow' | 'fast' | 'off';
  /** Whether to show badges */
  showBadges: boolean;
  /** Whether to show toolbar */
  showToolbar: boolean;
}

/**
 * Default overlay configuration
 */
const DEFAULT_CONFIG: OverlayConfig = {
  enabled: true,
  highlightRenders: true,
  animationSpeed: 'fast',
  showBadges: true,
  showToolbar: true,
};

/**
 * Color scheme for severity levels
 */
const SEVERITY_COLORS: Record<Severity | 'healthy' | 'unnecessary', string> = {
  critical: '#ef4444',
  warning: '#eab308',
  info: '#3b82f6',
  healthy: '#22c55e',
  unnecessary: '#6b7280',
};

/**
 * Animation durations
 */
const ANIMATION_DURATIONS: Record<OverlayConfig['animationSpeed'], number> = {
  slow: 1000,
  fast: 300,
  off: 0,
};

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

  /** Highlight elements */
  private highlights: Map<string, HTMLElement> = new Map();

  /** Badge elements */
  private badges: Map<string, HTMLElement> = new Map();

  /** Render counts for badges */
  private renderCounts: Map<string, number> = new Map();

  /** Toolbar element */
  private toolbar: HTMLElement | null = null;

  /** Whether overlay is visible */
  private visible: boolean = true;

  /**
   * Create a new overlay
   * @param config - Overlay configuration
   */
  constructor(config: Partial<OverlayConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the overlay
   */
  init(): void {
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
  }

  /**
   * Destroy the overlay
   */
  destroy(): void {
    // Clear highlights and badges
    this.highlights.clear();
    this.badges.clear();
    this.renderCounts.clear();

    // Remove host element
    if (this.host) {
      this.host.remove();
      this.host = null;
    }

    this.shadowRoot = null;
    this.toolbar = null;
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
      }

      .highlight {
        position: fixed;
        pointer-events: none;
        border-width: 2px;
        border-style: solid;
        transition: opacity 0.3s ease-out;
        z-index: 1;
      }

      .highlight.fade {
        opacity: 0;
      }

      .badge {
        position: fixed;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 10px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 4px;
        color: white;
        pointer-events: none;
        z-index: 2;
        white-space: nowrap;
      }

      .toolbar {
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.9);
        border-radius: 8px;
        padding: 8px 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        color: white;
        pointer-events: auto;
        z-index: 10;
        cursor: move;
        user-select: none;
      }

      .toolbar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .toolbar-title {
        font-weight: bold;
        color: #22c55e;
      }

      .toolbar-close {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        line-height: 1;
      }

      .toolbar-close:hover {
        color: white;
      }

      .toolbar-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }

      .stat {
        text-align: center;
      }

      .stat-value {
        font-size: 18px;
        font-weight: bold;
      }

      .stat-label {
        font-size: 10px;
        color: #9ca3af;
        text-transform: uppercase;
      }

      .stat-critical .stat-value { color: #ef4444; }
      .stat-warning .stat-value { color: #eab308; }
      .stat-healthy .stat-value { color: #22c55e; }

      .toolbar-controls {
        margin-top: 8px;
        display: flex;
        gap: 4px;
      }

      .toolbar-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 4px;
        color: white;
        padding: 4px 8px;
        font-size: 10px;
        cursor: pointer;
      }

      .toolbar-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .toolbar-btn.active {
        background: #3b82f6;
      }
    `;

    this.shadowRoot.appendChild(style);
  }

  /**
   * Create the floating toolbar
   */
  private createToolbar(): void {
    if (!this.shadowRoot) return;

    this.toolbar = document.createElement('div');
    this.toolbar.className = 'toolbar';
    this.toolbar.innerHTML = `
      <div class="toolbar-header">
        <span class="toolbar-title">ReactCheck</span>
        <button class="toolbar-close" title="Close">×</button>
      </div>
      <div class="toolbar-stats">
        <div class="stat stat-critical">
          <div class="stat-value" id="rc-critical">0</div>
          <div class="stat-label">Critical</div>
        </div>
        <div class="stat stat-warning">
          <div class="stat-value" id="rc-warning">0</div>
          <div class="stat-label">Warning</div>
        </div>
        <div class="stat stat-healthy">
          <div class="stat-value" id="rc-healthy">0</div>
          <div class="stat-label">Healthy</div>
        </div>
        <div class="stat">
          <div class="stat-value" id="rc-renders">0</div>
          <div class="stat-label">Renders</div>
        </div>
      </div>
      <div class="toolbar-controls">
        <button class="toolbar-btn active" id="rc-highlights">Highlights</button>
        <button class="toolbar-btn active" id="rc-badges">Badges</button>
        <button class="toolbar-btn" id="rc-clear">Clear</button>
      </div>
    `;

    // Set up event listeners
    this.setupToolbarEvents();

    // Make draggable
    this.makeDraggable(this.toolbar);

    this.shadowRoot.appendChild(this.toolbar);
  }

  /**
   * Set up toolbar event listeners
   */
  private setupToolbarEvents(): void {
    if (!this.toolbar || !this.shadowRoot) return;

    // Close button
    const closeBtn = this.toolbar.querySelector('.toolbar-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }

    // Toggle highlights
    const highlightsBtn = this.shadowRoot.getElementById('rc-highlights');
    if (highlightsBtn) {
      highlightsBtn.addEventListener('click', () => {
        this.config.highlightRenders = !this.config.highlightRenders;
        highlightsBtn.classList.toggle('active', this.config.highlightRenders);
        if (!this.config.highlightRenders) {
          this.clearHighlights();
        }
      });
    }

    // Toggle badges
    const badgesBtn = this.shadowRoot.getElementById('rc-badges');
    if (badgesBtn) {
      badgesBtn.addEventListener('click', () => {
        this.config.showBadges = !this.config.showBadges;
        badgesBtn.classList.toggle('active', this.config.showBadges);
        if (!this.config.showBadges) {
          this.clearBadges();
        }
      });
    }

    // Clear button
    const clearBtn = this.shadowRoot.getElementById('rc-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clear();
      });
    }
  }

  /**
   * Make an element draggable
   * @param element - Element to make draggable
   */
  private makeDraggable(element: HTMLElement): void {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;

    element.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
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

  /**
   * Highlight a component render
   * @param render - Render information
   * @param element - DOM element to highlight
   */
  highlight(render: RenderInfo, element: Element): void {
    if (!this.config.highlightRenders || !this.shadowRoot || !this.visible) return;

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const severity = this.getSeverity(render);
    const color = SEVERITY_COLORS[severity];

    // Get or create highlight element
    let highlight = this.highlights.get(render.componentName);
    if (!highlight) {
      highlight = document.createElement('div');
      highlight.className = 'highlight';
      this.shadowRoot.appendChild(highlight);
      this.highlights.set(render.componentName, highlight);
    }

    // Update position and style
    highlight.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid ${color};
      pointer-events: none;
      z-index: 1;
    `;
    highlight.classList.remove('fade');

    // Fade out
    const duration = ANIMATION_DURATIONS[this.config.animationSpeed];
    if (duration > 0) {
      setTimeout(() => {
        highlight?.classList.add('fade');
      }, duration);
    }

    // Update badge
    if (this.config.showBadges) {
      this.updateBadge(render, rect, color);
    }

    // Update stats
    this.updateStats();
  }

  /**
   * Update or create a badge for a component
   * @param render - Render information
   * @param rect - Bounding rectangle
   * @param color - Badge color
   */
  private updateBadge(render: RenderInfo, rect: DOMRect, color: string): void {
    if (!this.shadowRoot) return;

    // Update render count
    const count = (this.renderCounts.get(render.componentName) ?? 0) + 1;
    this.renderCounts.set(render.componentName, count);

    // Get or create badge
    let badge = this.badges.get(render.componentName);
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'badge';
      this.shadowRoot.appendChild(badge);
      this.badges.set(render.componentName, badge);
    }

    // Update badge
    badge.textContent = `${render.componentName}: ${count}`;
    badge.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${Math.max(0, rect.top - 20)}px;
      background: ${color};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
      color: white;
      pointer-events: none;
      z-index: 2;
      white-space: nowrap;
    `;
  }

  /**
   * Get severity level for a render
   * @param render - Render information
   * @returns Severity level
   */
  private getSeverity(render: RenderInfo): Severity | 'healthy' | 'unnecessary' {
    if (!render.necessary) return 'unnecessary';
    if (render.renderCount > 50) return 'critical';
    if (render.renderCount > 20) return 'warning';
    return 'healthy';
  }

  /**
   * Record a render event (updates stats even without DOM element)
   * @param render - Render information
   */
  recordRender(render: RenderInfo): void {
    // Update render count for this component
    const count = (this.renderCounts.get(render.componentName) ?? 0) + 1;
    this.renderCounts.set(render.componentName, count);

    // Update total renders
    this.totalRenders++;

    // Update stats display
    this.updateStats();
  }

  /** Total render count */
  private totalRenders: number = 0;

  /**
   * Update toolbar stats
   */
  private updateStats(): void {
    if (!this.shadowRoot) return;

    let critical = 0;
    let warning = 0;
    let healthy = 0;

    for (const [, count] of this.renderCounts) {
      if (count > 50) critical++;
      else if (count > 20) warning++;
      else healthy++;
    }

    const criticalEl = this.shadowRoot.getElementById('rc-critical');
    const warningEl = this.shadowRoot.getElementById('rc-warning');
    const healthyEl = this.shadowRoot.getElementById('rc-healthy');
    const rendersEl = this.shadowRoot.getElementById('rc-renders');

    if (criticalEl) criticalEl.textContent = String(critical);
    if (warningEl) warningEl.textContent = String(warning);
    if (healthyEl) healthyEl.textContent = String(healthy);
    if (rendersEl) rendersEl.textContent = String(this.totalRenders);
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    for (const highlight of this.highlights.values()) {
      highlight.remove();
    }
    this.highlights.clear();
  }

  /**
   * Clear all badges
   */
  clearBadges(): void {
    for (const badge of this.badges.values()) {
      badge.remove();
    }
    this.badges.clear();
  }

  /**
   * Clear all visualizations
   */
  clear(): void {
    this.clearHighlights();
    this.clearBadges();
    this.renderCounts.clear();
    this.totalRenders = 0;
    this.updateStats();
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
   * @param config - Partial configuration
   */
  configure(config: Partial<OverlayConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if overlay is visible
   * @returns true if visible
   */
  isVisible(): boolean {
    return this.visible;
  }
}
