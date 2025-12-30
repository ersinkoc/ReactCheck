/**
 * Custom EventEmitter implementation (zero dependencies)
 * @packageDocumentation
 */

/**
 * Generic event listener function type
 */
export type EventListener<T = unknown> = (data: T) => void;

/**
 * Event map type for typed events
 */
export type EventMap = { [key: string]: unknown };

/**
 * A lightweight, typed EventEmitter implementation
 * @typeParam T - Event map defining event names and their data types
 */
export class EventEmitter<T extends EventMap = EventMap> {
  /** Map of event names to their listeners */
  private _listeners: Map<keyof T, Set<EventListener<unknown>>> = new Map();

  /** Map of event names to their one-time listeners */
  private _onceListeners: Map<keyof T, Set<EventListener<unknown>>> = new Map();

  /** Maximum number of listeners per event (0 = unlimited) */
  private maxListeners: number = 0;

  /**
   * Add an event listener
   * @param event - Event name
   * @param listener - Callback function
   * @returns this for chaining
   */
  on<K extends keyof T>(event: K, listener: EventListener<T[K]>): this {
    let eventListeners = this._listeners.get(event);
    if (!eventListeners) {
      eventListeners = new Set();
      this._listeners.set(event, eventListeners);
    }

    if (this.maxListeners > 0 && eventListeners.size >= this.maxListeners) {
      console.warn(
        `Warning: Possible EventEmitter memory leak detected. ` +
          `${eventListeners.size + 1} listeners added for event "${String(event)}". ` +
          `Use setMaxListeners() to increase limit.`
      );
    }

    eventListeners.add(listener as EventListener<unknown>);
    return this;
  }

  /**
   * Alias for on()
   */
  addListener<K extends keyof T>(event: K, listener: EventListener<T[K]>): this {
    return this.on(event, listener);
  }

  /**
   * Add a one-time event listener
   * @param event - Event name
   * @param listener - Callback function
   * @returns this for chaining
   */
  once<K extends keyof T>(event: K, listener: EventListener<T[K]>): this {
    let eventListeners = this._onceListeners.get(event);
    if (!eventListeners) {
      eventListeners = new Set();
      this._onceListeners.set(event, eventListeners);
    }

    eventListeners.add(listener as EventListener<unknown>);
    return this;
  }

  /**
   * Remove an event listener
   * @param event - Event name
   * @param listener - Callback function to remove
   * @returns this for chaining
   */
  off<K extends keyof T>(event: K, listener: EventListener<T[K]>): this {
    const eventListeners = this._listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener as EventListener<unknown>);
      if (eventListeners.size === 0) {
        this._listeners.delete(event);
      }
    }

    const onceEventListeners = this._onceListeners.get(event);
    if (onceEventListeners) {
      onceEventListeners.delete(listener as EventListener<unknown>);
      if (onceEventListeners.size === 0) {
        this._onceListeners.delete(event);
      }
    }

    return this;
  }

  /**
   * Alias for off()
   */
  removeListener<K extends keyof T>(event: K, listener: EventListener<T[K]>): this {
    return this.off(event, listener);
  }

  /**
   * Remove all listeners for an event, or all events if no event specified
   * @param event - Optional event name
   * @returns this for chaining
   */
  removeAllListeners<K extends keyof T>(event?: K): this {
    if (event !== undefined) {
      this._listeners.delete(event);
      this._onceListeners.delete(event);
    } else {
      this._listeners.clear();
      this._onceListeners.clear();
    }
    return this;
  }

  /**
   * Emit an event
   * @param event - Event name
   * @param data - Event data
   * @returns true if any listeners were called
   */
  emit<K extends keyof T>(event: K, data: T[K]): boolean {
    let called = false;

    // Call regular listeners
    const eventListeners = this._listeners.get(event);
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(data);
          called = true;
        } catch (error) {
          // Emit error event if this isn't already an error event
          if (event !== 'error') {
            this.emit('error' as K, error as T[K]);
          } else {
            throw error;
          }
        }
      }
    }

    // Call and remove once listeners
    const onceEventListeners = this._onceListeners.get(event);
    if (onceEventListeners) {
      const listenersToCall = Array.from(onceEventListeners);
      this._onceListeners.delete(event);

      for (const listener of listenersToCall) {
        try {
          listener(data);
          called = true;
        } catch (error) {
          if (event !== 'error') {
            this.emit('error' as K, error as T[K]);
          } else {
            throw error;
          }
        }
      }
    }

    return called;
  }

  /**
   * Get all listener functions for an event
   * @param event - Event name
   * @returns Array of listener functions
   */
  getListeners<K extends keyof T>(event: K): Array<EventListener<T[K]>> {
    const regular = this._listeners.get(event);
    const once = this._onceListeners.get(event);

    const result: Array<EventListener<T[K]>> = [];
    if (regular) {
      result.push(...(Array.from(regular) as Array<EventListener<T[K]>>));
    }
    if (once) {
      result.push(...(Array.from(once) as Array<EventListener<T[K]>>));
    }

    return result;
  }

  /**
   * Get the number of listeners for an event
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount<K extends keyof T>(event: K): number {
    const regular = this._listeners.get(event)?.size ?? 0;
    const once = this._onceListeners.get(event)?.size ?? 0;
    return regular + once;
  }

  /**
   * Get all event names that have listeners
   * @returns Array of event names
   */
  eventNames(): Array<keyof T> {
    const names = new Set<keyof T>();
    for (const name of this._listeners.keys()) {
      names.add(name);
    }
    for (const name of this._onceListeners.keys()) {
      names.add(name);
    }
    return Array.from(names);
  }

  /**
   * Set the maximum number of listeners per event
   * @param n - Maximum listeners (0 for unlimited)
   * @returns this for chaining
   */
  setMaxListeners(n: number): this {
    this.maxListeners = n;
    return this;
  }

  /**
   * Get the maximum number of listeners per event
   * @returns Maximum listeners
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }

  /**
   * Prepend a listener to the beginning of the listeners array
   * @param event - Event name
   * @param listener - Callback function
   * @returns this for chaining
   */
  prependListener<K extends keyof T>(event: K, listener: EventListener<T[K]>): this {
    const eventListeners = this._listeners.get(event);
    if (!eventListeners) {
      return this.on(event, listener);
    }

    // Convert to array, prepend, and recreate set
    const arr = Array.from(eventListeners);
    arr.unshift(listener as EventListener<unknown>);
    this._listeners.set(event, new Set(arr));
    return this;
  }

  /**
   * Prepend a one-time listener to the beginning
   * @param event - Event name
   * @param listener - Callback function
   * @returns this for chaining
   */
  prependOnceListener<K extends keyof T>(event: K, listener: EventListener<T[K]>): this {
    const eventListeners = this._onceListeners.get(event);
    if (!eventListeners) {
      return this.once(event, listener);
    }

    const arr = Array.from(eventListeners);
    arr.unshift(listener as EventListener<unknown>);
    this._onceListeners.set(event, new Set(arr));
    return this;
  }

  /**
   * Wait for an event to be emitted
   * @param event - Event name
   * @param timeout - Optional timeout in milliseconds
   * @returns Promise that resolves with the event data
   */
  waitFor<K extends keyof T>(event: K, timeout?: number): Promise<T[K]> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;

      const listener: EventListener<T[K]> = (data) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(data);
      };

      this.once(event, listener);

      if (timeout !== undefined && timeout > 0) {
        timeoutId = setTimeout(() => {
          this.off(event, listener);
          reject(new Error(`Timeout waiting for event "${String(event)}"`));
        }, timeout);
      }
    });
  }
}
