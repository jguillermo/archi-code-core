import { Entity } from '../entity/entity';
import type { EventBase } from '../event/event-base';
import type { AbstractType } from '../type/abstract-type';
import type { IdType } from '../type/id-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

export abstract class AggregateRoot<
  Id extends AbstractType<any> = IdType,
  Event extends EventBase = EventBase,
> extends Entity<Id> {
  readonly version: number;
  private domainEvents: Event[] = [];

  constructor(id: Id, version = 0) {
    super(id);
    if (!Number.isSafeInteger(version) || version < 0) {
      throw new TypePrimitiveException('version (a non-negative integer)', version);
    }
    this.version = version;
  }

  protected record(event: Event): void {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): Event[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}
