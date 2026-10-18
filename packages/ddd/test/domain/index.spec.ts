import { describe, expect, expectTypeOf, it } from 'vitest';
import * as domain from '../../src/domain/index';
import type {
  DataTypes,
  EventMetadata,
  JsonTypeValue,
  PrimitiveType,
  PrimitiveTypes,
  RequiredType,
  SerializedEvent,
} from '../../src/domain/index';
import { AbstractType } from '../../src/domain/type/abstract-type';
import { Required } from '../../src/domain/type/required/required';
import { StringType } from '../../src/domain/type/string-type';

const PUBLIC_API = [
  'AbstractType',
  'AggregateRoot',
  'ArrayType',
  'BooleanType',
  'CreatedAt',
  'DateType',
  'EnumType',
  'EventBase',
  'IdType',
  'JsonType',
  'NumberType',
  'Required',
  'StringType',
  'UpdatedAt',
  'UuidType',
];

describe('@archi-code/ddd/domain', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(domain).sort()).toEqual(PUBLIC_API);
  });

  it('exports the same classes the modules define', () => {
    expect(domain.AbstractType).toBe(AbstractType);
    expect(domain.Required).toBe(Required);
    expect(domain.StringType).toBe(StringType);
  });

  it('exports every value as a class or function', () => {
    for (const name of PUBLIC_API) {
      expect(typeof domain[name as keyof typeof domain]).toBe('function');
    }
  });

  it('exports no exception: they live in @archi-code/ddd/exceptions', () => {
    expect(Object.keys(domain).filter((name) => name.endsWith('Exception'))).toEqual([]);
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
    expectTypeOf<EventMetadata>().toEqualTypeOf<{
      eventId?: string;
      occurredOn?: Date | string;
      clock?: { now(): Date };
    }>();
    expectTypeOf<SerializedEvent>().toMatchTypeOf<{
      eventName: string;
      eventId: string;
      aggregateId: string;
      occurredOn: string;
    }>();
  });
});
