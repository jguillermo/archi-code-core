/**
 * Determinism: date validators must answer identically whatever the machine time zone is.
 */
import { afterEach, describe, expect, it } from '@jest/globals';
import timezone_mock from 'timezone-mock';
import validator from '../../src/validators';

const ZONES = [
  'UTC',
  'US/Pacific',
  'US/Eastern',
  'Brazil/East',
  'Europe/London',
  'Australia/Adelaide',
] as const;

function inEveryZone<T>(fn: () => T): T[] {
  return ZONES.map((tz) => {
    timezone_mock.register(tz);
    try {
      return fn();
    } finally {
      timezone_mock.unregister();
    }
  });
}

const allEqual = <T>(xs: T[]): boolean =>
  xs.every((x) => JSON.stringify(x) === JSON.stringify(xs[0]));

describe('time-zone independence', () => {
  afterEach(() => timezone_mock.unregister());

  it('isAfter / isBefore with zone-less date-times', () => {
    const results = inEveryZone(() => [
      validator.isAfter('2024-01-01T10:00:00', '2024-01-01T09:59:59'),
      validator.isBefore('2024-01-01T00:00:00', '2024-01-01'),
      validator.isAfter('2024-01-01T00:00:01', '2024-01-01'),
    ]);
    expect(allEqual(results)).toBe(true);
    expect(results[0]).toEqual([true, false, true]);
  });

  it('isDate / isISO8601 / isRFC3339', () => {
    const results = inEveryZone(() => [
      validator.isDate('2024-02-29', { format: 'YYYY-MM-DD' }),
      validator.isDate('2024-02-30', { format: 'YYYY-MM-DD' }),
      validator.isISO8601('2024-02-29', { strict: true }),
      validator.isISO8601('2023-02-29', { strict: true }),
      validator.isRFC3339('2024-03-31T02:30:00Z'), // DST gap in Europe — still a valid UTC instant
    ]);
    expect(allEqual(results)).toBe(true);
    expect(results[0]).toEqual([true, false, true, false, true]);
  });
});
