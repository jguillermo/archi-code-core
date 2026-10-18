import { describe, expect, it } from 'vitest';
import { ExceptionBrand } from '../../../src/exceptions/brand/exception-brand';

function brandedClass(code: string): object {
  const exceptionClass = class {};
  ExceptionBrand.brandClass(exceptionClass, code);
  return exceptionClass;
}

function brandedError(codes: string[]): Error {
  const error = new Error('boom');
  ExceptionBrand.brandInstance(error, codes);
  return error;
}

describe('ExceptionBrand', () => {
  it('matches an error whose code chain contains the code of the class', () => {
    expect(ExceptionBrand.matches(brandedClass('DOM000'), brandedError(['DOM000', 'DOM002']))).toBe(
      true,
    );
    expect(ExceptionBrand.matches(brandedClass('DOM002'), brandedError(['DOM000', 'DOM002']))).toBe(
      true,
    );
  });

  it('does not match an error of a sibling code', () => {
    expect(ExceptionBrand.matches(brandedClass('DOM001'), brandedError(['DOM000', 'DOM002']))).toBe(
      false,
    );
  });

  it('matches any branded error, even one without codes, for the any-code class', () => {
    const anyCodeClass = brandedClass(ExceptionBrand.anyCode);

    expect(ExceptionBrand.matches(anyCodeClass, brandedError(['PAY001']))).toBe(true);
    expect(ExceptionBrand.matches(anyCodeClass, brandedError([]))).toBe(true);
  });

  it('never matches for a class without brand, such as an application subclass', () => {
    class OrderCancelledException {}

    expect(ExceptionBrand.matches(OrderCancelledException, brandedError(['DOM000']))).toBe(false);
  });

  it('does not inherit the brand of the parent class', () => {
    const parent = brandedClass('DOM000') as new () => object;
    class Child extends parent {}

    expect(ExceptionBrand.matches(Child, brandedError(['DOM000']))).toBe(false);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a code text', 'DOM000'],
    ['a number', 404],
  ])('does not match %s', (_, candidate) => {
    expect(ExceptionBrand.matches(brandedClass('DOM000'), candidate)).toBe(false);
  });

  it('does not match an error that only looks like one of ours', () => {
    const lookalike = Object.assign(new Error('boom'), {
      code: 'DOM000',
      exceptionCodes: ['DOM000'],
    });

    expect(ExceptionBrand.matches(brandedClass('DOM000'), lookalike)).toBe(false);
  });

  it('stores the codes frozen and hidden from the own keys', () => {
    const codes = ['DOM000'];
    const error = brandedError(codes);
    codes.push('DOM001');

    expect(Object.keys(error)).toStrictEqual([]);
    expect(ExceptionBrand.matches(brandedClass('DOM001'), error)).toBe(false);
    const stored = Object.getOwnPropertySymbols(error).map(
      (symbol) => (error as unknown as Record<symbol, unknown>)[symbol],
    );
    expect(stored).toStrictEqual([['DOM000']]);
    expect(Object.isFrozen(stored[0])).toBe(true);
  });
});
