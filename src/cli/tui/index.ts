/**
 * Main TUI (Terminal User Interface) renderer
 * @packageDocumentation
 */

import type { ComponentStats, SessionSummary, FixSuggestion, RenderChainInfo } from '../../types.js';
import { colors, semantic, getSeverityEmoji } from '../../utils/colors.js';
import { formatDuration, formatNumber, formatFps, formatRenderTime } from '../../utils/format.js';
import { ScreenBuffer, ANSI } from './screen.js';
import { drawBox, drawDivider, createProgressBar, getSpinner } from './box.js';
import { List, createComponentListItems, type ListItem } from './list.js';
import { InputHandler, KeyBindings } from './input.js';
import { EventEmitter } from '../../utils/event-emitter.js';

/**
 * TUI state
 */
export interface TUIState {
  /** Target URL */
  target: string;
  /** Session start time */
  startTime: number;
  /** Current FPS */
  fps: number;
  /** Component statistics */
  components: ComponentStats[];
  /** Session summary */
  summary: SessionSummary;
  /** Fix suggestions */
  suggestions: FixSuggestion[];
  /** Recent render chains */
  chains: RenderChainInfo[];
  /** Whether scanning is paused */
  paused: boolean;
  /** Current view mode */
  view: 'list' | 'details' | 'fix' | 'chain';
  /** Selected component for details */
  selectedComponent?: ComponentStats;
}

/**
 * TUI events
 */
export interface TUIEvents {
  /** Index signature for EventMap compatibility */
  [key: string]: unknown;
  /** Quit requested */
  quit: void;
  /** Pause/resume requested */
  togglePause: void;
  /** Report generation requested */
  generateReport: void;
  /** Settings requested */
  openSettings: void;
  /** Component selected */
  selectComponent: ComponentStats;
  /** View changed */
  viewChange: TUIState['view'];
}

/**
 * Default TUI state
 */
function createDefaultState(target: string): TUIState {
  return {
    target,
    startTime: Date.now(),
    fps: 60,
    components: [],
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
    suggestions: [],
    chains: [],
    paused: false,
    view: 'list',
  };
}

/**
 * Terminal User Interface for ReactCheck
 */
export class TUI extends EventEmitter<TUIEvents> {
  /** Screen buffer */
  private screen: ScreenBuffer;

  /** Input handler */
  private input: InputHandler;

  /** Key bindings */
  private keys: KeyBindings;

  /** Component list */
  private componentList: List<ComponentStats>;

  /** Current state */
  private state: TUIState;

  /** Whether TUI is running */
  private running: boolean = false;

  /** Render interval */
  private renderInterval: ReturnType<typeof setInterval> | null = null;

  /** Spinner frame */
  private spinnerFrame: number = 0;

  /** Data provider function for polling */
  private dataProvider: (() => Partial<TUIState>) | null = null;

  /**
   * Create a new TUI
   * @param target - Target URL
   */
  constructor(target: string) {
    super();

    this.screen = new ScreenBuffer();
    this.input = new InputHandler();
    this.keys = new KeyBindings(this.input);
    this.state = createDefaultState(target);

    // Initialize component list with default height
    const { height } = this.screen.getSize();
    this.componentList = new List<ComponentStats>(height - 12, {
      severityColors: true,
      showScrollbar: true,
    });

    this.setupKeyBindings();
  }

  /**
   * Set up key bindings
   */
  private setupKeyBindings(): void {
    // Navigation
    this.keys.bind('up', () => this.componentList.moveUp());
    this.keys.bind('k', () => this.componentList.moveUp());
    this.keys.bind('down', () => this.componentList.moveDown());
    this.keys.bind('j', () => this.componentList.moveDown());
    this.keys.bind('pageup', () => this.componentList.pageUp());
    this.keys.bind('pagedown', () => this.componentList.pageDown());
    this.keys.bind('home', () => this.componentList.moveToStart());
    this.keys.bind('end', () => this.componentList.moveToEnd());

    // Actions
    this.keys.bind('enter', () => this.handleSelect());
    this.keys.bind('escape', () => this.handleBack());
    this.keys.bind('q', () => this.emit('quit', undefined));
    this.keys.bind('ctrl+c', () => this.emit('quit', undefined));
    this.keys.bind('p', () => this.emit('togglePause', undefined));
    this.keys.bind('r', () => this.emit('generateReport', undefined));
    this.keys.bind('s', () => this.emit('openSettings', undefined));
    this.keys.bind('f', () => this.showFixSuggestions());
    this.keys.bind('c', () => this.showRenderChain());
  }

  /**
   * Start the TUI
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.screen.enableAltScreen();
    this.screen.hideCursor();
    this.input.start(true);

    // Handle terminal resize
    process.stdout.on('resize', () => {
      this.screen.updateSize();
      const { height } = this.screen.getSize();
      this.componentList.setVisibleHeight(height - 12);
      this.render();
    });

    // Start render loop with data polling
    this.renderInterval = setInterval(() => {
      this.spinnerFrame++;
      // Poll data from provider if available
      if (this.dataProvider) {
        try {
          const data = this.dataProvider();
          // Always update if we have valid data
          this.state = { ...this.state, ...data };
          // Update component list
          if (data.components && data.components.length > 0) {
            const items = createComponentListItems(data.components);
            this.componentList.setItems(items);
          }
        } catch {
          // Ignore errors during data polling
        }
      }
      this.render();
    }, 250);

    this.render();
  }

  /**
   * Set data provider for polling
   * @param provider - Function that returns current data
   */
  setDataProvider(provider: () => Partial<TUIState>): void {
    this.dataProvider = provider;
  }

  /**
   * Stop the TUI
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;

    if (this.renderInterval) {
      clearInterval(this.renderInterval);
      this.renderInterval = null;
    }

    this.input.stop();
    this.screen.disableAltScreen();
    this.screen.showCursor();
  }

  /**
   * Update TUI state
   * @param update - Partial state update
   */
  update(update: Partial<TUIState>): void {
    this.state = { ...this.state, ...update };

    // Update component list
    if (update.components) {
      const items = createComponentListItems(update.components);
      this.componentList.setItems(items);
    }

    if (this.running) {
      this.render();
    }
  }

  /**
   * Render the TUI
   */
  private render(): void {
    const { width, height } = this.screen.getSize();
    this.screen.clear();

    // Draw main box
    drawBox(this.screen, 0, 0, width, height, {
      style: 'rounded',
      title: 'ReactCheck',
      titleColor: colors.cyan + colors.bold,
      borderColor: colors.gray,
    });

    // Header
    this.renderHeader(1, 1, width - 2);

    // Divider
    drawDivider(this.screen, 0, 3, width, 'single', colors.gray);

    // Content based on view
    switch (this.state.view) {
      case 'details':
        this.renderDetails(1, 4, width - 2, height - 7);
        break;
      case 'fix':
        this.renderFix(1, 4, width - 2, height - 7);
        break;
      case 'chain':
        this.renderChain(1, 4, width - 2, height - 7);
        break;
      case 'list':
      default:
        this.renderComponentList(1, 4, width - 2, height - 7);
        break;
    }

    // Footer
    drawDivider(this.screen, 0, height - 3, width, 'single', colors.gray);
    this.renderFooter(1, height - 2, width - 2);

    // Flush to screen (force full redraw)
    this.screen.render(true);
  }

  /**
   * Render header
   */
  private renderHeader(x: number, y: number, width: number): void {
    const { target, fps, paused, summary, startTime } = this.state;
    const elapsed = Date.now() - startTime;

    // Status indicator
    let statusIcon: string;
    if (paused) {
      statusIcon = colors.yellow + '⏸ Paused' + colors.reset;
    } else {
      statusIcon = colors.green + getSpinner(this.spinnerFrame) + ' Scanning' + colors.reset;
    }

    // Left side: Target and status
    const left = `${statusIcon}  Target: ${semantic.highlight(target)}  Duration: ${formatDuration(elapsed)}`;
    this.screen.writeText(x, y, left, width);

    // Right side: FPS and summary
    const fpsColor = fps < 30 ? colors.red : fps < 50 ? colors.yellow : colors.green;
    const right = `FPS: ${fpsColor}${formatFps(fps)}${colors.reset}  Components: ${summary.totalComponents}  Renders: ${formatNumber(summary.totalRenders)}`;
    this.screen.writeText(x, y + 1, right, width);
  }

  /**
   * Render component list
   */
  private renderComponentList(x: number, y: number, width: number, height: number): void {
    const { summary } = this.state;

    // Summary line
    const criticalText = summary.criticalIssues > 0
      ? `${getSeverityEmoji('critical')} Critical: ${summary.criticalIssues}  `
      : '';
    const warningText = summary.warnings > 0
      ? `${getSeverityEmoji('warning')} Warning: ${summary.warnings}  `
      : '';
    const healthyText = `${getSeverityEmoji('healthy')} Healthy: ${summary.healthy}`;

    this.screen.writeText(x, y, criticalText + warningText + healthyText, width);

    // Component list
    this.componentList.setVisibleHeight(height - 2);
    this.componentList.render(this.screen, x, y + 2, width);
  }

  /**
   * Render component details
   */
  private renderDetails(x: number, y: number, width: number, height: number): void {
    const component = this.state.selectedComponent;
    if (!component) {
      this.screen.writeText(x, y, colors.gray + 'No component selected' + colors.reset);
      return;
    }

    const lines: string[] = [];

    // Component name
    lines.push(colors.bold + component.name + colors.reset);
    lines.push('');

    // Statistics
    lines.push(`${getSeverityEmoji(component.severity)} Severity: ${component.severity.toUpperCase()}`);
    lines.push(`Total Renders: ${formatNumber(component.renders)}`);
    lines.push(`Unnecessary Renders: ${formatNumber(component.unnecessary)}`);
    lines.push(`Avg Render Time: ${formatRenderTime(component.avgRenderTime)}`);
    lines.push(`Max Render Time: ${formatRenderTime(component.maxRenderTime)}`);
    lines.push('');

    // Render chain
    if (component.chain.length > 0) {
      lines.push(colors.bold + 'Render Chain:' + colors.reset);
      lines.push('  ' + component.chain.join(' → '));
      lines.push('');
    }

    // Parent
    if (component.parent) {
      lines.push(`Parent: ${component.parent}`);
    }

    // Render lines
    for (let i = 0; i < Math.min(lines.length, height); i++) {
      const line = lines[i];
      if (line !== undefined) {
        this.screen.writeText(x, y + i, line, width);
      }
    }
  }

  /**
   * Render fix suggestions
   */
  private renderFix(x: number, y: number, width: number, height: number): void {
    const component = this.state.selectedComponent;
    const suggestions = component
      ? this.state.suggestions.filter((s) => s.componentName === component.name)
      : [];

    if (suggestions.length === 0) {
      this.screen.writeText(x, y, colors.gray + 'No fix suggestions available' + colors.reset);
      return;
    }

    let row = y;
    for (const suggestion of suggestions) {
      if (row >= y + height) break;

      // Suggestion header
      const severityEmoji = getSeverityEmoji(suggestion.severity);
      this.screen.writeText(x, row++, `${severityEmoji} ${colors.bold}${suggestion.fix}${colors.reset}`);

      // Issue
      this.screen.writeText(x + 2, row++, suggestion.issue, width - 2);

      // Cause
      if (row < y + height) {
        this.screen.writeText(x + 2, row++, colors.gray + suggestion.cause + colors.reset, width - 2);
      }

      // Code after (truncated)
      if (row < y + height - 2) {
        row++;
        this.screen.writeText(x + 2, row++, colors.green + 'Suggested fix:' + colors.reset);
        const codeLines = suggestion.codeAfter.split('\n').slice(0, 3);
        for (const codeLine of codeLines) {
          if (row >= y + height) break;
          this.screen.writeText(x + 4, row++, colors.cyan + codeLine + colors.reset, width - 4);
        }
      }

      row += 2;
    }
  }

  /**
   * Render chain view
   */
  private renderChain(x: number, y: number, width: number, height: number): void {
    const chains = this.state.chains.slice(0, 5);

    if (chains.length === 0) {
      this.screen.writeText(x, y, colors.gray + 'No render chains detected' + colors.reset);
      return;
    }

    let row = y;
    for (const chain of chains) {
      if (row >= y + height) break;

      // Chain header
      this.screen.writeText(x, row++, colors.bold + `Trigger: ${chain.trigger}` + colors.reset);

      // Chain visualization
      const chainStr = chain.chain.map((c, i) => {
        if (i === 0) return colors.red + c + colors.reset;
        return colors.yellow + c + colors.reset;
      }).join(' → ');

      this.screen.writeText(x + 2, row++, chainStr, width - 2);

      // Stats
      this.screen.writeText(
        x + 2,
        row++,
        colors.gray + `Depth: ${chain.depth}  Total Renders: ${chain.totalRenders}` + colors.reset
      );

      row++;
    }
  }

  /**
   * Render footer with keybindings
   */
  private renderFooter(x: number, y: number, width: number): void {
    const bindings = this.state.view === 'list'
      ? '[j/k] Navigate  [Enter] Details  [f] Fix  [c] Chain  [r] Report  [p] Pause  [q] Quit'
      : '[Esc] Back  [f] Fix  [c] Chain  [r] Report  [p] Pause  [q] Quit';

    this.screen.writeText(x, y, colors.gray + bindings + colors.reset, width);
  }

  /**
   * Handle item selection
   */
  private handleSelect(): void {
    const selected = this.componentList.getSelected();
    if (selected) {
      this.state.selectedComponent = selected.value;
      this.state.view = 'details';
      this.emit('selectComponent', selected.value);
    }
  }

  /**
   * Handle back navigation
   */
  private handleBack(): void {
    if (this.state.view !== 'list') {
      this.state.view = 'list';
      this.emit('viewChange', 'list');
    }
  }

  /**
   * Show fix suggestions for selected component
   */
  private showFixSuggestions(): void {
    if (this.state.selectedComponent ?? this.componentList.getSelected()) {
      if (!this.state.selectedComponent) {
        this.state.selectedComponent = this.componentList.getSelected()?.value;
      }
      this.state.view = 'fix';
      this.emit('viewChange', 'fix');
    }
  }

  /**
   * Show render chain view
   */
  private showRenderChain(): void {
    this.state.view = 'chain';
    this.emit('viewChange', 'chain');
  }

  /**
   * Get current state
   * @returns Current TUI state
   */
  getState(): TUIState {
    return { ...this.state };
  }

  /**
   * Check if TUI is running
   * @returns true if running
   */
  isRunning(): boolean {
    return this.running;
  }
}

// Export sub-modules
export { ScreenBuffer, ANSI } from './screen.js';
export { drawBox, drawDivider, createProgressBar, BoxChars } from './box.js';
export { List, type ListItem } from './list.js';
export { InputHandler, KeyBindings, type KeyEvent } from './input.js';
