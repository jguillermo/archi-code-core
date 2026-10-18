import type { EventBase } from '../../domain/index';

export interface EventBus<Event extends EventBase = EventBase> {
  publish(events: readonly Event[]): Promise<void>;
}
