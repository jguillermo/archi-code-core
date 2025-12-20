import { AddValidate } from '../validator/decorator/type-validator';
import { AbstractBooleanType } from './abstract-boolean-type';
import { AbstractDateType } from './abstract-date-type';
import { AbstractNumberType } from './abstract-number-type';
import { AbstractStringType } from './abstract-string-type';
import { AbstractUuidType } from './abstract-uuid-type';

export { AbstractArrayType } from './abstract-array-type';
export { AbstractBooleanType } from './abstract-boolean-type';
export { AbstractDateType } from './abstract-date-type';
export { AbstractEnumType } from './abstract-enum-type';
export { AbstractJsonType } from './abstract-json-type';
export { AbstractNumberType } from './abstract-number-type';
export { AbstractStringType } from './abstract-string-type';
export { AbstractUuidType } from './abstract-uuid-type';
export { AddValidate } from '../validator/decorator/type-validator';

//AbstractBooleanType
@AddValidate([{ validator: 'IsOptional' }])
export class BooleanTypeOptional extends AbstractBooleanType<null> {
  constructor(value: boolean | null = null) {
    super(value);
  }
}

@AddValidate([{ validator: 'IsNotEmpty' }])
export class BooleanTypeRequired extends AbstractBooleanType {}

//AbstractDateType

@AddValidate([{ validator: 'IsOptional' }])
export class DateTypeOptional extends AbstractDateType<null> {
  constructor(value: Date | null = null) {
    super(value);
  }
}

@AddValidate([{ validator: 'IsNotEmpty' }])
export class DateTypeRequired extends AbstractDateType {}

export class CreatedAt extends DateTypeRequired {
  static now(): CreatedAt {
    return new CreatedAt(new Date());
  }
}

export class UpdatedAt extends DateTypeRequired {
  static now(): UpdatedAt {
    return new UpdatedAt(new Date());
  }

  setNow(): void {
    this._value = new Date();
  }
}

//AbstractUuidType

@AddValidate([{ validator: 'IsOptional' }])
export class UuidTypeOptional extends AbstractUuidType<null> {
  constructor(value: string | null = null) {
    super(value);
  }
}

@AddValidate([{ validator: 'IsNotEmpty' }])
export class UuidTypeRequired extends AbstractUuidType {}

@AddValidate([{ validator: 'IsNotEmpty' }])
export class IdType extends AbstractUuidType {}

//AbstractNumberType
@AddValidate([{ validator: 'IsOptional' }])
export class NumberTypeOptional extends AbstractNumberType<null> {
  constructor(value: number | null = null) {
    super(value);
  }
}

@AddValidate([{ validator: 'IsNotEmpty' }])
export class NumberTypeRequired extends AbstractNumberType {}

//AbstractStringType
@AddValidate([{ validator: 'IsOptional' }])
export class StringTypeOptional extends AbstractStringType<null> {
  constructor(value: string | null = null) {
    super(value);
  }
}

@AddValidate([{ validator: 'IsNotEmpty' }])
export class StringTypeRequired extends AbstractStringType {}

//array utils
// export class ArrayType {
//   static hasValue<T extends AbstractType<any>>(data: T[], value: T): boolean {
//     return data.some((item) => item.value === value.value);
//   }
//
//   static addValue<T extends AbstractType<any>>(data: T[], value: T): T[] {
//     if (!ArrayType.hasValue(data, value)) {
//       data.push(value);
//     }
//     return data;
//   }
//
//   static removeValue<T extends AbstractType<any>>(data: T[], value: T): T[] {
//     return data.filter((item) => item.value !== value.value);
//   }
// }
