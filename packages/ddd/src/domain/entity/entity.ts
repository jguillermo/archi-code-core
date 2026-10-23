import type { AbstractType } from '../type';
import type { IdType } from '../type';
import type { RequiredMarked } from '../type/required/required-mark';
import { RequiredValueException } from '../exceptions/required-value.exception';

export type EntityId = AbstractType<any> & RequiredMarked;

export abstract class Entity<Id extends EntityId = IdType> {
  constructor(readonly id: Id) {
    if (id?.isNull !== false) {
      throw new RequiredValueException(`${new.target.name}.id`, id?.value);
    }
  }

  equals(other: unknown): boolean {
    return (
      typeof other === 'object' &&
      other !== null &&
      other.constructor === this.constructor &&
      this.id.equals((other as Entity<Id>).id)
    );
  }
}
