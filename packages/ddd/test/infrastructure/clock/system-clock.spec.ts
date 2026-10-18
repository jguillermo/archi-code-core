import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { Clock } from '../../../src/application/index';
import { CreatedAt } from '../../../src/domain/index';
import { SystemClock } from '../../../src/infrastructure/clock/system-clock';

describe('SystemClock: the clock a production use case is wired with', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('can be injected wherever the application asks for a Clock', () => {
    expectTypeOf<SystemClock>().toMatchTypeOf<Clock>();
  });

  it('tells the current time of the machine', () => {
    vi.useFakeTimers({ now: new Date('2026-03-01T09:30:00Z') });
    expect(new SystemClock().now().toISOString()).toBe('2026-03-01T09:30:00.000Z');
  });

  it('stamps a new record with the current time', () => {
    vi.useFakeTimers({ now: new Date('2026-03-01T09:30:00Z') });
    expect(CreatedAt.now(new SystemClock()).toString()).toBe('2026-03-01T09:30:00.000Z');
  });

  it('gives a new Date on every call, so a caller changing it does not affect the next one', () => {
    const clock = new SystemClock();
    const first = clock.now();
    first.setFullYear(2000);
    expect(clock.now()).not.toBe(first);
    expect(clock.now().getFullYear()).not.toBe(2000);
  });
});
