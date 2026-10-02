import { describe, expect, it } from '@jest/globals';
import { ImmutableDate } from './immutable-date';

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

const ISO = '2018-03-23T16:02:15.000Z';

describe('ImmutableDate', () => {
  it('is a Date with the same instant as the given one', () => {
    const date = new ImmutableDate(new Date(ISO));
    expect(date).toBeInstanceOf(Date);
    expect(date.toISOString()).toBe(ISO);
    expect(JSON.stringify(date)).toBe(`"${ISO}"`);
  });

  it('is a copy of the given Date', () => {
    const source = new Date(ISO);
    const date = new ImmutableDate(source);
    source.setUTCFullYear(2020);
    expect(date).not.toBe(source);
    expect(date.toISOString()).toBe(ISO);
  });

  it.each(SETTERS)('%s throws and leaves the date unchanged', (setter, change) => {
    const date = new ImmutableDate(new Date(ISO));
    expect(() => change(date)).toThrow(
      new TypeError(`Cannot call ${setter}: the date is immutable`),
    );
    expect(date.toISOString()).toBe(ISO);
  });

  it('is frozen, so no properties can be added', () => {
    const date = new ImmutableDate(new Date(ISO));
    expect(Object.isFrozen(date)).toBe(true);
  });

  it('can be copied into a regular, mutable Date', () => {
    const copy = new Date(new ImmutableDate(new Date(ISO)));
    copy.setUTCFullYear(2020);
    expect(copy.getUTCFullYear()).toBe(2020);
  });
});
