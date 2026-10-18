import { describe, expect, it } from 'vitest';
import { ImmutableDate } from '../../../../src/domain/type/immutable/immutable-date';

const SETTERS: [string, (date: Date) => unknown][] = [
  ['setDate', (date) => date.setDate(1)],
  ['setFullYear', (date) => date.setFullYear(2020)],
  ['setHours', (date) => date.setHours(1)],
  ['setMilliseconds', (date) => date.setMilliseconds(1)],
  ['setMinutes', (date) => date.setMinutes(1)],
  ['setMonth', (date) => date.setMonth(1)],
  ['setSeconds', (date) => date.setSeconds(1)],
  ['setTime', (date) => date.setTime(0)],
  ['setUTCDate', (date) => date.setUTCDate(1)],
  ['setUTCFullYear', (date) => date.setUTCFullYear(2020)],
  ['setUTCHours', (date) => date.setUTCHours(1)],
  ['setUTCMilliseconds', (date) => date.setUTCMilliseconds(1)],
  ['setUTCMinutes', (date) => date.setUTCMinutes(1)],
  ['setUTCMonth', (date) => date.setUTCMonth(1)],
  ['setUTCSeconds', (date) => date.setUTCSeconds(1)],
  ['setYear', (date) => (date as unknown as { setYear(year: number): number }).setYear(2020)],
];

const SHIPPED_AT = '2018-03-23T16:02:15.000Z';

describe('ImmutableDate', () => {
  it('is a Date for the same instant, so it serializes like any date in an API response', () => {
    const date = new ImmutableDate(new Date(SHIPPED_AT));
    expect(date).toBeInstanceOf(Date);
    expect(date.toISOString()).toBe(SHIPPED_AT);
    expect(JSON.stringify({ shippedAt: date })).toBe(`{"shippedAt":"${SHIPPED_AT}"}`);
  });

  it('is a copy, so the caller changing its own Date later does not move the shipment', () => {
    const source = new Date(SHIPPED_AT);
    const date = new ImmutableDate(source);
    source.setUTCFullYear(2020);
    expect(date).not.toBe(source);
    expect(date.toISOString()).toBe(SHIPPED_AT);
  });

  it.each(SETTERS)('%s throws and leaves the shipment date unchanged', (setter, change) => {
    const date = new ImmutableDate(new Date(SHIPPED_AT));
    expect(() => change(date)).toThrow(
      new TypeError(`Cannot call ${setter}: the date is immutable`),
    );
    expect(date.toISOString()).toBe(SHIPPED_AT);
  });

  it('is frozen, so no properties can be attached to it', () => {
    expect(Object.isFrozen(new ImmutableDate(new Date(SHIPPED_AT)))).toBe(true);
  });

  it('a report that needs to shift the date copies it into a regular Date', () => {
    const copy = new Date(new ImmutableDate(new Date(SHIPPED_AT)));
    copy.setUTCDate(copy.getUTCDate() + 7);
    expect(copy.toISOString()).toBe('2018-03-30T16:02:15.000Z');
  });
});
