import { afterEach, describe, expect, it } from '@jest/globals';
import timezone_mock from 'timezone-mock';
import parseDateLax from '../../../src/validators/util/parseDateLax';

describe('parseDateLax (isAfter / isBefore parser)', () => {
  afterEach(() => timezone_mock.unregister());

  it('accepts valid Date instances and rejects invalid ones', () => {
    const d = new Date(0);
    expect(parseDateLax(d)).toBe(d);
    expect(parseDateLax(new Date('x'))).toBeUndefined();
  });

  it('accepts ISO 8601 reduced precision forms', () => {
    expect(parseDateLax('2024')?.getTime()).toBe(Date.UTC(2024, 0, 1));
    expect(parseDateLax('2024-03')?.getTime()).toBe(Date.UTC(2024, 2, 1));
    expect(parseDateLax('2024-03-05')?.getTime()).toBe(Date.UTC(2024, 2, 5));
    expect(parseDateLax('2024-03-05T10:20')?.getTime()).toBe(Date.UTC(2024, 2, 5, 10, 20));
    expect(parseDateLax('2024-03-05T10:20:30.5+01:00')?.getTime()).toBe(
      Date.UTC(2024, 2, 5, 9, 20, 30, 500),
    );
  });

  it('zone-less date-times are UTC regardless of the machine time zone', () => {
    timezone_mock.register('US/Pacific');
    expect(parseDateLax('2024-03-05T10:20:30')?.getTime()).toBe(Date.UTC(2024, 2, 5, 10, 20, 30));
  });

  it('accepts Date#toString() and Date#toUTCString() output (explicit offset)', () => {
    const d = new Date(Date.UTC(2011, 8, 10, 12));
    expect(parseDateLax(d.toString())?.getTime()).toBe(d.getTime());
    expect(parseDateLax(d.toUTCString())?.getTime()).toBe(d.getTime());
  });

  it.each([
    ['01/02/2024'], // engine-dependent
    ['March 7, 2024'],
    ['2024-02-30'],
    ['2023-02-29'],
    ['2024-13'],
    ['2024-00-10'],
    ['2024-01-01T24:00'],
    ['2024-01-01T10:60'],
    ['2024-01-01T10:00:60'],
    ['2024-01-01T10:00+24:00'],
    ['2024-01-01T10:00+01:60'],
    ['Sat Sep 10 2011 12:00:00 GMT+9999'],
    [42],
    [null],
  ])('%p → undefined', (input) => expect(parseDateLax(input)).toBeUndefined());

  it('leap day handling', () => {
    expect(parseDateLax('2024-02-29')).toBeInstanceOf(Date);
    expect(parseDateLax('1900-02-29')).toBeUndefined();
  });
});
