import { Entity } from '../entity/entity';
import type { EntityId } from '../entity/entity';
import type { EventBase } from '../event/event-base';
import type { IdType } from '../type/id-type';
import { Immutable } from '../type/immutable/immutable';

export abstract class AggregateRoot<
  Id extends EntityId = IdType,
  Event extends EventBase = EventBase,
> extends Entity<Id> {
  private readonly domainEvents: Event[] = [];

  protected record(event: Event): void {
    this.domainEvents.push(Immutable.freeze(event));
  }

  pullDomainEvents(): Event[] {
    return this.domainEvents.splice(0);
  }
}
