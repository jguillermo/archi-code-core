import { describe, expect, it } from 'vitest';
import { CriteriaError, quote } from '../src/criteria-error';

describe('CriteriaError', () => {
  it('carries a code, a message and its name', () => {
    const error = new CriteriaError('INVALID_FIELD', 'Invalid field "x"');
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('INVALID_FIELD');
    expect(error.message).toBe('Invalid field "x"');
    expect(error.name).toBe('CriteriaError');
    expect('cause' in error).toBe(false);
  });

  it('keeps the cause like a native Error does', () => {
    const cause = new SyntaxError('Unexpected token');
    const error = new CriteriaError('INVALID_TEXT', 'Not a criteria', { cause });
    expect(error.cause).toBe(cause);
    expect(Object.keys(error)).not.toContain('cause');
    expect(Object.getOwnPropertyDescriptor(error, 'cause')).toEqual({
      value: cause,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  });

  it('keeps an undefined cause only when it is given', () => {
    expect('cause' in new CriteriaError('INVALID_TEXT', 'x', { cause: undefined })).toBe(true);
    expect('cause' in new CriteriaError('INVALID_TEXT', 'x', {})).toBe(false);
  });

  it('recognizes an error built by another copy of the package', () => {
    const brand = Symbol.for('@archi-code/criteria:CriteriaError');
    class OtherCopyError extends Error {
      readonly code = 'INVALID_FIELD';
      readonly [brand] = true;
    }
    expect(new OtherCopyError('x') instanceof CriteriaError).toBe(true);
  });

  it.each([[new Error('plain')], [{ code: 'INVALID_FIELD' }], [null], ['INVALID_FIELD']])(
    'does not recognize %o',
    (value) => {
      expect(value instanceof CriteriaError).toBe(false);
    },
  );
});

describe('quote', () => {
  it('keeps short values', () => {
    expect(quote('name')).toBe('name');
    expect(quote(42)).toBe('42');
  });

  it('cuts values longer than 64 characters', () => {
    expect(quote('a'.repeat(100))).toBe(`${'a'.repeat(64)}…`);
  });
});
