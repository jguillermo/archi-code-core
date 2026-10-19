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
  eventVersion: number;
  eventId: string;
  aggregateId: string;
  occurredOn: string;
  [payload: string]: unknown;
}

export interface EventClass<Event extends EventBase = EventBase> {
  readonly eventName: string;
  readonly eventVersion?: number;
  new (...args: any[]): Event;
}

export abstract class EventBase {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly occurredOn: Date;

  constructor(aggregateId: string, metadata: EventMetadata = {}) {
    const { eventName, eventVersion = 1 } = this.constructor as Partial<EventClass>;
    if (typeof eventName !== 'string' || eventName.trim() === '') {
      throw new InternalErrorException(`${this.constructor.name} must declare a static eventName`);
    }
    if (!Number.isSafeInteger(eventVersion) || eventVersion < 1) {
      throw new InternalErrorException(
        `${this.constructor.name}.eventVersion must be a whole number from 1`,
      );
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

  eventVersion(): number {
    return (this.constructor as EventClass).eventVersion ?? 1;
  }

  toJSON(): SerializedEvent {
    const serialized: SerializedEvent = {
      eventName: this.eventName(),
      eventVersion: this.eventVersion(),
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
