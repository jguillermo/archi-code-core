import type { EventBase } from '../event/event-base';
import type { AbstractType } from '../type/abstract-type';
import type { IdType } from '../type/id-type';

export abstract class AggregateRoot<
  Id extends AbstractType<any> = IdType,
  Event extends EventBase = EventBase,
> {
  private readonly domainEvents!: Event[];

  constructor(readonly id: Id) {
    Object.defineProperty(this, 'domainEvents', { value: [] });
  }

  equals(other: unknown): boolean {
    return (
      typeof other === 'object' &&
      other !== null &&
      other.constructor === this.constructor &&
      this.id.equals((other as AggregateRoot<Id, Event>).id)
    );
  }

  protected record(event: Event): void {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): Event[] {
    return this.domainEvents.splice(0);
  }
}
