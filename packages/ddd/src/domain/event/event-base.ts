import { CreatedAt } from '../type/date-type';
import { IdType } from '../type/id-type';
import { UuidType } from '../type/uuid-type';
import { TypeInput } from '../type/input/type-input';
import { InternalErrorException, RequiredValueException } from '../../exceptions/index';

export interface EventMetadata {
  eventId?: string;
  occurredOn?: Date | string;
  clock?: { now(): Date };
}

export interface SerializedEvent {
  eventName: string;
  eventId: string;
  aggregateId: string;
  occurredOn: string;
  [payload: string]: unknown;
}

export interface EventClass<Event extends EventBase = EventBase> {
  readonly eventName: string;
  new (...args: any[]): Event;
}

export abstract class EventBase {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly occurredOn: Date;

  constructor(aggregateId: string, metadata: EventMetadata = {}) {
    const { eventName } = this.constructor as Partial<EventClass>;
    if (typeof eventName !== 'string' || eventName.trim() === '') {
      throw new InternalErrorException(`${this.constructor.name} must declare a static eventName`);
    }
    if (TypeInput.isMissing(aggregateId)) {
      throw new RequiredValueException(`${this.constructor.name}.aggregateId`, aggregateId);
    }
    this.aggregateId = aggregateId;
    this.eventId = new IdType(metadata.eventId ?? UuidType.random()).value;
    this.occurredOn =
      metadata.occurredOn === undefined
        ? CreatedAt.now(metadata.clock).value
        : new CreatedAt(metadata.occurredOn as Date).value;
  }

  eventName(): string {
    return (this.constructor as EventClass).eventName;
  }

  toJSON(): SerializedEvent {
    const serialized: SerializedEvent = {
      eventName: this.eventName(),
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      occurredOn: this.occurredOn.toISOString(),
    };
    for (const [key, value] of Object.entries(this)) {
      if (!(key in serialized)) {
        serialized[key] = value;
      }
    }
    return serialized;
  }
}
