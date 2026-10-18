import { CreatedAt } from '../type/date-type';
import { IdType } from '../type/id-type';
import { UuidType } from '../type/uuid-type';
import { TypeInput } from '../type/input/type-input';
import { RequiredValueException } from '../../exceptions/index';

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

export abstract class EventBase {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly occurredOn: Date;

  constructor(aggregateId: string, metadata: EventMetadata = {}) {
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

  abstract eventName(): string;

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
