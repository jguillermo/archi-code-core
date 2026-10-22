import { CreatedAt } from '../type';
import { IdType } from '../type';
import { UuidType } from '../type';
import { InternalErrorException } from '../../exceptions';

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
      throw new InternalErrorException(`${this.constructor.name} must declare a static eventName`);
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
