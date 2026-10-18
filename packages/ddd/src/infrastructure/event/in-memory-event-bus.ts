import type { EventBus } from '../../application/index';
import type { EventBase } from '../../domain/index';

export type EventHandler<Event extends EventBase> = (event: Event) => Promise<void> | void;

export class InMemoryEventBus<Event extends EventBase = EventBase> implements EventBus<Event> {
  private readonly handlers = new Map<string, EventHandler<Event>[]>();
  private readonly publishedEvents: Event[] = [];

  get published(): readonly Event[] {
    return [...this.publishedEvents];
  }

  subscribe<Subscribed extends Event>(
    eventName: string,
    handler: EventHandler<Subscribed>,
  ): () => void {
    const handlers = this.handlers.get(eventName) ?? [];
    this.handlers.set(eventName, [...handlers, handler as EventHandler<Event>]);
    return () => {
      const current = this.handlers.get(eventName) as EventHandler<Event>[];
      this.handlers.set(
        eventName,
        current.filter((registered) => registered !== handler),
      );
    };
  }

  async publish(events: readonly Event[]): Promise<void> {
    for (const event of events) {
      this.publishedEvents.push(event);
      for (const handler of this.handlers.get(event.eventName()) ?? []) {
        await handler(event);
      }
    }
  }
}
