import { describe, expect, it } from 'vitest';
import { StringType } from '../../../src/domain/index';
import { ValidationException } from '../../../src/domain/exceptions/validation.exception';
import { LogSerializer } from '../../../src/infrastructure/logging/log-serializer';

const entry = { time: '2026-10-19T09:30:00.000Z', level: 'error', message: 'order_failed' };

const contextOf = (context: Record<string, unknown>): unknown =>
  JSON.parse(LogSerializer.line(entry, context)).context;

describe('LogSerializer: turns a log entry into one JSON line that never throws', () => {
  it('writes the entry alone when there is no context', () => {
    expect(LogSerializer.line(entry, undefined)).toBe(JSON.stringify(entry));
  });

  it('writes plain values, lists and nested objects as they are', () => {
    expect(
      contextOf({
        orderId: 'ord-1001',
        total: 42.5,
        paid: false,
        note: null,
        lines: [{ sku: 'A' }],
      }),
    ).toStrictEqual({
      orderId: 'ord-1001',
      total: 42.5,
      paid: false,
      note: null,
      lines: [{ sku: 'A' }],
    });
  });

  it('writes dates through their toJSON and value objects as their fields', () => {
    expect(
      contextOf({ at: new Date('2026-10-19T09:30:00Z'), customer: new StringType('Ana') }),
    ).toStrictEqual({ at: '2026-10-19T09:30:00.000Z', customer: { _value: 'Ana' } });
  });

  it('writes a bigint as text instead of throwing', () => {
    expect(contextOf({ amountInCents: BigInt('12345678901234567890') })).toStrictEqual({
      amountInCents: '12345678901234567890',
    });
  });

  it('marks a circular reference instead of throwing, but writes an object shared twice in full', () => {
    const order: Record<string, unknown> = { id: 'ord-1001' };
    order.self = order;
    const address = { city: 'Huelva' };

    expect(contextOf({ order, billing: address, shipping: address })).toStrictEqual({
      order: { id: 'ord-1001', self: '[Circular]' },
      billing: { city: 'Huelva' },
      shipping: { city: 'Huelva' },
    });
  });

  it('writes the validation issues of an exception', () => {
    const invalid = new ValidationException([{ field: 'email', message: 'Email: invalid' }]);

    expect(contextOf({ error: invalid })).toMatchObject({
      error: {
        name: 'ValidationException',
        code: 'DOM001',
        errors: [{ field: 'email', code: 'DOM001', message: 'Email: invalid' }],
      },
    });
  });

  it('leaves out the fields an error does not have', () => {
    const bare = new Error('timeout');
    bare.stack = undefined;
    (bare as Error & { code: number }).code = 504;

    expect(contextOf({ error: bare })).toStrictEqual({
      error: { name: 'Error', message: 'timeout' },
    });
  });

  it('writes a placeholder when the context cannot be read', () => {
    const broken = {
      toJSON(): never {
        throw new Error('getter failed');
      },
    };

    expect(contextOf({ broken })).toBe('[Unserializable]');
  });
});
