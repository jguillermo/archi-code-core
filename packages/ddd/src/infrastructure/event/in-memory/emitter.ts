/*
 * Adapted from emittery (https://github.com/sindresorhus/emittery), MIT License,
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com).
 */
import { EventDeliveryException } from '../../exceptions/event-delivery.exception';

type EmitterListener<Data> = (data: Data) => Promise<void> | void;

export class Emitter<Data> {
  private static readonly resolved = Promise.resolve();

  private readonly events = new Map<string, Set<EmitterListener<Data>>>();

  on(eventName: string, listener: EmitterListener<Data>): () => void {
    const listeners = this.events.get(eventName) ?? new Set<EmitterListener<Data>>();
    listeners.add(listener);
    this.events.set(eventName, listeners);
    return () => this.off(eventName, listener);
  }

  private off(eventName: string, listener: EmitterListener<Data>): void {
    const listeners = this.events.get(eventName);
    if (listeners === undefined) {
      return;
    }
    listeners.delete(listener);
    if (listeners.size === 0) {
      this.events.delete(eventName);
    }
  }

  async emit(eventName: string, data: Data): Promise<void> {
    const listeners = this.listenersOf(eventName);
    const snapshot = Array.from(listeners);
    await Emitter.resolved;
    const results = await Promise.allSettled(
      snapshot.map(async (listener) => {
        if (listeners.has(listener)) {
          await listener(data);
        }
      }),
    );
    const errors = results.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    );
    if (errors.length > 0) {
      throw new EventDeliveryException(eventName, errors, snapshot.length);
    }
  }

  async emitSerial(eventName: string, data: Data): Promise<void> {
    const listeners = this.listenersOf(eventName);
    const snapshot = Array.from(listeners);
    await Emitter.resolved;
    for (const listener of snapshot) {
      if (listeners.has(listener)) {
        await listener(data);
      }
    }
  }

  private listenersOf(eventName: string): Set<EmitterListener<Data>> {
    return this.events.get(eventName) ?? new Set<EmitterListener<Data>>();
  }
}
