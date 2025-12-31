/**
 * Tests for React Fiber utilities
 */

import { describe, it, expect } from 'vitest';
import {
  FiberTag,
  getComponentName,
  isUserComponent,
  isHostComponent,
  getFiberDOMNode,
  getParentFiber,
  walkFiberTree,
  getChangedProps,
  shallowEqual,
  createRenderInfo,
  getReactVersion,
  isMemoized,
  getOwner,
  getComponentPath,
  findFiberByName,
} from '../../../src/core/fiber.js';
import type { FiberNode, ReactDevToolsHook } from '../../../src/types.js';

// Helper to create mock fiber nodes
function createMockFiber(overrides: Partial<FiberNode> = {}): FiberNode {
  return {
    tag: FiberTag.FunctionComponent,
    type: function TestComponent() {},
    key: null,
    stateNode: null,
    return: null,
    child: null,
    sibling: null,
    index: 0,
    ref: null,
    memoizedProps: {},
    memoizedState: null,
    flags: 0,
    lanes: 0,
    actualDuration: 0,
    actualStartTime: 0,
    selfBaseDuration: 0,
    treeBaseDuration: 0,
    _debugOwner: null,
    _debugSource: null,
    alternate: null,
    ...overrides,
  } as FiberNode;
}

describe('Fiber Utilities', () => {
  describe('FiberTag', () => {
    it('should have correct tag values', () => {
      expect(FiberTag.FunctionComponent).toBe(0);
      expect(FiberTag.ClassComponent).toBe(1);
      expect(FiberTag.HostRoot).toBe(3);
      expect(FiberTag.HostComponent).toBe(5);
      expect(FiberTag.MemoComponent).toBe(14);
    });
  });

  describe('getComponentName()', () => {
    it('should return name for function component', () => {
      function MyComponent() {}
      const fiber = createMockFiber({
        tag: FiberTag.FunctionComponent,
        type: MyComponent,
      });
      expect(getComponentName(fiber)).toBe('MyComponent');
    });

    it('should return name for class component', () => {
      class MyClass {}
      const fiber = createMockFiber({
        tag: FiberTag.ClassComponent,
        type: MyClass,
      });
      expect(getComponentName(fiber)).toBe('MyClass');
    });

    it('should return Anonymous for unnamed function', () => {
      // Create an arrow function without giving it a name property
      const anonymousFunc = (() => () => {})();
      const fiber = createMockFiber({
        tag: FiberTag.FunctionComponent,
        type: anonymousFunc,
      });
      expect(getComponentName(fiber)).toBe('Anonymous');
    });

    it('should return displayName if available', () => {
      const Component = () => {};
      Component.displayName = 'CustomName';
      const fiber = createMockFiber({
        tag: FiberTag.FunctionComponent,
        type: Component,
      });
      expect(getComponentName(fiber)).toBe('CustomName');
    });

    it('should handle ForwardRef', () => {
      function InnerComponent() {}
      const fiber = createMockFiber({
        tag: FiberTag.ForwardRef,
        type: { render: InnerComponent },
      });
      // ForwardRef now returns inner component name directly (not wrapped)
      // This prevents ForwardRef flooding in render tracking
      expect(getComponentName(fiber)).toBe('InnerComponent');
    });

    it('should handle Memo component', () => {
      function InnerComponent() {}
      const fiber = createMockFiber({
        tag: FiberTag.MemoComponent,
        type: { type: InnerComponent },
      });
      expect(getComponentName(fiber)).toBe('Memo(InnerComponent)');
    });

    it('should return Lazy for lazy components', () => {
      const fiber = createMockFiber({ tag: FiberTag.LazyComponent });
      expect(getComponentName(fiber)).toBe('Lazy');
    });

    it('should return Context.Consumer', () => {
      const fiber = createMockFiber({ tag: FiberTag.ContextConsumer });
      expect(getComponentName(fiber)).toBe('Context.Consumer');
    });

    it('should return Context.Provider', () => {
      const fiber = createMockFiber({ tag: FiberTag.ContextProvider });
      expect(getComponentName(fiber)).toBe('Context.Provider');
    });

    it('should return Suspense', () => {
      const fiber = createMockFiber({ tag: FiberTag.SuspenseComponent });
      expect(getComponentName(fiber)).toBe('Suspense');
    });

    it('should return Fragment', () => {
      const fiber = createMockFiber({ tag: FiberTag.Fragment });
      expect(getComponentName(fiber)).toBe('Fragment');
    });

    it('should return Profiler', () => {
      const fiber = createMockFiber({ tag: FiberTag.Profiler });
      expect(getComponentName(fiber)).toBe('Profiler');
    });

    it('should return Root', () => {
      const fiber = createMockFiber({ tag: FiberTag.HostRoot });
      expect(getComponentName(fiber)).toBe('Root');
    });

    it('should return element name for host component', () => {
      const fiber = createMockFiber({
        tag: FiberTag.HostComponent,
        type: 'div',
      });
      expect(getComponentName(fiber)).toBe('div');
    });

    it('should return #text for text nodes', () => {
      const fiber = createMockFiber({ tag: FiberTag.HostText });
      expect(getComponentName(fiber)).toBe('#text');
    });

    it('should return Unknown for null fiber', () => {
      expect(getComponentName(null as unknown as FiberNode)).toBe('Unknown');
    });

    it('should handle ForwardRef without render', () => {
      const fiber = createMockFiber({
        tag: FiberTag.ForwardRef,
        type: {},
      });
      expect(getComponentName(fiber)).toBe('ForwardRef');
    });

    it('should handle Memo without inner type', () => {
      const fiber = createMockFiber({
        tag: FiberTag.MemoComponent,
        type: {},
      });
      expect(getComponentName(fiber)).toBe('Memo');
    });

    it('should handle unknown tag with null type', () => {
      const fiber = createMockFiber({
        tag: 999 as any, // unknown tag
        type: null,
      });
      expect(getComponentName(fiber)).toBe('Unknown');
    });

    it('should handle unknown tag with undefined type', () => {
      const fiber = createMockFiber({
        tag: 999 as any, // unknown tag
        type: undefined,
      });
      expect(getComponentName(fiber)).toBe('Unknown');
    });

    it('should handle unknown tag with string type', () => {
      const fiber = createMockFiber({
        tag: 999 as any, // unknown tag
        type: 'custom-element',
      });
      expect(getComponentName(fiber)).toBe('custom-element');
    });

    it('should handle unknown tag with object type having displayName', () => {
      const fiber = createMockFiber({
        tag: 999 as any, // unknown tag
        type: { displayName: 'CustomDisplay' },
      });
      expect(getComponentName(fiber)).toBe('CustomDisplay');
    });

    it('should handle unknown tag with object type having name', () => {
      const fiber = createMockFiber({
        tag: 999 as any, // unknown tag
        type: { name: 'CustomName' },
      });
      expect(getComponentName(fiber)).toBe('CustomName');
    });

    it('should handle unknown tag with empty object type', () => {
      const fiber = createMockFiber({
        tag: 999 as any, // unknown tag
        type: {},
      });
      expect(getComponentName(fiber)).toBe('Unknown');
    });

    it('should handle HostComponent with non-string type', () => {
      const fiber = createMockFiber({
        tag: FiberTag.HostComponent,
        type: { name: 'WebComponent' },
      });
      expect(getComponentName(fiber)).toBe('HostComponent');
    });

    it('should handle unknown tag with number type', () => {
      const fiber = createMockFiber({
        tag: 999 as any, // unknown tag
        type: 12345 as any, // number type - not string, function, or object
      });
      expect(getComponentName(fiber)).toBe('Unknown');
    });

    it('should handle unknown tag with symbol type', () => {
      const fiber = createMockFiber({
        tag: 999 as any, // unknown tag
        type: Symbol('test') as any,
      });
      expect(getComponentName(fiber)).toBe('Unknown');
    });
  });

  describe('isUserComponent()', () => {
    it('should return true for function component', () => {
      const fiber = createMockFiber({ tag: FiberTag.FunctionComponent });
      expect(isUserComponent(fiber)).toBe(true);
    });

    it('should return true for class component', () => {
      const fiber = createMockFiber({ tag: FiberTag.ClassComponent });
      expect(isUserComponent(fiber)).toBe(true);
    });

    it('should return true for memo component', () => {
      const fiber = createMockFiber({ tag: FiberTag.MemoComponent });
      expect(isUserComponent(fiber)).toBe(true);
    });

    it('should return true for forward ref', () => {
      const fiber = createMockFiber({ tag: FiberTag.ForwardRef });
      expect(isUserComponent(fiber)).toBe(true);
    });

    it('should return false for host component', () => {
      const fiber = createMockFiber({ tag: FiberTag.HostComponent });
      expect(isUserComponent(fiber)).toBe(false);
    });

    it('should return false for fragment', () => {
      const fiber = createMockFiber({ tag: FiberTag.Fragment });
      expect(isUserComponent(fiber)).toBe(false);
    });
  });

  describe('isHostComponent()', () => {
    it('should return true for host component', () => {
      const fiber = createMockFiber({ tag: FiberTag.HostComponent });
      expect(isHostComponent(fiber)).toBe(true);
    });

    it('should return false for function component', () => {
      const fiber = createMockFiber({ tag: FiberTag.FunctionComponent });
      expect(isHostComponent(fiber)).toBe(false);
    });
  });

  describe('getFiberDOMNode()', () => {
    it('should return stateNode for host component', () => {
      const domNode = {} as Element;
      const fiber = createMockFiber({
        tag: FiberTag.HostComponent,
        stateNode: domNode,
      });
      expect(getFiberDOMNode(fiber)).toBe(domNode);
    });

    it('should traverse to find DOM node', () => {
      const domNode = {} as Element;
      const childFiber = createMockFiber({
        tag: FiberTag.HostComponent,
        stateNode: domNode,
      });
      const parentFiber = createMockFiber({
        tag: FiberTag.FunctionComponent,
        child: childFiber,
      });
      expect(getFiberDOMNode(parentFiber)).toBe(domNode);
    });

    it('should return null if no DOM node found', () => {
      const fiber = createMockFiber({
        tag: FiberTag.FunctionComponent,
        child: null,
      });
      expect(getFiberDOMNode(fiber)).toBeNull();
    });

    it('should find DOM node in sibling', () => {
      const domNode = {} as Element;
      const sibling = createMockFiber({
        tag: FiberTag.HostComponent,
        stateNode: domNode,
      });
      const firstChild = createMockFiber({
        tag: FiberTag.FunctionComponent,
        sibling: sibling,
      });
      const parent = createMockFiber({
        tag: FiberTag.FunctionComponent,
        child: firstChild,
      });
      expect(getFiberDOMNode(parent)).toBe(domNode);
    });

    it('should traverse up when no child or sibling', () => {
      const domNode = {} as Element;
      // Create a tree where we need to go up to find a sibling
      const grandparent = createMockFiber({
        tag: FiberTag.FunctionComponent,
      });
      const parent1 = createMockFiber({
        tag: FiberTag.FunctionComponent,
        return: grandparent,
      });
      const parent2 = createMockFiber({
        tag: FiberTag.FunctionComponent,
        return: grandparent,
        child: createMockFiber({
          tag: FiberTag.HostComponent,
          stateNode: domNode,
        }),
      });
      parent1.sibling = parent2;
      const child = createMockFiber({
        tag: FiberTag.FunctionComponent,
        return: parent1,
      });
      parent1.child = child;
      grandparent.child = parent1;

      expect(getFiberDOMNode(grandparent)).toBe(domNode);
    });

    it('should return null for complex tree with no DOM nodes', () => {
      const grandparent = createMockFiber({
        tag: FiberTag.FunctionComponent,
      });
      const parent = createMockFiber({
        tag: FiberTag.FunctionComponent,
        return: grandparent,
      });
      const child = createMockFiber({
        tag: FiberTag.FunctionComponent,
        return: parent,
      });
      parent.child = child;
      grandparent.child = parent;

      expect(getFiberDOMNode(grandparent)).toBeNull();
    });
  });

  describe('getParentFiber()', () => {
    it('should return parent user component', () => {
      const parent = createMockFiber({
        tag: FiberTag.FunctionComponent,
        type: function Parent() {},
      });
      const child = createMockFiber({
        tag: FiberTag.FunctionComponent,
        return: parent,
      });
      expect(getParentFiber(child)).toBe(parent);
    });

    it('should skip non-user components', () => {
      const grandparent = createMockFiber({
        tag: FiberTag.FunctionComponent,
        type: function Grandparent() {},
      });
      const hostParent = createMockFiber({
        tag: FiberTag.HostComponent,
        return: grandparent,
      });
      const child = createMockFiber({
        tag: FiberTag.FunctionComponent,
        return: hostParent,
      });
      expect(getParentFiber(child)).toBe(grandparent);
    });

    it('should return null if no parent', () => {
      const fiber = createMockFiber({ return: null });
      expect(getParentFiber(fiber)).toBeNull();
    });
  });

  describe('walkFiberTree()', () => {
    it('should call callback for each user component', () => {
      const names: string[] = [];
      const child1 = createMockFiber({
        type: function Child1() {},
      });
      const child2 = createMockFiber({
        type: function Child2() {},
      });
      const root = createMockFiber({
        type: function Root() {},
        child: child1,
      });
      child1.sibling = child2;

      walkFiberTree(root, (fiber) => {
        names.push(getComponentName(fiber));
      });

      expect(names).toContain('Root');
      expect(names).toContain('Child1');
      expect(names).toContain('Child2');
    });

    it('should stop when callback returns true', () => {
      const names: string[] = [];
      const child = createMockFiber({
        type: function Child() {},
      });
      const root = createMockFiber({
        type: function Root() {},
        child,
      });

      walkFiberTree(root, (fiber) => {
        names.push(getComponentName(fiber));
        return getComponentName(fiber) === 'Root';
      });

      expect(names.length).toBe(1);
    });
  });

  describe('getChangedProps()', () => {
    it('should return empty for same reference', () => {
      const props = { a: 1 };
      expect(getChangedProps(props, props)).toEqual([]);
    });

    it('should detect changed props', () => {
      const prev = { a: 1, b: 2 };
      const next = { a: 1, b: 3 };
      expect(getChangedProps(prev, next)).toEqual(['b']);
    });

    it('should detect added props', () => {
      const prev = { a: 1 };
      const next = { a: 1, b: 2 };
      expect(getChangedProps(prev, next)).toEqual(['b']);
    });

    it('should skip children prop', () => {
      const prev = { children: [] };
      const next = { children: ['new'] };
      expect(getChangedProps(prev, next)).toEqual([]);
    });

    it('should handle null props', () => {
      expect(getChangedProps(null, { a: 1 })).toEqual(['a']);
      expect(getChangedProps({ a: 1 }, null)).toEqual(['a']);
    });
  });

  describe('shallowEqual()', () => {
    it('should return true for same reference', () => {
      const obj = { a: 1 };
      expect(shallowEqual(obj, obj)).toBe(true);
    });

    it('should return true for equal objects', () => {
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    });

    it('should return false for different values', () => {
      expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('should return false for different keys', () => {
      expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
    });

    it('should handle null', () => {
      expect(shallowEqual(null, null)).toBe(true);
      expect(shallowEqual(null, { a: 1 })).toBe(false);
      expect(shallowEqual({ a: 1 }, null)).toBe(false);
    });
  });

  describe('createRenderInfo()', () => {
    it('should create render info for mount', () => {
      const fiber = createMockFiber({
        type: function TestComponent() {},
        actualDuration: 5,
      });
      const info = createRenderInfo(fiber, 'mount');
      expect(info.componentName).toBe('TestComponent');
      expect(info.phase).toBe('mount');
      expect(info.necessary).toBe(true);
      expect(info.renderTime).toBe(5);
    });

    it('should detect unnecessary render on update', () => {
      const fiber = createMockFiber({
        type: function TestComponent() {},
        memoizedProps: { a: 1 },
        memoizedState: 'state',
      });
      const info = createRenderInfo(fiber, 'update', { a: 1 }, 'state');
      expect(info.necessary).toBe(false);
    });

    it('should mark render as necessary when props changed', () => {
      const fiber = createMockFiber({
        type: function TestComponent() {},
        memoizedProps: { a: 2 },
        memoizedState: 'state',
      });
      const info = createRenderInfo(fiber, 'update', { a: 1 }, 'state');
      expect(info.necessary).toBe(true);
      expect(info.changedProps).toEqual(['a']);
    });

    it('should mark render as necessary when state changed', () => {
      const fiber = createMockFiber({
        type: function TestComponent() {},
        memoizedProps: { a: 1 },
        memoizedState: 'newState',
      });
      const info = createRenderInfo(fiber, 'update', { a: 1 }, 'oldState');
      expect(info.necessary).toBe(true);
      expect(info.changedState).toEqual(['state']);
    });
  });

  describe('getReactVersion()', () => {
    it('should return version from renderer', () => {
      const hook: ReactDevToolsHook = {
        renderers: new Map([[1, { version: '18.2.0' }]]),
        supportsFiber: true,
        inject: () => 1,
        onScheduleFiberRoot: () => {},
        onCommitFiberRoot: () => {},
        onCommitFiberUnmount: () => {},
        onPostCommitFiberRoot: () => {},
      };
      expect(getReactVersion(hook)).toBe('18.2.0');
    });

    it('should return unknown if no renderers', () => {
      const hook: ReactDevToolsHook = {
        renderers: new Map(),
        supportsFiber: true,
        inject: () => 1,
        onScheduleFiberRoot: () => {},
        onCommitFiberRoot: () => {},
        onCommitFiberUnmount: () => {},
        onPostCommitFiberRoot: () => {},
      };
      expect(getReactVersion(hook)).toBe('unknown');
    });

    it('should return unknown for hook with null renderers', () => {
      const hook = {
        renderers: null,
        supportsFiber: true,
        inject: () => 1,
        onScheduleFiberRoot: () => {},
        onCommitFiberRoot: () => {},
        onCommitFiberUnmount: () => {},
        onPostCommitFiberRoot: () => {},
      } as unknown as ReactDevToolsHook;
      expect(getReactVersion(hook)).toBe('unknown');
    });

    it('should return unknown if renderer has no version', () => {
      const hook: ReactDevToolsHook = {
        renderers: new Map([[1, {}]]),
        supportsFiber: true,
        inject: () => 1,
        onScheduleFiberRoot: () => {},
        onCommitFiberRoot: () => {},
        onCommitFiberUnmount: () => {},
        onPostCommitFiberRoot: () => {},
      };
      expect(getReactVersion(hook)).toBe('unknown');
    });

    it('should return unknown if renderer is null', () => {
      const hook: ReactDevToolsHook = {
        renderers: new Map([[1, null]]),
        supportsFiber: true,
        inject: () => 1,
        onScheduleFiberRoot: () => {},
        onCommitFiberRoot: () => {},
        onCommitFiberUnmount: () => {},
        onPostCommitFiberRoot: () => {},
      };
      expect(getReactVersion(hook)).toBe('unknown');
    });
  });

  describe('isMemoized()', () => {
    it('should return true for MemoComponent', () => {
      const fiber = createMockFiber({ tag: FiberTag.MemoComponent });
      expect(isMemoized(fiber)).toBe(true);
    });

    it('should return true for SimpleMemoComponent', () => {
      const fiber = createMockFiber({ tag: FiberTag.SimpleMemoComponent });
      expect(isMemoized(fiber)).toBe(true);
    });

    it('should return false for regular component', () => {
      const fiber = createMockFiber({ tag: FiberTag.FunctionComponent });
      expect(isMemoized(fiber)).toBe(false);
    });
  });

  describe('getOwner()', () => {
    it('should return debug owner', () => {
      const owner = createMockFiber();
      const fiber = createMockFiber({ _debugOwner: owner });
      expect(getOwner(fiber)).toBe(owner);
    });

    it('should return null if no owner', () => {
      const fiber = createMockFiber({ _debugOwner: null });
      expect(getOwner(fiber)).toBeNull();
    });
  });

  describe('getComponentPath()', () => {
    it('should return path from root to fiber', () => {
      const grandparent = createMockFiber({
        type: function Grandparent() {},
      });
      const parent = createMockFiber({
        type: function Parent() {},
        return: grandparent,
      });
      const child = createMockFiber({
        type: function Child() {},
        return: parent,
      });
      expect(getComponentPath(child)).toEqual(['Grandparent', 'Parent', 'Child']);
    });
  });

  describe('findFiberByName()', () => {
    it('should find fiber by component name', () => {
      const target = createMockFiber({
        type: function Target() {},
      });
      const root = createMockFiber({
        type: function Root() {},
        child: target,
      });
      expect(findFiberByName(root, 'Target')).toBe(target);
    });

    it('should return null if not found', () => {
      const root = createMockFiber({
        type: function Root() {},
      });
      expect(findFiberByName(root, 'NotFound')).toBeNull();
    });
  });
});
