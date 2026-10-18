import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Clock } from '../../../src/application/ports/clock';
import { CreatedAt } from '../../../src/domain/index';

class OfficeHoursClock implements Clock {
  constructor(private readonly at: string) {}

  now(): Date {
    return new Date(this.at);
  }
}

class Invoice {
  constructor(
    readonly number: string,
    readonly issuedAt: CreatedAt,
  ) {}

  static issue(number: string, clock: Clock): Invoice {
    return new Invoice(number, CreatedAt.now(clock));
  }
}

describe('Clock: the port a use case asks the time from', () => {
  it('only requires now()', () => {
    expectTypeOf<Clock>().toEqualTypeOf<{ now(): Date }>();
  });

  it('lets a test issue an invoice at a known moment', () => {
    const invoice = Invoice.issue('2026-0001', new OfficeHoursClock('2026-03-02T09:00:00Z'));
    expect(invoice.issuedAt.toString()).toBe('2026-03-02T09:00:00.000Z');
  });

  it('a plain object with now() is a clock too', () => {
    const clock: Clock = { now: () => new Date('2026-12-31T23:59:59Z') };
    expect(Invoice.issue('2026-9999', clock).issuedAt.value.getUTCFullYear()).toBe(2026);
  });
});
