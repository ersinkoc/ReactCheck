/**
 * Core type definitions for ReactCheck
 * @packageDocumentation
 */

// ============================================================================
// Render Information
// ============================================================================

/**
 * Information about a single component render
 */
export interface RenderInfo {
  /** Name of the React component */
  componentName: string;
  /** Total number of renders for this component in the session */
  renderCount: number;
  /** Duration of this render in milliseconds */
  renderTime: number;
  /** Render phase: initial mount or update */
  phase: 'mount' | 'update';
  /** Whether this render was necessary (caused DOM changes) */
  necessary: boolean;
  /** Timestamp when render occurred */
  timestamp: number;
  /** Unique identifier for the component instance */
  instanceId?: string;
  /** Props that changed (if applicable) */
  changedProps?: string[];
  /** State keys that changed (if applicable) */
  changedState?: string[];
}

/**
 * Information about a cascade of renders (render chain)
 */
export interface RenderChainInfo {
  /** What triggered the chain (e.g., 'UserContext.value', 'setState in App') */
  trigger: string;
  /** Component names in render order */
  chain: string[];
  /** Depth of the chain (number of components) */
  depth: number;
  /** Total number of renders caused by this chain */
  totalRenders: number;
  /** The root cause component that started the chain */
  rootCause: string;
  /** Timestamp when chain was detected */
  timestamp: number;
  /** Whether this chain was caused by a context update */
  isContextTriggered: boolean;
}

// ============================================================================
// Fix Suggestions
// ============================================================================

/**
 * Types of fixes that can be suggested
 */
export type FixType =
  | 'React.memo'
  | 'useMemo'
  | 'useCallback'
  | 'context-split'
  | 'state-colocation'
  | 'component-extraction';

/**
 * Severity levels for issues
 */
export type Severity = 'critical' | 'warning' | 'info';

/**
 * A fix suggestion for a component
 */
export interface FixSuggestion {
  /** Name of the component */
  componentName: string;
  /** Severity of the issue */
  severity: Severity;
  /** Description of the issue */
  issue: string;
  /** What caused the issue */
  cause: string;
  /** Type of fix recommended */
  fix: FixType;
  /** Code before the fix */
  codeBefore: string;
  /** Code after applying the fix */
  codeAfter: string;
  /** Explanation of why this fix works */
  explanation: string;
  /** Expected improvement after applying fix */
  impact?: string;
}

// ============================================================================
// Component Statistics
// ============================================================================

/**
 * Statistics for a single component
 */
export interface ComponentStats {
  /** Component name */
  name: string;
  /** Total render count */
  renders: number;
  /** Expected number of renders (heuristic) */
  expectedRenders: number;
  /** Average render time in ms */
  avgRenderTime: number;
  /** Maximum render time in ms */
  maxRenderTime: number;
  /** Minimum render time in ms */
  minRenderTime: number;
  /** Total render time in ms */
  totalRenderTime: number;
  /** Number of unnecessary renders */
  unnecessary: number;
  /** Current severity level */
  severity: Severity | 'healthy';
  /** Render chain this component is part of */
  chain: string[];
  /** Suggested fixes */
  fixes: FixSuggestion[];
  /** First render timestamp */
  firstRender: number;
  /** Last render timestamp */
  lastRender: number;
  /** Whether props changed on last render */
  propsChanged: boolean;
  /** Whether state changed on last render */
  stateChanged: boolean;
  /** Parent component name */
  parent?: string;
}

// ============================================================================
// Session and Reports
// ============================================================================

/**
 * Session information
 */
export interface SessionInfo {
  /** Target URL being scanned */
  url: string;
  /** Session duration in milliseconds */
  duration: number;
  /** Session start timestamp (ISO string) */
  timestamp: string;
  /** Session ID */
  id: string;
}

/**
 * Session summary statistics
 */
export interface SessionSummary {
  /** Total number of unique components */
  totalComponents: number;
  /** Total number of renders */
  totalRenders: number;
  /** Number of critical issues */
  criticalIssues: number;
  /** Number of warnings */
  warnings: number;
  /** Number of healthy components */
  healthy: number;
  /** Average FPS during session */
  avgFps: number;
  /** Minimum FPS recorded */
  minFps: number;
  /** Total unnecessary renders */
  unnecessaryRenders: number;
}

/**
 * Timeline event for tracking activity
 */
export interface TimelineEvent {
  /** Event type */
  type: 'render' | 'chain' | 'fps-drop' | 'mount' | 'unmount';
  /** Timestamp */
  timestamp: number;
  /** Event data */
  data: RenderInfo | RenderChainInfo | number | string;
}

/**
 * Framework detection result
 */
export interface FrameworkInfo {
  /** Framework name */
  name: 'next' | 'remix' | 'vite' | 'cra' | 'gatsby' | 'unknown';
  /** Framework version */
  version: string;
  /** Detected features */
  features: string[];
  /** Framework-specific tips */
  tips: string[];
}

/**
 * Complete session report
 */
export interface SessionReport {
  /** Report version */
  version: string;
  /** Generation timestamp (ISO string) */
  generated: string;
  /** Session information */
  session: SessionInfo;
  /** Summary statistics */
  summary: SessionSummary;
  /** Per-component statistics */
  components: ComponentStats[];
  /** Detected render chains */
  chains: RenderChainInfo[];
  /** Timeline of events */
  timeline: TimelineEvent[];
  /** Detected framework */
  framework: FrameworkInfo | null;
  /** All fix suggestions */
  suggestions: FixSuggestion[];
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Threshold configuration
 */
export interface ThresholdOptions {
  /** Render count threshold for critical severity */
  critical: number;
  /** Render count threshold for warning severity */
  warning: number;
  /** FPS threshold for alerts */
  fps: number;
}

/**
 * Report generation options
 */
export interface ReportOptions {
  /** Whether to generate reports */
  enabled: boolean;
  /** Report formats to generate */
  formats: Array<'html' | 'json' | 'md'>;
  /** Output directory for reports */
  output: string;
  /** Whether to include source code in reports */
  includeSourceCode?: boolean;
}

/**
 * Browser overlay options
 */
export interface OverlayOptions {
  /** Whether overlay is enabled */
  enabled: boolean;
  /** Whether to highlight renders */
  highlightRenders: boolean;
  /** Animation speed for highlights */
  animationSpeed: 'slow' | 'fast' | 'off';
  /** Whether to show render count badges */
  showBadges?: boolean;
  /** Whether to show toolbar */
  showToolbar?: boolean;
}

/**
 * Framework-specific options
 */
export interface FrameworkOptions {
  /** Auto-detect framework */
  autoDetect: boolean;
  /** Force specific framework */
  force?: FrameworkInfo['name'];
}

/**
 * Custom rule configuration
 */
export interface RuleOptions {
  /** Rule for inline function props */
  'no-inline-functions'?: 'off' | 'warn' | 'error';
  /** Rule for preferring React.memo */
  'prefer-memo'?: 'off' | 'warn' | 'error';
  /** Rule for context size */
  'context-size'?: ['off' | 'warn' | 'error', { maxConsumers: number }];
}

/**
 * Main ReactCheck options
 */
export interface ReactCheckOptions {
  /** Target URL to scan */
  target: string;
  /** Operation mode */
  mode: 'browser' | 'proxy' | 'headless';
  /** Enable fix suggestions */
  fix: boolean;
  /** Verbose output */
  verbose: boolean;
  /** Report options */
  report: ReportOptions;
  /** Enable TUI */
  tui: boolean;
  /** Overlay options */
  overlay: OverlayOptions;
  /** Threshold options */
  thresholds: ThresholdOptions;
  /** Framework options */
  framework: FrameworkOptions;
  /** WebSocket port */
  port: number;
}

/**
 * Configuration file format
 */
export interface ReactCheckConfig {
  /** Extend another config file */
  extends?: string;
  /** Components to include (glob patterns) */
  include?: string[];
  /** Components to exclude */
  exclude?: string[];
  /** Threshold settings */
  thresholds?: Partial<ThresholdOptions>;
  /** Report settings */
  report?: Partial<ReportOptions>;
  /** Custom rules */
  rules?: RuleOptions;
}

// ============================================================================
// Communication Protocol
// ============================================================================

/**
 * Messages sent from browser to CLI
 */
export type BrowserMessage =
  | { type: 'render'; payload: RenderInfo }
  | { type: 'chain'; payload: RenderChainInfo }
  | { type: 'fps'; payload: number }
  | { type: 'component-tree'; payload: ComponentNode[] }
  | { type: 'ready'; payload: { reactVersion: string } }
  | { type: 'error'; payload: { message: string; code: string } };

/**
 * Messages sent from CLI to browser
 */
export type CLIMessage =
  | { type: 'start' }
  | { type: 'stop' }
  | { type: 'reset' }
  | { type: 'config'; payload: Partial<ScannerConfig> }
  | { type: 'highlight'; payload: { component: string; enabled: boolean } };

/**
 * Scanner configuration sent to browser
 */
export interface ScannerConfig {
  /** Track unnecessary renders */
  trackUnnecessary: boolean;
  /** FPS threshold */
  fpsThreshold: number;
  /** Highlight renders in overlay */
  highlightRenders: boolean;
  /** Animation speed */
  animationSpeed: 'slow' | 'fast' | 'off';
  /** Components to include */
  include?: string[];
  /** Components to exclude */
  exclude?: string[];
}

/**
 * Component tree node
 */
export interface ComponentNode {
  /** Component name */
  name: string;
  /** Unique ID */
  id: string;
  /** Children components */
  children: ComponentNode[];
  /** Render count */
  renderCount: number;
  /** Current severity */
  severity: Severity | 'healthy';
}

// ============================================================================
// Errors
// ============================================================================

/**
 * Error codes
 */
export enum ErrorCode {
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  REACT_NOT_FOUND = 'REACT_NOT_FOUND',
  BROWSER_LAUNCH_FAILED = 'BROWSER_LAUNCH_FAILED',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  REPORT_WRITE_FAILED = 'REPORT_WRITE_FAILED',
  INVALID_URL = 'INVALID_URL',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error class for ReactCheck
 */
export class ReactCheckError extends Error {
  /** Error code */
  code: ErrorCode;
  /** Additional error details */
  details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ReactCheckError';
    this.code = code;
    this.details = details;
  }
}

// ============================================================================
// Events
// ============================================================================

/**
 * Event types emitted by ReactCheck
 */
export interface ReactCheckEvents {
  /** Emitted on each render */
  render: (info: RenderInfo) => void;
  /** Emitted when a render chain is detected */
  chain: (chain: RenderChainInfo) => void;
  /** Emitted when a fix suggestion is generated */
  fix: (suggestion: FixSuggestion) => void;
  /** Emitted when FPS drops below threshold */
  'fps-drop': (fps: number) => void;
  /** Emitted when scanner is ready */
  ready: (info: { reactVersion: string }) => void;
  /** Emitted on error */
  error: (error: ReactCheckError) => void;
  /** Emitted when scanning starts */
  start: () => void;
  /** Emitted when scanning stops */
  stop: () => void;
}

// ============================================================================
// Internal Types (for fiber access)
// ============================================================================

/**
 * Simplified React Fiber node type
 */
export interface FiberNode {
  tag: number;
  type: FiberType;
  key: string | null;
  stateNode: unknown;
  return: FiberNode | null;
  child: FiberNode | null;
  sibling: FiberNode | null;
  memoizedProps: Record<string, unknown> | null;
  memoizedState: unknown;
  actualDuration?: number;
  actualStartTime?: number;
  selfBaseDuration?: number;
  _debugOwner?: FiberNode | null;
}

/**
 * Fiber type (function or class component)
 */
export type FiberType =
  | string
  | ((...args: unknown[]) => unknown) & { name?: string; displayName?: string }
  | { name?: string; displayName?: string }
  | null;

/**
 * React DevTools global hook interface
 */
export interface ReactDevToolsHook {
  renderers: Map<number, unknown>;
  supportsFiber: boolean;
  inject: (renderer: unknown) => number;
  onCommitFiberRoot: (
    rendererID: number,
    root: { current: FiberNode },
    priorityLevel: unknown
  ) => void;
  onCommitFiberUnmount: (rendererID: number, fiber: FiberNode) => void;
}

/**
 * Window with React DevTools hook
 */
export interface WindowWithReactDevTools extends Window {
  __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevToolsHook;
  __REACTCHECK_INJECTED__?: boolean;
  __REACTCHECK_PORT__?: number;
}
