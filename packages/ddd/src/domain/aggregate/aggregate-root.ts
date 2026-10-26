import { Entity } from '../entity/entity';
import type { EntityId } from '../entity/entity';
import type { EventBase } from '../event/event-base';
import type { IdType } from '../type/id-type';

export abstract class AggregateRoot<Id extends EntityId = IdType> extends Entity<Id> {
  private readonly domainEvents: EventBase[] = [];

  protected record(event: EventBase): void {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): EventBase[] {
    return this.domainEvents.splice(0);
  }
}
