import { describe, expect, expectTypeOf, it } from 'vitest';
import * as exceptions from '../../src/exceptions/index';
import type { ExceptionOptions } from '../../src/exceptions/index';
import { AggregateNotFoundException } from '../../src/exceptions/domain/aggregate-not-found.exception';
import { ExceptionCode } from '../../src/exceptions/exception-code';

const PUBLIC_API = [
  'AbstractException',
  'AggregateNotFoundException',
  'ApplicationException',
  'ConcurrencyException',
  'DomainException',
  'ExceptionCode',
  'InfrastructureException',
  'InternalErrorException',
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

  it('exports every exception as a class and the codes as an enum', () => {
    for (const name of PUBLIC_API.filter((name) => name !== 'ExceptionCode')) {
      expect(typeof exceptions[name as keyof typeof exceptions]).toBe('function');
    }
    expect(exceptions.ExceptionCode.AggregateNotFound).toBe('DOM002');
  });

  it('keeps the brand that recognizes exceptions across builds out of the public API', () => {
    expect(Object.keys(exceptions)).not.toContain('ExceptionBrand');
  });

  it('exports the options type', () => {
    expectTypeOf<ExceptionOptions>().toEqualTypeOf<{ cause?: unknown }>();
  });
});
