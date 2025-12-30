/**
 * Fix suggestion engine - analyzes render patterns and suggests optimizations
 * @packageDocumentation
 */

import type { ComponentStats, FixSuggestion, FixType, Severity } from '../types.js';
import { EventEmitter } from '../utils/event-emitter.js';

/**
 * Events emitted by FixSuggester
 */
export interface FixEvents {
  /** Index signature for EventMap compatibility */
  [key: string]: unknown;
  /** Emitted when a new fix suggestion is generated */
  suggestion: FixSuggestion;
}

/**
 * Rule for detecting issues and suggesting fixes
 */
interface FixRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Fix type to suggest */
  fixType: FixType;
  /** Priority (lower = higher priority) */
  priority: number;
  /** Check if rule applies to component */
  detect: (stats: ComponentStats) => boolean;
  /** Generate fix suggestion */
  suggest: (stats: ComponentStats) => Omit<FixSuggestion, 'componentName' | 'fix'>;
}

/**
 * Built-in fix rules
 */
const BUILTIN_RULES: FixRule[] = [
  // React.memo rule
  {
    id: 'unnecessary-rerenders-memo',
    name: 'Unnecessary Re-renders (memo)',
    description: 'Component re-renders frequently without prop changes',
    fixType: 'React.memo',
    priority: 1,
    detect: (stats) => {
      // High render count with mostly unnecessary renders
      const unnecessaryRatio = stats.renders > 0 ? stats.unnecessary / stats.renders : 0;
      return stats.renders >= 10 && unnecessaryRatio >= 0.5 && !stats.propsChanged;
    },
    suggest: (stats) => ({
      severity: stats.severity === 'healthy' ? 'info' : stats.severity,
      issue: `Component "${stats.name}" re-renders ${stats.unnecessary} times unnecessarily out of ${stats.renders} total renders`,
      cause: stats.parent
        ? `Parent component "${stats.parent}" re-renders and causes cascading updates`
        : 'Parent component re-renders propagate to this component',
      codeBefore: generateComponentCode(stats.name, 'function'),
      codeAfter: generateMemoCode(stats.name),
      explanation:
        'React.memo is a higher-order component that prevents re-renders when props are unchanged. ' +
        'It performs a shallow comparison of props and skips rendering if they match.',
      impact: `Could prevent ~${stats.unnecessary} unnecessary renders (${Math.round((stats.unnecessary / stats.renders) * 100)}% reduction)`,
    }),
  },

  // useMemo rule for expensive computations
  {
    id: 'expensive-computation-memo',
    name: 'Expensive Computation',
    description: 'Component has high render times suggesting expensive calculations',
    fixType: 'useMemo',
    priority: 2,
    detect: (stats) => {
      // High average render time indicates expensive computation
      return stats.avgRenderTime > 16 && stats.renders >= 5;
    },
    suggest: (stats) => ({
      severity: stats.avgRenderTime > 50 ? 'critical' : 'warning',
      issue: `Component "${stats.name}" has slow renders averaging ${stats.avgRenderTime.toFixed(1)}ms`,
      cause:
        'Expensive calculations or data transformations are being performed on every render',
      codeBefore: generateExpensiveCode(stats.name),
      codeAfter: generateUseMemoCode(stats.name),
      explanation:
        'useMemo caches the result of expensive computations between renders. ' +
        'It only recalculates when dependencies change, improving performance.',
      impact: `Could reduce render time from ${stats.avgRenderTime.toFixed(1)}ms to <1ms for cached renders`,
    }),
  },

  // useCallback rule for function props
  {
    id: 'function-prop-stability',
    name: 'Unstable Function Props',
    description: 'Component passes inline functions as props causing child re-renders',
    fixType: 'useCallback',
    priority: 3,
    detect: (stats) => {
      // Component with high renders and has children that also render frequently
      return stats.renders >= 15 && stats.propsChanged;
    },
    suggest: (stats) => ({
      severity: stats.severity === 'healthy' ? 'info' : stats.severity,
      issue: `Component "${stats.name}" may be passing unstable function references as props`,
      cause:
        'Inline arrow functions are recreated on every render, causing children with React.memo to re-render',
      codeBefore: generateInlineFunctionCode(stats.name),
      codeAfter: generateUseCallbackCode(stats.name),
      explanation:
        'useCallback returns a memoized callback that only changes when dependencies change. ' +
        'This stabilizes function references passed to child components.',
      impact: 'Stabilized function props allow memoized children to skip re-renders',
    }),
  },

  // Context split rule
  {
    id: 'context-over-subscription',
    name: 'Context Over-subscription',
    description: 'Context updates trigger unnecessary re-renders in unrelated components',
    fixType: 'context-split',
    priority: 4,
    detect: (stats) => {
      // High unnecessary renders without prop/state changes suggests context
      return (
        stats.renders >= 20 &&
        stats.unnecessary > stats.renders * 0.7 &&
        !stats.propsChanged &&
        !stats.stateChanged
      );
    },
    suggest: (stats) => ({
      severity: stats.severity === 'healthy' ? 'warning' : stats.severity,
      issue: `Component "${stats.name}" re-renders due to context updates it doesn't use`,
      cause:
        'A context this component subscribes to contains unrelated state that changes frequently',
      codeBefore: generateContextCode('AppContext'),
      codeAfter: generateSplitContextCode(),
      explanation:
        'Splitting large contexts into smaller, focused contexts prevents unrelated updates ' +
        'from triggering re-renders in components that only need part of the context.',
      impact: `Could eliminate ${stats.unnecessary} unnecessary renders caused by unrelated context updates`,
    }),
  },

  // State colocation rule
  {
    id: 'state-too-high',
    name: 'State Location',
    description: 'State is managed too high in the component tree',
    fixType: 'state-colocation',
    priority: 5,
    detect: (stats) => {
      // Component causes many cascading renders
      const chainDepth = stats.chain.length;
      return stats.renders >= 30 && chainDepth >= 3 && stats.stateChanged;
    },
    suggest: (stats) => ({
      severity: stats.severity === 'healthy' ? 'warning' : stats.severity,
      issue: `State changes in "${stats.name}" trigger a cascade of ${stats.chain.length} component re-renders`,
      cause: `State that only affects a subtree is managed at the "${stats.name}" level, causing unnecessary updates`,
      codeBefore: generateStateHighCode(stats.name),
      codeAfter: generateStateColocationCode(stats.name),
      explanation:
        'Moving state closer to where it\'s used (colocation) reduces the re-render scope. ' +
        'Only components that actually need the state will update.',
      impact: `Could reduce cascade depth from ${stats.chain.length} to 1-2 components`,
    }),
  },

  // Component extraction rule
  {
    id: 'extract-heavy-child',
    name: 'Component Extraction',
    description: 'Part of the component updates independently and should be extracted',
    fixType: 'component-extraction',
    priority: 6,
    detect: (stats) => {
      // Very high render count suggests a component doing too much
      return stats.renders >= 50 && stats.avgRenderTime > 5;
    },
    suggest: (stats) => ({
      severity: stats.severity === 'healthy' ? 'info' : stats.severity,
      issue: `Component "${stats.name}" renders frequently (${stats.renders} times) with mixed concerns`,
      cause:
        'The component contains parts that update at different rates, causing full re-renders',
      codeBefore: generateMonolithCode(stats.name),
      codeAfter: generateExtractedCode(stats.name),
      explanation:
        'Extracting frequently-updating parts into separate components allows React to ' +
        'optimize renders for each part independently.',
      impact: 'Isolates render cycles so fast-updating parts don\'t affect slow-updating parts',
    }),
  },
];

/**
 * Code generation helpers
 */
function generateComponentCode(name: string, type: 'function' | 'class'): string {
  if (type === 'class') {
    return `class ${name} extends React.Component {
  render() {
    return <div>{/* component content */}</div>;
  }
}`;
  }
  return `function ${name}({ prop1, prop2 }) {
  return (
    <div>
      {/* component content */}
    </div>
  );
}

export default ${name};`;
}

function generateMemoCode(name: string): string {
  return `import { memo } from 'react';

const ${name} = memo(function ${name}({ prop1, prop2 }) {
  return (
    <div>
      {/* component content */}
    </div>
  );
});

export default ${name};`;
}

function generateExpensiveCode(name: string): string {
  return `function ${name}({ items }) {
  // Expensive computation on every render
  const processed = items
    .filter(item => item.active)
    .map(item => transform(item))
    .sort((a, b) => a.value - b.value);

  return <List items={processed} />;
}`;
}

function generateUseMemoCode(name: string): string {
  return `import { useMemo } from 'react';

function ${name}({ items }) {
  // Computation cached until items change
  const processed = useMemo(() => {
    return items
      .filter(item => item.active)
      .map(item => transform(item))
      .sort((a, b) => a.value - b.value);
  }, [items]);

  return <List items={processed} />;
}`;
}

function generateInlineFunctionCode(name: string): string {
  return `function ${name}({ data }) {
  return (
    <ChildComponent
      onAction={(id) => handleAction(id)}  // New function every render!
      onClick={() => setOpen(true)}         // New function every render!
    />
  );
}`;
}

function generateUseCallbackCode(name: string): string {
  return `import { useCallback } from 'react';

function ${name}({ data }) {
  const handleAction = useCallback((id) => {
    // Handle action
  }, []); // Empty deps if no external dependencies

  const handleClick = useCallback(() => {
    setOpen(true);
  }, []);

  return (
    <ChildComponent
      onAction={handleAction}  // Stable reference
      onClick={handleClick}    // Stable reference
    />
  );
}`;
}

function generateContextCode(contextName: string): string {
  return `// Single large context with mixed concerns
const ${contextName} = createContext({
  user: null,
  theme: 'light',
  notifications: [],
  settings: {},
  cart: [],
  // ... many more values
});

// Every consumer re-renders when ANY value changes
function Component() {
  const { theme } = useContext(${contextName});
  // Re-renders when user, notifications, cart change too!
  return <div className={theme}>...</div>;
}`;
}

function generateSplitContextCode(): string {
  return `// Split into focused contexts
const UserContext = createContext(null);
const ThemeContext = createContext('light');
const NotificationContext = createContext([]);

// Only re-renders when theme changes
function Component() {
  const theme = useContext(ThemeContext);
  return <div className={theme}>...</div>;
}

// Provider composition
function App() {
  return (
    <UserContext.Provider value={user}>
      <ThemeContext.Provider value={theme}>
        <NotificationContext.Provider value={notifications}>
          <MainContent />
        </NotificationContext.Provider>
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}`;
}

function generateStateHighCode(name: string): string {
  return `function ${name}() {
  // State managed at top level
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  return (
    <div>
      <Header />
      <Sidebar />
      {/* Only SearchBox needs search state */}
      <SearchBox value={search} onChange={setSearch} />
      <MainContent filter={filter} />
      <Footer />
    </div>
  );
}`;
}

function generateStateColocationCode(name: string): string {
  return `function ${name}() {
  // Only filter needed at this level
  const [filter, setFilter] = useState('all');

  return (
    <div>
      <Header />
      <Sidebar />
      {/* SearchBox manages its own state */}
      <SearchBox />
      <MainContent filter={filter} />
      <Footer />
    </div>
  );
}

// State colocated with component that uses it
function SearchBox() {
  const [search, setSearch] = useState('');
  return <input value={search} onChange={e => setSearch(e.target.value)} />;
}`;
}

function generateMonolithCode(name: string): string {
  return `function ${name}() {
  const [counter, setCounter] = useState(0);
  const [data, setData] = useState(null);

  // Counter updates 10x/second
  useEffect(() => {
    const id = setInterval(() => setCounter(c => c + 1), 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <span>Count: {counter}</span>      {/* Updates frequently */}
      <ExpensiveChart data={data} />     {/* Re-renders unnecessarily! */}
      <DataTable data={data} />          {/* Re-renders unnecessarily! */}
    </div>
  );
}`;
}

function generateExtractedCode(name: string): string {
  return `function ${name}() {
  const [data, setData] = useState(null);

  return (
    <div>
      <LiveCounter />                    {/* Isolated updates */}
      <ExpensiveChart data={data} />     {/* Only updates when data changes */}
      <DataTable data={data} />          {/* Only updates when data changes */}
    </div>
  );
}

// Extracted component with isolated state
function LiveCounter() {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCounter(c => c + 1), 100);
    return () => clearInterval(id);
  }, []);

  return <span>Count: {counter}</span>;
}`;
}

/**
 * Fix suggestion engine that analyzes component stats and suggests optimizations
 */
export class FixSuggester extends EventEmitter<FixEvents> {
  /** Active rules */
  private rules: FixRule[];

  /** Generated suggestions cache */
  private suggestions: Map<string, FixSuggestion[]> = new Map();

  /** Rule configuration */
  private ruleConfig: Map<string, 'off' | 'warn' | 'error'> = new Map();

  /**
   * Create a new FixSuggester
   * @param options - Configuration options
   */
  constructor(
    options: {
      rules?: Record<string, 'off' | 'warn' | 'error'>;
    } = {}
  ) {
    super();
    this.rules = [...BUILTIN_RULES];

    // Apply rule configuration
    if (options.rules) {
      for (const [ruleId, setting] of Object.entries(options.rules)) {
        this.ruleConfig.set(ruleId, setting);
      }
    }
  }

  /**
   * Analyze a component and generate fix suggestions
   * @param stats - Component statistics
   * @returns Array of fix suggestions
   */
  analyze(stats: ComponentStats): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    for (const rule of this.rules) {
      // Check if rule is disabled
      const config = this.ruleConfig.get(rule.id);
      if (config === 'off') {
        continue;
      }

      // Check if rule applies
      if (!rule.detect(stats)) {
        continue;
      }

      // Generate suggestion
      const partialSuggestion = rule.suggest(stats);
      const suggestion: FixSuggestion = {
        componentName: stats.name,
        fix: rule.fixType,
        ...partialSuggestion,
      };

      // Override severity if rule is configured
      if (config === 'warn') {
        suggestion.severity = 'warning';
      } else if (config === 'error') {
        suggestion.severity = 'critical';
      }

      suggestions.push(suggestion);
      this.emit('suggestion', suggestion);
    }

    // Sort by priority and severity
    suggestions.sort((a, b) => {
      const severityOrder: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      const ruleA = this.rules.find((r) => r.fixType === a.fix);
      const ruleB = this.rules.find((r) => r.fixType === b.fix);
      return (ruleA?.priority ?? 99) - (ruleB?.priority ?? 99);
    });

    // Cache suggestions
    this.suggestions.set(stats.name, suggestions);

    return suggestions;
  }

  /**
   * Get cached suggestions for a component
   * @param componentName - Component name
   * @returns Cached suggestions or empty array
   */
  getSuggestions(componentName: string): FixSuggestion[] {
    return this.suggestions.get(componentName) ?? [];
  }

  /**
   * Get all cached suggestions
   * @returns All suggestions
   */
  getAllSuggestions(): FixSuggestion[] {
    return Array.from(this.suggestions.values()).flat();
  }

  /**
   * Get suggestions by severity
   * @param severity - Severity level
   * @returns Matching suggestions
   */
  getSuggestionsBySeverity(severity: Severity): FixSuggestion[] {
    return this.getAllSuggestions().filter((s) => s.severity === severity);
  }

  /**
   * Get suggestions by fix type
   * @param fixType - Fix type
   * @returns Matching suggestions
   */
  getSuggestionsByType(fixType: FixType): FixSuggestion[] {
    return this.getAllSuggestions().filter((s) => s.fix === fixType);
  }

  /**
   * Clear cached suggestions
   * @param componentName - Optional component to clear (clears all if not specified)
   */
  clearSuggestions(componentName?: string): void {
    if (componentName) {
      this.suggestions.delete(componentName);
    } else {
      this.suggestions.clear();
    }
  }

  /**
   * Configure a rule
   * @param ruleId - Rule identifier
   * @param setting - Rule setting
   */
  configureRule(ruleId: string, setting: 'off' | 'warn' | 'error'): void {
    this.ruleConfig.set(ruleId, setting);
  }

  /**
   * Get available rule IDs
   * @returns Array of rule IDs
   */
  getRuleIds(): string[] {
    return this.rules.map((r) => r.id);
  }

  /**
   * Get rule information
   * @param ruleId - Rule identifier
   * @returns Rule info or undefined
   */
  getRule(ruleId: string): { id: string; name: string; description: string; fixType: FixType } | undefined {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) return undefined;
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      fixType: rule.fixType,
    };
  }
}
