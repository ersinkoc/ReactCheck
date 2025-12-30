/**
 * Tests for EventEmitter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter, type EventListener } from '../../../src/utils/event-emitter.js';

// Test event types
interface TestEvents {
  data: string;
  count: number;
  info: { name: string; value: number };
  error: Error;
}

describe('EventEmitter', () => {
  let emitter: EventEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new EventEmitter<TestEvents>();
  });

  describe('on()', () => {
    it('should add a listener for an event', () => {
      const listener = vi.fn();
      emitter.on('data', listener);

      emitter.emit('data', 'test');
      expect(listener).toHaveBeenCalledWith('test');
    });

    it('should allow multiple listeners for the same event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      emitter.on('data', listener1);
      emitter.on('data', listener2);

      emitter.emit('data', 'test');

      expect(listener1).toHaveBeenCalledWith('test');
      expect(listener2).toHaveBeenCalledWith('test');
    });

    it('should return this for chaining', () => {
      const result = emitter.on('data', vi.fn());
      expect(result).toBe(emitter);
    });

    it('should warn when max listeners is exceeded', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      emitter.setMaxListeners(2);

      emitter.on('data', vi.fn());
      emitter.on('data', vi.fn());
      emitter.on('data', vi.fn()); // Should trigger warning

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('addListener()', () => {
    it('should be an alias for on()', () => {
      const listener = vi.fn();
      emitter.addListener('data', listener);

      emitter.emit('data', 'test');
      expect(listener).toHaveBeenCalledWith('test');
    });
  });

  describe('once()', () => {
    it('should add a one-time listener', () => {
      const listener = vi.fn();
      emitter.once('data', listener);

      emitter.emit('data', 'first');
      emitter.emit('data', 'second');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('first');
    });

    it('should return this for chaining', () => {
      const result = emitter.once('data', vi.fn());
      expect(result).toBe(emitter);
    });
  });

  describe('off()', () => {
    it('should remove a regular listener', () => {
      const listener = vi.fn();
      emitter.on('data', listener);
      emitter.off('data', listener);

      emitter.emit('data', 'test');
      expect(listener).not.toHaveBeenCalled();
    });

    it('should remove a once listener', () => {
      const listener = vi.fn();
      emitter.once('data', listener);
      emitter.off('data', listener);

      emitter.emit('data', 'test');
      expect(listener).not.toHaveBeenCalled();
    });

    it('should not throw when removing non-existent listener', () => {
      expect(() => emitter.off('data', vi.fn())).not.toThrow();
    });

    it('should return this for chaining', () => {
      const result = emitter.off('data', vi.fn());
      expect(result).toBe(emitter);
    });

    it('should clean up empty listener sets', () => {
      const listener = vi.fn();
      emitter.on('data', listener);
      emitter.off('data', listener);

      expect(emitter.listenerCount('data')).toBe(0);
    });
  });

  describe('removeListener()', () => {
    it('should be an alias for off()', () => {
      const listener = vi.fn();
      emitter.on('data', listener);
      emitter.removeListener('data', listener);

      emitter.emit('data', 'test');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('removeAllListeners()', () => {
    it('should remove all listeners for an event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      emitter.on('data', listener1);
      emitter.on('data', listener2);
      emitter.removeAllListeners('data');

      emitter.emit('data', 'test');
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('should remove all listeners when no event specified', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      emitter.on('data', listener1);
      emitter.on('count', listener2);
      emitter.removeAllListeners();

      emitter.emit('data', 'test');
      emitter.emit('count', 42);
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('should return this for chaining', () => {
      const result = emitter.removeAllListeners();
      expect(result).toBe(emitter);
    });
  });

  describe('emit()', () => {
    it('should call all listeners with the data', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      emitter.on('data', listener1);
      emitter.once('data', listener2);

      emitter.emit('data', 'test');

      expect(listener1).toHaveBeenCalledWith('test');
      expect(listener2).toHaveBeenCalledWith('test');
    });

    it('should return true if listeners were called', () => {
      emitter.on('data', vi.fn());
      expect(emitter.emit('data', 'test')).toBe(true);
    });

    it('should return false if no listeners exist', () => {
      expect(emitter.emit('data', 'test')).toBe(false);
    });

    it('should emit error event when listener throws', () => {
      const errorListener = vi.fn();
      emitter.on('error', errorListener);
      emitter.on('data', () => {
        throw new Error('test error');
      });

      emitter.emit('data', 'test');
      expect(errorListener).toHaveBeenCalled();
    });

    it('should rethrow errors on error event itself', () => {
      emitter.on('error', () => {
        throw new Error('error handler failed');
      });

      expect(() => emitter.emit('error', new Error('test'))).toThrow('error handler failed');
    });
  });

  describe('getListeners()', () => {
    it('should return all listeners for an event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      emitter.on('data', listener1);
      emitter.once('data', listener2);

      const listeners = emitter.getListeners('data');
      expect(listeners).toContain(listener1);
      expect(listeners).toContain(listener2);
      expect(listeners.length).toBe(2);
    });

    it('should return empty array for events with no listeners', () => {
      expect(emitter.getListeners('data')).toEqual([]);
    });
  });

  describe('listenerCount()', () => {
    it('should return the number of listeners', () => {
      emitter.on('data', vi.fn());
      emitter.on('data', vi.fn());
      emitter.once('data', vi.fn());

      expect(emitter.listenerCount('data')).toBe(3);
    });

    it('should return 0 for events with no listeners', () => {
      expect(emitter.listenerCount('data')).toBe(0);
    });
  });

  describe('eventNames()', () => {
    it('should return all event names with listeners', () => {
      emitter.on('data', vi.fn());
      emitter.once('count', vi.fn());

      const names = emitter.eventNames();
      expect(names).toContain('data');
      expect(names).toContain('count');
    });

    it('should return empty array when no listeners exist', () => {
      expect(emitter.eventNames()).toEqual([]);
    });
  });

  describe('setMaxListeners() / getMaxListeners()', () => {
    it('should set and get max listeners', () => {
      emitter.setMaxListeners(5);
      expect(emitter.getMaxListeners()).toBe(5);
    });

    it('should default to 0 (unlimited)', () => {
      expect(emitter.getMaxListeners()).toBe(0);
    });

    it('should return this for chaining', () => {
      const result = emitter.setMaxListeners(10);
      expect(result).toBe(emitter);
    });
  });

  describe('prependListener()', () => {
    it('should add listener to the beginning', () => {
      const order: number[] = [];
      emitter.on('data', () => order.push(2));
      emitter.prependListener('data', () => order.push(1));

      emitter.emit('data', 'test');
      expect(order).toEqual([1, 2]);
    });

    it('should act as on() for first listener', () => {
      const listener = vi.fn();
      emitter.prependListener('data', listener);

      emitter.emit('data', 'test');
      expect(listener).toHaveBeenCalledWith('test');
    });

    it('should return this for chaining', () => {
      const result = emitter.prependListener('data', vi.fn());
      expect(result).toBe(emitter);
    });
  });

  describe('prependOnceListener()', () => {
    it('should add once listener to the beginning', () => {
      const order: number[] = [];
      emitter.once('data', () => order.push(2));
      emitter.prependOnceListener('data', () => order.push(1));

      emitter.emit('data', 'test');
      expect(order).toEqual([1, 2]);
    });

    it('should only fire once', () => {
      const listener = vi.fn();
      emitter.prependOnceListener('data', listener);

      emitter.emit('data', 'first');
      emitter.emit('data', 'second');

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should act as once() for first listener', () => {
      const listener = vi.fn();
      emitter.prependOnceListener('data', listener);

      emitter.emit('data', 'test');
      expect(listener).toHaveBeenCalledWith('test');
    });

    it('should return this for chaining', () => {
      const result = emitter.prependOnceListener('data', vi.fn());
      expect(result).toBe(emitter);
    });
  });

  describe('waitFor()', () => {
    it('should resolve when event is emitted', async () => {
      const promise = emitter.waitFor('data');

      setTimeout(() => emitter.emit('data', 'resolved'), 10);

      const result = await promise;
      expect(result).toBe('resolved');
    });

    it('should reject on timeout', async () => {
      const promise = emitter.waitFor('data', 50);

      await expect(promise).rejects.toThrow('Timeout waiting for event "data"');
    });

    it('should clear timeout when resolved', async () => {
      const promise = emitter.waitFor('data', 1000);

      setTimeout(() => emitter.emit('data', 'fast'), 10);

      await expect(promise).resolves.toBe('fast');
    });

    it('should work without timeout', async () => {
      const promise = emitter.waitFor('data');

      setTimeout(() => emitter.emit('data', 'no timeout'), 10);

      const result = await promise;
      expect(result).toBe('no timeout');
    });
  });

  describe('typed events', () => {
    it('should support strongly typed events', () => {
      const listener = vi.fn();
      emitter.on('info', listener);

      emitter.emit('info', { name: 'test', value: 42 });

      expect(listener).toHaveBeenCalledWith({ name: 'test', value: 42 });
    });
  });

  describe('once listener error handling', () => {
    it('should emit error event when once listener throws', () => {
      const errorListener = vi.fn();
      emitter.on('error', errorListener);
      emitter.once('data', () => {
        throw new Error('once listener error');
      });

      emitter.emit('data', 'test');
      expect(errorListener).toHaveBeenCalled();
      expect(errorListener.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(errorListener.mock.calls[0][0].message).toBe('once listener error');
    });

    it('should rethrow errors on error event from once listener', () => {
      emitter.once('error', () => {
        throw new Error('once error handler failed');
      });

      expect(() => emitter.emit('error', new Error('test'))).toThrow('once error handler failed');
    });
  });
});
