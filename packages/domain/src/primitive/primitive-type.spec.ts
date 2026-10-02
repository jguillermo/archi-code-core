import { describe, it } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import { PrimitiveType } from './primitive-type';
import {
  ArrayType,
  BooleanType,
  CreatedAt,
  DateType,
  EnumType,
  IdType,
  JsonType,
  NumberType,
  Required,
  StringType,
  UpdatedAt,
  UuidType,
} from '../type';

class RequiredBoolean extends Required(BooleanType) {}
class RequiredDate extends Required(DateType) {}
class RequiredNumber extends Required(NumberType) {}
class RequiredString extends Required(StringType) {}
class RequiredUuid extends Required(UuidType) {}

describe('PrimitiveType', () => {
  it('a scalar type is its value, T when required and T | null when optional', () => {
    expectTypeOf<PrimitiveType<RequiredBoolean>>().toEqualTypeOf<boolean>();
    expectTypeOf<PrimitiveType<BooleanType>>().toEqualTypeOf<boolean | null>();
    expectTypeOf<PrimitiveType<RequiredDate>>().toEqualTypeOf<Date>();
    expectTypeOf<PrimitiveType<DateType>>().toEqualTypeOf<Date | null>();
    expectTypeOf<PrimitiveType<RequiredNumber>>().toEqualTypeOf<number>();
    expectTypeOf<PrimitiveType<NumberType>>().toEqualTypeOf<number | null>();
    expectTypeOf<PrimitiveType<RequiredString>>().toEqualTypeOf<string>();
    expectTypeOf<PrimitiveType<StringType>>().toEqualTypeOf<string | null>();
    expectTypeOf<PrimitiveType<RequiredUuid>>().toEqualTypeOf<string>();
    expectTypeOf<PrimitiveType<UuidType>>().toEqualTypeOf<string | null>();
  });

  it('an array of types is the array of their primitives', () => {
    expectTypeOf<PrimitiveType<RequiredString[]>>().toEqualTypeOf<string[]>();
    expectTypeOf<PrimitiveType<StringType[]>>().toEqualTypeOf<(string | null)[]>();
  });

  it('IdType, CreatedAt and UpdatedAt are required', () => {
    expectTypeOf<PrimitiveType<IdType>>().toEqualTypeOf<string>();
    expectTypeOf<PrimitiveType<IdType[]>>().toEqualTypeOf<string[]>();
    expectTypeOf<PrimitiveType<CreatedAt>>().toEqualTypeOf<Date>();
    expectTypeOf<PrimitiveType<UpdatedAt>>().toEqualTypeOf<Date>();
  });

  it('an enum type is widened to string or number', () => {
    enum Status {
      UP = 'up',
      DOWN = 'down',
    }
    enum Level {
      LOW = 1,
      HIGH = 2,
    }
    class StatusType extends EnumType<Status> {
      protected getEnum(): typeof Status {
        return Status;
      }
    }
    class LevelType extends EnumType<Level> {
      protected getEnum(): typeof Level {
        return Level;
      }
    }
    class RequiredStatus extends Required(StatusType) {}
    class RequiredLevel extends Required(LevelType) {}

    expectTypeOf<PrimitiveType<RequiredStatus>>().toEqualTypeOf<string>();
    expectTypeOf<PrimitiveType<StatusType>>().toEqualTypeOf<string | null>();
    expectTypeOf<PrimitiveType<RequiredLevel>>().toEqualTypeOf<number>();
    expectTypeOf<PrimitiveType<LevelType>>().toEqualTypeOf<number | null>();
    expectTypeOf<PrimitiveType<RequiredStatus[]>>().toEqualTypeOf<string[]>();
  });

  it('a json type is its object', () => {
    interface Settings {
      theme: string;
    }
    class SettingsType extends JsonType<Settings> {}
    class RequiredSettings extends Required(SettingsType) {}

    expectTypeOf<PrimitiveType<RequiredSettings>>().toEqualTypeOf<Settings>();
    expectTypeOf<PrimitiveType<SettingsType>>().toEqualTypeOf<Settings | null>();
    expectTypeOf<PrimitiveType<RequiredSettings[]>>().toEqualTypeOf<Settings[]>();
  });

  it('an array type is the array of its item values', () => {
    class Ages extends ArrayType<RequiredNumber> {
      protected createItem(value: unknown): RequiredNumber {
        return new RequiredNumber(value as number);
      }
    }
    class RequiredAges extends Required(Ages) {}
    class Nicknames extends ArrayType<StringType> {
      protected createItem(value: unknown): StringType {
        return new StringType(value as string);
      }
    }

    expectTypeOf<PrimitiveType<RequiredAges>>().toEqualTypeOf<number[]>();
    expectTypeOf<PrimitiveType<Ages>>().toEqualTypeOf<number[] | null>();
    expectTypeOf<PrimitiveType<Nicknames>>().toEqualTypeOf<(string | null)[] | null>();
  });
});
