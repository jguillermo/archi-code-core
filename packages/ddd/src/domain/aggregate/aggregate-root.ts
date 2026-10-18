import type { EventBase } from '../event/event-base';
import type { AbstractType } from '../type/abstract-type';
import type { IdType } from '../type/id-type';
import { InternalErrorException } from '../../exceptions/index';

export abstract class AggregateRoot<
  Id extends AbstractType<any> = IdType,
  Event extends EventBase = EventBase,
> {
  private readonly domainEvents!: Event[];
  private persistedVersion!: number;

  constructor(readonly id: Id) {
    Object.defineProperty(this, 'domainEvents', { value: [] });
    Object.defineProperty(this, 'persistedVersion', { value: 0, writable: true });
  }

  get version(): number {
    return this.persistedVersion;
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

  restoreVersion(version: number): this {
    if (!Number.isSafeInteger(version) || version < 0) {
      throw new InternalErrorException(
        `${this.constructor.name} cannot be restored with version ${String(version)}`,
      );
    }
    this.persistedVersion = version;
    return this;
  }

  markPersisted(): void {
    this.persistedVersion += 1;
  }
}
