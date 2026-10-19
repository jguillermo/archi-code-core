import { describe, expect, it } from 'vitest';
import { ReceivedValue } from '../../../src/exceptions/received/received-value';

describe('ReceivedValue: how an exception quotes the input it refused', () => {
  it.each([
    ['a text, in quotes', 'abc', '"abc"'],
    ['an empty text', '', '""'],
    ['a number', 42, '42'],
    ['null', null, 'null'],
    ['undefined', undefined, 'undefined'],
    ['an object, as JSON', { day: 1 }, '{"day":1}'],
  ])('shows %s', (_, value, shown) => {
    expect(ReceivedValue.describe(value)).toBe(shown);
  });

  it('keeps a text of exactly 64 characters whole', () => {
    const text = 'a'.repeat(64);
    expect(ReceivedValue.describe(text)).toBe(`"${text}"`);
  });

  it('cuts a long pasted text at 64 characters, so messages and HTTP bodies stay small', () => {
    const pasted = 'S'.repeat(100_000);
    expect(ReceivedValue.describe(pasted)).toBe(`"${'S'.repeat(64)}…"`);
  });

  it('cuts a large object too, so a payload full of personal data is not copied into logs', () => {
    const customer = { email: 'ana@example.com', notes: 'x'.repeat(500) };
    const shown = ReceivedValue.describe(customer);
    expect(shown).toHaveLength(65);
    expect(shown.endsWith('…')).toBe(true);
  });
});
