/**
 * React Fiber utilities for interacting with React internals
 * @packageDocumentation
 */

import type { FiberNode, FiberType, RenderInfo, ReactDevToolsHook } from '../types.js';

/**
 * Fiber tag constants (from React source)
 */
export const FiberTag = {
  FunctionComponent: 0,
  ClassComponent: 1,
  IndeterminateComponent: 2,
  HostRoot: 3,
  HostPortal: 4,
  HostComponent: 5,
  HostText: 6,
  Fragment: 7,
  Mode: 8,
  ContextConsumer: 9,
  ContextProvider: 10,
  ForwardRef: 11,
  Profiler: 12,
  SuspenseComponent: 13,
  MemoComponent: 14,
  SimpleMemoComponent: 15,
  LazyComponent: 16,
  IncompleteClassComponent: 17,
  DehydratedFragment: 18,
  SuspenseListComponent: 19,
  ScopeComponent: 21,
  OffscreenComponent: 22,
  LegacyHiddenComponent: 23,
  CacheComponent: 24,
} as const;

/**
 * Get the display name of a component from its fiber
 * @param fiber - Fiber node
 * @returns Component name or 'Unknown'
 */
export function getComponentName(fiber: FiberNode): string {
  if (!fiber) {
    return 'Unknown';
  }

  const { type, tag } = fiber;

  // Handle different fiber types
  switch (tag) {
    case FiberTag.FunctionComponent:
    case FiberTag.ClassComponent:
    case FiberTag.SimpleMemoComponent:
    case FiberTag.IncompleteClassComponent:
      return getTypeName(type) || 'Anonymous';

    case FiberTag.ForwardRef:
      // ForwardRef wraps the actual component
      if (type && typeof type === 'object' && 'render' in type) {
        const render = type.render as FiberType;
        return `ForwardRef(${getTypeName(render) || 'Anonymous'})`;
      }
      return 'ForwardRef';

    case FiberTag.MemoComponent:
      // Memo wraps the actual component
      if (type && typeof type === 'object' && 'type' in type) {
        const innerType = type.type as FiberType;
        return `Memo(${getTypeName(innerType) || 'Anonymous'})`;
      }
      return 'Memo';

    case FiberTag.LazyComponent:
      return 'Lazy';

    case FiberTag.ContextConsumer:
      return 'Context.Consumer';

    case FiberTag.ContextProvider:
      return 'Context.Provider';

    case FiberTag.SuspenseComponent:
      return 'Suspense';

    case FiberTag.Fragment:
      return 'Fragment';

    case FiberTag.Profiler:
      return 'Profiler';

    case FiberTag.HostRoot:
      return 'Root';

    case FiberTag.HostComponent:
      return typeof type === 'string' ? type : 'HostComponent';

    case FiberTag.HostText:
      return '#text';

    default:
      return getTypeName(type) || 'Unknown';
  }
}

/**
 * Get name from a fiber type
 * @param type - Fiber type
 * @returns Type name or undefined
 */
function getTypeName(type: FiberType): string | undefined {
  if (type === null || type === undefined) {
    return undefined;
  }

  if (typeof type === 'string') {
    return type;
  }

  if (typeof type === 'function') {
    return type.displayName ?? type.name ?? undefined;
  }

  if (typeof type === 'object') {
    const obj = type as { displayName?: string; name?: string };
    return obj.displayName ?? obj.name ?? undefined;
  }

  return undefined;
}

/**
 * Check if a fiber represents a user component (not a host element)
 * @param fiber - Fiber node
 * @returns true if user component
 */
export function isUserComponent(fiber: FiberNode): boolean {
  const { tag } = fiber;
  return (
    tag === FiberTag.FunctionComponent ||
    tag === FiberTag.ClassComponent ||
    tag === FiberTag.MemoComponent ||
    tag === FiberTag.SimpleMemoComponent ||
    tag === FiberTag.ForwardRef ||
    tag === FiberTag.LazyComponent
  );
}

/**
 * Check if a fiber represents a host element (DOM node)
 * @param fiber - Fiber node
 * @returns true if host element
 */
export function isHostComponent(fiber: FiberNode): boolean {
  return fiber.tag === FiberTag.HostComponent;
}

/**
 * Get the DOM node associated with a fiber
 * @param fiber - Fiber node
 * @returns DOM node or null
 */
export function getFiberDOMNode(fiber: FiberNode): Element | null {
  // For host components, stateNode is the DOM node
  if (fiber.tag === FiberTag.HostComponent) {
    return fiber.stateNode as Element | null;
  }

  // For composite components, traverse children
  let current: FiberNode | null = fiber.child;
  while (current) {
    if (current.tag === FiberTag.HostComponent) {
      return current.stateNode as Element | null;
    }
    // Try child first, then sibling
    if (current.child) {
      current = current.child;
    } else if (current.sibling) {
      current = current.sibling;
    } else {
      // Go up and try sibling
      current = current.return;
      while (current && !current.sibling) {
        current = current.return;
      }
      current = current?.sibling ?? null;
    }
  }

  return null;
}

/**
 * Get the parent component of a fiber
 * @param fiber - Fiber node
 * @returns Parent fiber or null
 */
export function getParentFiber(fiber: FiberNode): FiberNode | null {
  let parent = fiber.return;
  while (parent) {
    if (isUserComponent(parent)) {
      return parent;
    }
    parent = parent.return;
  }
  return null;
}

/**
 * Walk the fiber tree and call a function for each user component
 * @param root - Root fiber
 * @param callback - Function to call for each component
 */
export function walkFiberTree(root: FiberNode, callback: (fiber: FiberNode) => void | boolean): void {
  const stack: FiberNode[] = [root];

  while (stack.length > 0) {
    const fiber = stack.pop();
    if (!fiber) continue;

    // Call callback for user components
    if (isUserComponent(fiber)) {
      const shouldStop = callback(fiber);
      if (shouldStop === true) {
        return;
      }
    }

    // Add children to stack
    if (fiber.sibling) {
      stack.push(fiber.sibling);
    }
    if (fiber.child) {
      stack.push(fiber.child);
    }
  }
}

/**
 * Compare props to detect changes
 * @param prevProps - Previous props
 * @param nextProps - Next props
 * @returns Array of changed prop names
 */
export function getChangedProps(
  prevProps: Record<string, unknown> | null,
  nextProps: Record<string, unknown> | null
): string[] {
  if (prevProps === nextProps) return [];
  if (!prevProps || !nextProps) return Object.keys(nextProps ?? prevProps ?? {});

  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)]);

  for (const key of allKeys) {
    if (key === 'children') continue; // Skip children prop
    if (prevProps[key] !== nextProps[key]) {
      changed.push(key);
    }
  }

  return changed;
}

/**
 * Shallow compare two objects
 * @param a - First object
 * @param b - Second object
 * @returns true if shallow equal
 */
export function shallowEqual(
  a: Record<string, unknown> | null,
  b: Record<string, unknown> | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }

  return true;
}

/**
 * Create render info from a fiber commit
 * @param fiber - Fiber that rendered
 * @param phase - Render phase
 * @param prevProps - Previous props (for comparison)
 * @param prevState - Previous state (for comparison)
 * @returns Render info
 */
export function createRenderInfo(
  fiber: FiberNode,
  phase: 'mount' | 'update',
  prevProps?: Record<string, unknown> | null,
  prevState?: unknown
): RenderInfo {
  const componentName = getComponentName(fiber);
  const renderTime = fiber.actualDuration ?? 0;
  const changedProps = prevProps
    ? getChangedProps(prevProps, fiber.memoizedProps)
    : undefined;

  // Check if render was necessary
  // A render is considered unnecessary if:
  // 1. It's an update (not mount)
  // 2. Props didn't change
  // 3. State didn't change
  const propsChanged = changedProps && changedProps.length > 0;
  const stateChanged = prevState !== fiber.memoizedState;
  const necessary = phase === 'mount' || propsChanged || stateChanged;

  const result: RenderInfo = {
    componentName,
    renderCount: 1, // Will be aggregated by stats collector
    renderTime,
    phase,
    necessary,
    timestamp: Date.now(),
  };

  if (changedProps !== undefined) {
    result.changedProps = changedProps;
  }
  if (stateChanged) {
    result.changedState = ['state'];
  }

  return result;
}

/**
 * Get React version from DevTools hook
 * @param hook - DevTools global hook
 * @returns React version string
 */
export function getReactVersion(hook: ReactDevToolsHook): string {
  if (!hook.renderers || hook.renderers.size === 0) {
    return 'unknown';
  }

  // Get first renderer
  const renderer = hook.renderers.values().next().value;
  if (renderer && typeof renderer === 'object' && 'version' in renderer) {
    return String(renderer.version);
  }

  return 'unknown';
}

/**
 * Check if fiber is memoized (React.memo or PureComponent)
 * @param fiber - Fiber node
 * @returns true if memoized
 */
export function isMemoized(fiber: FiberNode): boolean {
  return (
    fiber.tag === FiberTag.MemoComponent ||
    fiber.tag === FiberTag.SimpleMemoComponent
  );
}

/**
 * Get the owner (parent that rendered this) of a fiber
 * @param fiber - Fiber node
 * @returns Owner fiber or null
 */
export function getOwner(fiber: FiberNode): FiberNode | null {
  return fiber._debugOwner ?? null;
}

/**
 * Build a component path from root to fiber
 * @param fiber - Target fiber
 * @returns Array of component names
 */
export function getComponentPath(fiber: FiberNode): string[] {
  const path: string[] = [];
  let current: FiberNode | null = fiber;

  while (current) {
    if (isUserComponent(current)) {
      path.unshift(getComponentName(current));
    }
    current = current.return;
  }

  return path;
}

/**
 * Find fiber by component name
 * @param root - Root fiber
 * @param name - Component name to find
 * @returns Matching fiber or null
 */
export function findFiberByName(root: FiberNode, name: string): FiberNode | null {
  let result: FiberNode | null = null;

  walkFiberTree(root, (fiber) => {
    if (getComponentName(fiber) === name) {
      result = fiber;
      return true; // Stop walking
    }
    return false;
  });

  return result;
}
