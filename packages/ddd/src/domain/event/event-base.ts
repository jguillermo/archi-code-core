import { CreatedAt } from '../type/date-type';
import { IdType } from '../type/id-type';
import { UuidType } from '../type/uuid-type';
import { InvalidEventDefinitionException } from '../exceptions/invalid-event-definition.exception';

export interface EventMetadata {
  eventId?: string;
  occurredOn?: Date | string;
  clock?: { now(): Date };
}

export interface SerializedEvent {
  eventName: string;
  eventId: string;
  occurredOn: string;
  [payload: string]: unknown;
}

export interface EventClass<Event extends EventBase = EventBase> {
  readonly eventName: string;
  new (...args: any[]): Event;
}

export abstract class EventBase {
  readonly eventName: string;
  readonly eventId: string;
  readonly occurredOn: string;

  constructor(metadata: EventMetadata = {}) {
    const { eventName } = this.constructor as Partial<EventClass>;
    if (typeof eventName !== 'string' || eventName.trim() === '') {
      throw new InvalidEventDefinitionException(this.constructor.name);
    }
    this.eventName = eventName;
    this.eventId = new IdType(metadata.eventId ?? UuidType.random()).value;
    this.occurredOn = (
      metadata.occurredOn === undefined
        ? CreatedAt.now(metadata.clock)
        : new CreatedAt(metadata.occurredOn as Date)
    ).value.toISOString();
  }
}
