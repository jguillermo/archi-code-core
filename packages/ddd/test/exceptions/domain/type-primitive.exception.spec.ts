import { describe, expect, it, vi } from 'vitest';
import { TypePrimitiveException } from '../../../src/exceptions/domain/type-primitive.exception';
import { DomainException } from '../../../src/exceptions/domain/domain.exception';
import { RequiredValueException } from '../../../src/exceptions/domain/required-value.exception';

describe('TypePrimitiveException', () => {
  it.each([
    ['a text that is not a number', 'Number', 'abc', '"abc"'],
    ['a list where a text was expected', 'String', [1, 2], '[1,2]'],
    ['an object where a date was expected', 'Date', { day: 1 }, '{"day":1}'],
    ['a boolean where a UUID was expected', 'UUID', true, 'true'],
  ])('explains what was expected when it receives %s', (_, expected, received, shown) => {
    expect(new TypePrimitiveException(expected, received).message).toBe(
      `Validation Error: Expected a valid ${expected}, but received ${shown}.`,
    );
  });

  it('quotes at most 64 characters of what it received', () => {
    const pastedDocument = 'x'.repeat(10_000);

    expect(new TypePrimitiveException('UUID', pastedDocument).message).toBe(
      `Validation Error: Expected a valid UUID, but received "${'x'.repeat(64)}…".`,
    );
  });

  it('accepts its own wording for types such as enums', () => {
    const exception = new TypePrimitiveException('Expected one of [paid, shipped]', 'lost', '');

    expect(exception.message).toBe(
      'Validation Error: Expected one of [paid, shipped], but received "lost".',
    );
  });

  it('is a domain exception with the code DOM003', () => {
    const exception = new TypePrimitiveException('Number', 'abc');

    expect(exception).toBeInstanceOf(DomainException);
    expect(exception.code).toBe('DOM003');
    expect(exception.description).toBe('Domain Exception (DOM000), Type Failed (DOM003)');
  });

  it('is recognized when thrown by the other build, and not taken for a required value error', async () => {
    vi.resetModules();
    const otherCopy = await import('../../../src/exceptions/domain/type-primitive.exception');
    const thrownByOtherCopy = new otherCopy.TypePrimitiveException('Number', 'abc');

    expect(thrownByOtherCopy instanceof TypePrimitiveException).toBe(true);
    expect(thrownByOtherCopy instanceof RequiredValueException).toBe(false);
  });
});
