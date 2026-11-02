import {
  AggregateRoot,
  ArrayType,
  BooleanType,
  Composite,
  DateType,
  NumberType,
  Required,
  StringType,
} from '@archi-code/ddd/domain';

export class UserId extends Required(StringType) {}

export class UserName extends StringType {}

export class UserAge extends NumberType {}

export class UserActive extends BooleanType {}

export class UserStatus extends StringType {}

export class UserCreatedAt extends DateType {}

export class UserDeletedAt extends DateType {}

export class UserTag extends Required(StringType) {}

export class UserTags extends ArrayType<UserTag> {
  protected createItem(value: unknown): UserTag {
    return new UserTag(value as string);
  }
}

export class City extends Required(StringType) {}

export class UserAddress extends Composite({ city: City }) {}

export interface UserPrimitives {
  id: string;
  name: string | null;
  age: number | null;
  active: boolean | null;
  status: string | null;
  createdAt: Date | null;
  deletedAt: Date | null;
  tags: string[] | null;
  address: { city: string } | null;
}

export class User extends AggregateRoot<UserId> {
  constructor(
    id: UserId,
    readonly name: UserName,
    readonly age: UserAge,
    readonly active: UserActive,
    readonly status: UserStatus,
    readonly createdAt: UserCreatedAt,
    readonly deletedAt: UserDeletedAt,
    readonly tags: UserTags,
    readonly address: UserAddress | null,
  ) {
    super(id);
  }

  toPrimitives(): UserPrimitives {
    return {
      id: this.id.value,
      name: this.name.value,
      age: this.age.value,
      active: this.active.value,
      status: this.status.value,
      createdAt: this.createdAt.value,
      deletedAt: this.deletedAt.value,
      tags: this.tags.value,
      address: this.address === null ? null : this.address.toPrimitives(),
    };
  }
}

export class RowId extends Required(NumberType) {}

export class Row extends AggregateRoot<RowId> {
  constructor(
    id: RowId,
    readonly age: UserAge,
    readonly name: UserName,
  ) {
    super(id);
  }

  toPrimitives(): { id: number; age: number | null; name: string | null } {
    return { id: this.id.value, age: this.age.value, name: this.name.value };
  }
}

export class KeyId extends Required(StringType) {}

export class KeyValue extends StringType {}

export class Keyed extends AggregateRoot<KeyId> {
  constructor(
    id: KeyId,
    readonly k: KeyValue,
  ) {
    super(id);
  }

  toPrimitives(): { id: string; k: string | null } {
    return { id: this.id.value, k: this.k.value };
  }
}
