import type { EventBase } from '../../domain/index';

export abstract class EventListener<Event extends EventBase = EventBase> {
  abstract handle(event: Event): Promise<void> | void;
}
