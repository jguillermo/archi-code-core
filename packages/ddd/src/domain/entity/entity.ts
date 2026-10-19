import type { AbstractType } from '../type/abstract-type';
import type { IdType } from '../type/id-type';

export abstract class Entity<Id extends AbstractType<any> = IdType> {
  constructor(readonly id: Id) {}

  equals(other: unknown): boolean {
    return (
      typeof other === 'object' &&
      other !== null &&
      other.constructor === this.constructor &&
      this.id.equals((other as Entity<Id>).id)
    );
  }
}
