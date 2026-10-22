import { describe, expect, expectTypeOf, it } from 'vitest';
import * as exceptions from '../../src/exceptions/index';
import type { ExceptionOptions, ValidationIssue } from '../../src/exceptions/index';
import { AggregateNotFoundException } from '../../src/exceptions/application/aggregate-not-found.exception';
import { ExceptionCode } from '../../src/exceptions/exception-code';

const PUBLIC_API = [
  'AbstractException',
  'AggregateNotFoundException',
  'ApplicationException',
  'ConcurrencyException',
  'DomainException',
  'EventDeliveryException',
  'ExceptionClassifier',
  'ExceptionCode',
  'ExceptionKind',
  'InfrastructureException',
  'InternalErrorException',
  'NotAllowedException',
  'RequiredValueException',
  'TypePrimitiveException',
  'UnknownEventException',
  'ValidationException',
];

describe('@archi-code/ddd/exceptions', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(exceptions).sort()).toEqual(PUBLIC_API);
  });

  it('exports the same classes the module declares', () => {
    expect(exceptions.AggregateNotFoundException).toBe(AggregateNotFoundException);
    expect(exceptions.ExceptionCode).toBe(ExceptionCode);
  });

  it('exports every exception and the classifier as a class, the codes and kinds as enums', () => {
    const enums = ['ExceptionCode', 'ExceptionKind'];
    for (const name of PUBLIC_API.filter((name) => !enums.includes(name))) {
      expect(typeof exceptions[name as keyof typeof exceptions]).toBe('function');
    }
    expect(exceptions.ExceptionCode.AggregateNotFound).toBe('APP002');
    expect(exceptions.ExceptionKind.NotFound).toBe('not_found');
  });

  it('keeps the brand that recognizes exceptions across builds out of the public API', () => {
    expect(Object.keys(exceptions)).not.toContain('ExceptionBrand');
  });

  it('exports the options type and the field error of a ValidationException', () => {
    expectTypeOf<ExceptionOptions>().toEqualTypeOf<{ cause?: unknown }>();
    expectTypeOf<ValidationIssue>().toEqualTypeOf<{
      readonly field: string | null;
      readonly code: string;
      readonly message: string;
    }>();
  });
});
