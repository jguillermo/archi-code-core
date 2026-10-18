import type { EventBus } from '../../application/index';
import type { EventBase } from '../../domain/index';
import { EventDispatcher } from './event-dispatcher';

export class InMemoryEventBus<Event extends EventBase = EventBase> implements EventBus<Event> {
  private readonly publishedEvents: Event[] = [];

  constructor(private readonly dispatcher: EventDispatcher<Event> = new EventDispatcher()) {}

  get published(): readonly Event[] {
    return [...this.publishedEvents];
  }

  async publish(events: readonly Event[]): Promise<void> {
    for (const event of events) {
      this.publishedEvents.push(event);
      await this.dispatcher.dispatch(event);
    }
  }
}
