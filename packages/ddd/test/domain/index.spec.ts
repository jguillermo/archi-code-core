import { describe, expect, expectTypeOf, it } from 'vitest';
import * as domain from '../../src/domain/index';
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateRoot,
  AggregateSaver,
  DataTypes,
  EventClass,
  EventMetadata,
  JsonTypeValue,
  PrimitiveType,
  PrimitiveTypes,
  RequiredType,
  SerializedEvent,
  ValidationIssue,
  ValidationIssueInput,
} from '../../src/domain/index';
import { AbstractType } from '../../src/domain/type/abstract-type';
import { Required } from '../../src/domain/type/required/required-type';
import { StringType } from '../../src/domain/type/string-type';

const PUBLIC_API = [
  'AbstractType',
  'AggregateRepository',
  'AggregateRoot',
  'ArrayType',
  'BooleanType',
  'Composite',
  'CreatedAt',
  'DateType',
  'DomainException',
  'DomainExceptionCode',
  'Entity',
  'EnumType',
  'EventBase',
  'IdType',
  'InvalidEventDefinitionException',
  'JsonType',
  'NumberType',
  'Required',
  'RequiredValueException',
  'Specification',
  'StringType',
  'TypePrimitiveException',
  'UpdatedAt',
  'UuidType',
  'ValidationException',
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

  it('knows nothing about persistence: mappers and repository adapters live in infrastructure', () => {
    expect(Object.keys(domain).filter((name) => /Mapper|Repository|Persist/.test(name))).toEqual([
      'AggregateRepository',
    ]);
    expect(Object.getOwnPropertyNames(domain.AggregateRepository.prototype)).toEqual([
      'constructor',
    ]);
  });

  it('exports every value as a class or function, and the codes as an enum', () => {
    expect(domain.DomainExceptionCode.ValidationFailed).toBe('DOM001');
    for (const name of PUBLIC_API.filter((name) => name !== 'DomainExceptionCode')) {
      expect(typeof domain[name as keyof typeof domain]).toBe('function');
    }
  });

  it('exports only the exceptions of the domain, never the internal base every layer extends', () => {
    expect(Object.keys(domain).filter((name) => name.endsWith('Exception'))).toEqual([
      'DomainException',
      'ValidationException',
      'TypePrimitiveException',
      'RequiredValueException',
      'InvalidEventDefinitionException',
    ]);
    expect(Object.keys(domain)).not.toContain('AbstractException');
  });

  it('exports the field error of a ValidationException as a type', () => {
    expectTypeOf<ValidationIssue>().toEqualTypeOf<{
      readonly field: string | null;
      readonly code: string;
      readonly message: string;
    }>();
    expectTypeOf<ValidationIssueInput>().toMatchTypeOf<{
      readonly field: string | null;
      readonly message: string;
    }>();
  });

  it('exports the base of every repository and the role of each verb as a type', () => {
    expectTypeOf<keyof domain.AggregateRepository<AggregateRoot>>().toEqualTypeOf<never>();
    expectTypeOf<keyof AggregateFinder<AggregateRoot>>().toEqualTypeOf<'findById'>();
    expectTypeOf<keyof AggregateSaver<AggregateRoot>>().toEqualTypeOf<'save'>();
    expectTypeOf<keyof AggregateRemover<AggregateRoot>>().toEqualTypeOf<'remove'>();
    expectTypeOf<AggregateSaver<AggregateRoot>['save']>().toEqualTypeOf<
      (aggregate: AggregateRoot) => Promise<void>
    >();
  });

  it('exports the type of an event class, which carries its static eventName', () => {
    expectTypeOf<EventClass>().toHaveProperty('eventName').toEqualTypeOf<string>();
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
      occurredOn: string;
    }>();
  });
});
