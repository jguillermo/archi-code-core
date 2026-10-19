import type { EventBase } from '../../domain/index';
import type { EventListener } from './event-listener';

export interface Subscription {
  unsubscribe(): Promise<void>;
}

export interface EventSubscriber<Event extends EventBase = EventBase> {
  subscribe(listener: EventListener<Event>): Promise<Subscription>;
}
