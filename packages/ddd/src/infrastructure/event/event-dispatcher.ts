import { ListensTo } from '../../application/index';
import type { EventListener } from '../../application/index';
import type { EventBase } from '../../domain/index';

export class EventDispatcher<Event extends EventBase = EventBase> {
  private readonly listeners = new Map<string, EventListener<any>[]>();

  constructor(listeners: readonly EventListener<any>[] = []) {
    listeners.forEach((listener) => this.add(listener));
  }

  add(listener: EventListener<any>): this {
    const eventName = ListensTo.eventOf(listener);
    this.listeners.set(eventName, [...this.listenersOf(eventName), listener]);
    return this;
  }

  listenersOf(eventName: string): readonly EventListener<any>[] {
    return this.listeners.get(eventName) ?? [];
  }

  async dispatch(event: Event): Promise<void> {
    for (const listener of this.listenersOf(event.eventName())) {
      await listener.handle(event);
    }
  }
}
