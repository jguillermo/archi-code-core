import { describe, expect, expectTypeOf, it } from 'vitest';
import * as domain from '../src/index';
import type {
  DataTypes,
  EventMetadata,
  ExceptionOptions,
  JsonTypeValue,
  PrimitiveType,
  PrimitiveTypes,
  RequiredType,
  SerializedEvent,
} from '../src/index';
import { AbstractType } from '../src/type/abstract-type';
import { Required } from '../src/type/required/required';
import { StringType } from '../src/type/string-type';
import { RequiredValueException } from '../src/exceptions/domain/required-value.exception';

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
  'Entity',
  'EnumType',
  'EventBase',
  'ExceptionCode',
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

  it('exports every value as a class or function, except the ExceptionCode enum', () => {
    for (const name of PUBLIC_API.filter((name) => name !== 'ExceptionCode')) {
      expect(typeof domain[name as keyof typeof domain]).toBe('function');
    }
    expect(domain.ExceptionCode.AggregateNotFound).toBe('DOM002');
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
    expectTypeOf<EventMetadata>().toEqualTypeOf<{ eventId?: string; occurredOn?: Date | string }>();
    expectTypeOf<ExceptionOptions>().toEqualTypeOf<{ cause?: unknown }>();
    expectTypeOf<SerializedEvent>().toMatchTypeOf<{
      eventName: string;
      eventId: string;
      aggregateId: string;
      occurredOn: string;
    }>();
  });
});
