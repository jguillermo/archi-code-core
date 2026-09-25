/**
 * Determinism of canBe/convert dates whatever the machine time zone is
 * (moved from test/validator/timezone.spec.ts — it tests convert/canBe, not a validator).
 */
import { afterEach, describe, expect, it } from '@jest/globals';
import timezone_mock from 'timezone-mock';
import { canBeDate } from '../../src/canBe';
import { toDate } from '../../src/convert';

const ZONES = [
  'UTC',
  'US/Pacific',
  'US/Eastern',
  'Brazil/East',
  'Europe/London',
  'Australia/Adelaide',
] as const;

describe('time-zone independence (canBe / convert)', () => {
  afterEach(() => timezone_mock.unregister());

  it('canBeDate / toDate give the same answer in every zone', () => {
    const results = ZONES.map((tz) => {
      timezone_mock.register(tz);
      try {
        return [
          canBeDate('2024-03-10'),
          toDate('2024-03-10').value?.toISOString(),
          toDate('2024-03-10T02:30:00', { iso: true }).value?.toISOString(),
        ];
      } finally {
        timezone_mock.unregister();
      }
    });
    for (const r of results)
      expect(r).toEqual([true, '2024-03-10T00:00:00.000Z', '2024-03-10T02:30:00.000Z']);
  });
});
