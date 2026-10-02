import { describe, expect, it } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import * as domain from './index';
import type {
  DataTypes,
  JsonTypeValue,
  PrimitiveType,
  PrimitiveTypes,
  RequiredType,
} from './index';
import { AbstractType } from './type/abstract-type';
import { Required } from './type/required/required';
import { StringType } from './type/string-type';
import { RequiredValueException } from './exceptions/domain/required-value.exception';

const PUBLIC_API = [
  'AbstractException',
  'AbstractType',
  'AggregateNotFoundException',
  'AggregateRoot',
  'ApplicationException',
  'ArrayType',
  'BooleanType',
  'CreatedAt',
  'DateType',
  'DomainException',
  'EnumType',
  'EventBase',
  'IdType',
  'InfrastructureException',
  'InternalErrorException',
  'JsonType',
  'NumberType',
  'Required',
  'RequiredValueException',
  'StringType',
  'TypePrimitiveException',
  'UpdatedAt',
  'UuidType',
  'ValidationException',
];

describe('@archi-code/domain', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(domain).sort()).toEqual(PUBLIC_API);
  });

  it('exports the same classes the modules define', () => {
    expect(domain.AbstractType).toBe(AbstractType);
    expect(domain.Required).toBe(Required);
    expect(domain.StringType).toBe(StringType);
    expect(domain.RequiredValueException).toBe(RequiredValueException);
  });

  it('exports every value as a class or function', () => {
    for (const name of PUBLIC_API) {
      expect(typeof domain[name as keyof typeof domain]).toBe('function');
    }
  });

  it('exports the public types', () => {
    class Name extends domain.Required(domain.StringType) {}
    class Person {
      constructor(readonly _name: Name) {}
    }

    expectTypeOf<RequiredType<typeof domain.StringType>>().toMatchTypeOf<
      abstract new (value: string) => domain.StringType
    >();
    expectTypeOf<JsonTypeValue>().toEqualTypeOf<Record<string, any>>();
    expectTypeOf<PrimitiveType<Name>>().toEqualTypeOf<string>();
    expectTypeOf<PrimitiveTypes<Person>>().toEqualTypeOf<{ name: string }>();
    expectTypeOf<DataTypes<Person>>().toEqualTypeOf<{ name?: string }>();
  });
});
