import {
  InfrastructureException,
  InternalErrorException,
  UnknownEventException,
} from '../../exceptions/index';
import type { EventBase, EventClass, SerializedEvent } from '../../domain/index';

export type EventFactory<Event extends EventBase> = (serialized: SerializedEvent) => Event;

export class DomainEventRegistry<Event extends EventBase = EventBase> {
  private readonly factories = new Map<string, EventFactory<Event>>();

  register<Registered extends Event>(
    event: EventClass<Registered>,
    factory: EventFactory<Registered>,
  ): this {
    const { eventName } = event;
    if (this.factories.has(eventName)) {
      throw new InfrastructureException(`Event "${eventName}" is already registered.`);
    }
    this.factories.set(eventName, factory);
    return this;
  }

  has(eventName: string): boolean {
    return this.factories.has(eventName);
  }

  fromJSON(serialized: SerializedEvent | string): Event {
    const event =
      typeof serialized === 'string' ? DomainEventRegistry.parse(serialized) : serialized;
    if (typeof event !== 'object' || event === null) {
      throw new InternalErrorException('a serialized event must be a JSON object');
    }
    if (typeof event.eventName !== 'string') {
      throw new InternalErrorException('a serialized event needs its eventName');
    }
    const factory = this.factories.get(event.eventName);
    if (factory === undefined) {
      throw new UnknownEventException(event.eventName);
    }
    return factory(event);
  }

  private static parse(text: string): SerializedEvent {
    try {
      return JSON.parse(text) as SerializedEvent;
    } catch (error) {
      throw new InternalErrorException('a serialized event is not valid JSON', { cause: error });
    }
  }
}
