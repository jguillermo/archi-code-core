import { Validations } from '@archi-code/validation';
import {
  AggregateRoot,
  ArrayType,
  BooleanType,
  Composite,
  CreatedAt,
  EnumType,
  IdType,
  JsonType,
  NumberType,
  Required,
  StringType,
} from '../../../../src/domain/index';
import type { PrimitiveTypes } from '../../../../src/domain/index';

export class UserId extends IdType<'UserId'> {}

export class UserName extends StringType {}

@Validations([{ validator: 'isEmail' }])
export class UserEmail extends Required(StringType) {}

@Validations([
  { custom: 'notNegative', fn: (age) => (age as number) >= 0, message: 'An age is never negative' },
])
export class UserAge extends NumberType {}

export class UserActive extends Required(BooleanType) {}

export enum UserStatusOption {
  ACTIVE = 'active',
  PENDING = 'pending',
  BLOCKED = 'blocked',
}

export class UserStatusEnum extends EnumType<UserStatusOption> {
  protected getEnum(): typeof UserStatusOption {
    return UserStatusOption;
  }
}

export class UserStatus extends Required(UserStatusEnum) {}

export class UserTag extends Required(StringType) {}

export class UserTags extends ArrayType<UserTag> {
  protected createItem(value: unknown): UserTag {
    return new UserTag(value as string);
  }
}

export class UserScore extends Required(NumberType) {}

export class UserScores extends ArrayType<UserScore> {
  protected createItem(value: unknown): UserScore {
    return new UserScore(value as number);
  }
}

export class UserPreferences extends JsonType {}

export class City extends Required(StringType) {}

export class Zip extends Required(StringType) {}

export class Latitude extends Required(NumberType) {}

export class Longitude extends Required(NumberType) {}

export class Geo extends Composite({ lat: Latitude, lng: Longitude }) {}

export class Address extends Composite({ city: City, zip: Zip, geo: Geo }) {}

export class User extends AggregateRoot<UserId> {
  constructor(
    id: UserId,
    readonly name: UserName,
    readonly email: UserEmail,
    private _age: UserAge,
    readonly active: UserActive,
    private _status: UserStatus,
    readonly createdAt: CreatedAt,
    readonly tags: UserTags,
    readonly scores: UserScores,
    readonly address: Address | null,
    readonly preferences: UserPreferences,
  ) {
    super(id);
  }

  get age(): UserAge {
    return this._age;
  }

  get status(): UserStatus {
    return this._status;
  }

  greet(): string {
    return `Hello ${this.name.value ?? ''}`;
  }

  static fromPrimitives(primitives: PrimitiveTypes<User>): User {
    return new User(
      new UserId(primitives.id),
      new UserName(primitives.name),
      new UserEmail(primitives.email),
      new UserAge(primitives.age),
      new UserActive(primitives.active),
      new UserStatus(primitives.status),
      new CreatedAt(primitives.createdAt),
      new UserTags(primitives.tags),
      new UserScores(primitives.scores),
      primitives.address === null ? null : Address.fromPrimitives(primitives.address),
      new UserPreferences(primitives.preferences),
    );
  }

  toPrimitives(): PrimitiveTypes<User> {
    return {
      id: this.id.value,
      name: this.name.value,
      email: this.email.value,
      age: this._age.value,
      active: this.active.value,
      status: this._status.value,
      createdAt: this.createdAt.value,
      tags: this.tags.value,
      scores: this.scores.value,
      address: this.address === null ? null : this.address.toPrimitives(),
      preferences: this.preferences.value,
    };
  }
}

export class Product extends AggregateRoot<UserId> {
  constructor(
    id: UserId,
    readonly title: UserName,
  ) {
    super(id);
  }

  toPrimitives(): PrimitiveTypes<Product> {
    return { id: this.id.value, title: this.title.value };
  }
}
