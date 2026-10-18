import { describe, expect, it, vi } from 'vitest';
import { RequiredValueException } from '../../../src/exceptions/domain/required-value.exception';
import { DomainException } from '../../../src/exceptions/domain/domain.exception';
import { TypePrimitiveException } from '../../../src/exceptions/domain/type-primitive.exception';

describe('RequiredValueException', () => {
  it.each([
    ['nothing was sent', null, 'null'],
    ['the field was left out of the request', undefined, 'undefined'],
    ['the form field was left blank', '   ', '"   "'],
    ['an empty text was sent', '', '""'],
  ])('names the type and shows what arrived when %s', (_, received, shown) => {
    const exception = new RequiredValueException('CustomerEmail', received);

    expect(exception.message).toBe(
      `Validation Error: CustomerEmail is required, but received ${shown}.`,
    );
  });

  it('is a domain exception with the code DOM004', () => {
    const exception = new RequiredValueException('CustomerEmail', null);

    expect(exception).toBeInstanceOf(DomainException);
    expect(exception.code).toBe('DOM004');
    expect(exception.description).toBe('Domain Exception (DOM000), Required Value (DOM004)');
  });

  it('is recognized when thrown by the other build, and not taken for a type error', async () => {
    vi.resetModules();
    const otherCopy = await import('../../../src/exceptions/domain/required-value.exception');
    const thrownByOtherCopy = new otherCopy.RequiredValueException('CustomerEmail', null);

    expect(thrownByOtherCopy instanceof RequiredValueException).toBe(true);
    expect(thrownByOtherCopy instanceof TypePrimitiveException).toBe(false);
  });
});
