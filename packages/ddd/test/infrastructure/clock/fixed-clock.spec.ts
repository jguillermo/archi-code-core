import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Clock } from '../../../src/application/index';
import { AggregateRoot, CreatedAt, IdType, UpdatedAt } from '../../../src/domain/index';
import { RequiredValueException } from '../../../src/domain/exceptions/required-value.exception';
import { TypePrimitiveException } from '../../../src/domain/exceptions/type-primitive.exception';
import { FixedClock } from '../../../src/infrastructure/clock/fixed-clock';

class InvoiceId extends IdType<'InvoiceId'> {}

class Invoice extends AggregateRoot<InvoiceId> {
  private constructor(
    id: InvoiceId,
    readonly issuedAt: CreatedAt,
    private _updatedAt: UpdatedAt,
  ) {
    super(id);
  }

  static issue(id: string, clock: Clock): Invoice {
    return new Invoice(new InvoiceId(id), CreatedAt.now(clock), UpdatedAt.now(clock));
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  touch(clock: Clock): void {
    this._updatedAt = UpdatedAt.now(clock);
  }
}

const invoiceId = '0f8c2b6e-3c1a-4c55-9a4e-0d6c1b2f7a10';

describe('FixedClock: deterministic time in tests', () => {
  it('can be injected wherever the application asks for a Clock', () => {
    expectTypeOf<FixedClock>().toMatchTypeOf<Clock>();
  });

  it('an invoice issued in a test always has the same issue date', () => {
    const clock = new FixedClock('2026-03-01T09:30:00Z');
    expect(Invoice.issue(invoiceId, clock).issuedAt.toString()).toBe('2026-03-01T09:30:00.000Z');
    expect(Invoice.issue(invoiceId, clock).issuedAt.toString()).toBe('2026-03-01T09:30:00.000Z');
  });

  it('accepts the starting moment as a Date', () => {
    expect(new FixedClock(new Date('2026-03-01T09:30:00+01:00')).now().toISOString()).toBe(
      '2026-03-01T08:30:00.000Z',
    );
  });

  it('keeps its own copy of the starting Date', () => {
    const start = new Date('2026-03-01T09:30:00Z');
    const clock = new FixedClock(start);
    start.setFullYear(2000);
    expect(clock.now().toISOString()).toBe('2026-03-01T09:30:00.000Z');
  });

  it('gives a new mutable Date on every call, so a caller changing it does not move the clock', () => {
    const clock = new FixedClock('2026-03-01T09:30:00Z');
    const now = clock.now();
    now.setFullYear(2000);
    expect(clock.now()).not.toBe(now);
    expect(clock.now().toISOString()).toBe('2026-03-01T09:30:00.000Z');
  });

  it('advance moves time forward, as when a user edits the invoice a minute later', () => {
    const clock = new FixedClock('2026-03-01T09:30:00Z');
    const invoice = Invoice.issue(invoiceId, clock);
    clock.advance(60_000);
    invoice.touch(clock);
    expect(invoice.issuedAt.toString()).toBe('2026-03-01T09:30:00.000Z');
    expect(invoice.updatedAt.toString()).toBe('2026-03-01T09:31:00.000Z');
  });

  it('advance with a negative amount moves time back', () => {
    const clock = new FixedClock('2026-03-01T09:30:00Z');
    clock.advance(-1_000);
    expect(clock.now().toISOString()).toBe('2026-03-01T09:29:59.000Z');
  });

  it('set jumps to another moment, as when a test moves to the next billing day', () => {
    const clock = new FixedClock('2026-03-01T09:30:00Z');
    clock.set('2026-04-01T00:00:00Z');
    expect(clock.now().toISOString()).toBe('2026-04-01T00:00:00.000Z');
    clock.set(new Date('2026-05-01T00:00:00Z'));
    expect(clock.now().toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it.each([
    ['a local time without zone', '2026-03-01T09:30:00'],
    ['a text that is not a date', 'tomorrow'],
    ['an impossible date', '2026-02-30'],
  ])('refuses to start at %s', (_, at) => {
    expect(() => new FixedClock(at)).toThrow(TypePrimitiveException);
  });

  it('refuses to jump to a local time without zone', () => {
    const clock = new FixedClock('2026-03-01T09:30:00Z');
    expect(() => clock.set('2026-04-01T00:00:00')).toThrow(TypePrimitiveException);
    expect(clock.now().toISOString()).toBe('2026-03-01T09:30:00.000Z');
  });

  it('refuses to start without a moment', () => {
    expect(() => new FixedClock(null as unknown as string)).toThrow(RequiredValueException);
  });
});
