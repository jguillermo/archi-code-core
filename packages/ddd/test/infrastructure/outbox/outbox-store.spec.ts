import { describe, expect, expectTypeOf, it } from 'vitest';
import type { OutboxEntry, OutboxStore } from '../../../src/infrastructure/outbox/outbox-store';
import type { SerializedEvent } from '../../../src/domain/index';

class SqlOutboxDouble implements OutboxStore {
  readonly published: number[] = [];
  readonly parked: number[] = [];
  readonly attempts = new Map<number, number>();

  constructor(private readonly rows: OutboxEntry[]) {}

  async pending(limit: number): Promise<readonly OutboxEntry[]> {
    return this.rows
      .filter(
        (row) => !this.published.includes(row.sequence) && !this.parked.includes(row.sequence),
      )
      .slice(0, limit);
  }

  async markPublished(entries: readonly OutboxEntry[]): Promise<void> {
    this.published.push(...entries.map((entry) => entry.sequence));
  }

  async markFailed(entry: OutboxEntry): Promise<number> {
    const attempts = (this.attempts.get(entry.sequence) ?? 0) + 1;
    this.attempts.set(entry.sequence, attempts);
    return attempts;
  }

  async park(entry: OutboxEntry): Promise<void> {
    this.parked.push(entry.sequence);
  }
}

const shipped: SerializedEvent = {
  eventName: 'OrderShipped',
  eventVersion: 1,
  eventId: 'e7c1a1b0-1d2e-4f3a-8b4c-5d6e7f8a9b0c',
  aggregateId: '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c',
  occurredOn: '2026-03-01T09:30:00.000Z',
};

describe('OutboxStore: what a relay needs from the table where events wait to be delivered', () => {
  it('reads the pending entries in order, marks the delivered ones, counts failures and parks', () => {
    expectTypeOf<OutboxStore>().toEqualTypeOf<{
      pending(limit: number): Promise<readonly OutboxEntry[]>;
      markPublished(entries: readonly OutboxEntry[]): Promise<void>;
      markFailed(entry: OutboxEntry): Promise<number>;
      park(entry: OutboxEntry): Promise<void>;
    }>();
  });

  it('can be implemented over any database', async () => {
    const store = new SqlOutboxDouble([{ sequence: 7, event: shipped }]);
    const [entry] = await store.pending(10);
    await store.markPublished([entry]);
    expect(await store.pending(10)).toEqual([]);
  });

  it('counts the failed deliveries of an entry and takes a parked entry out of the pending ones', async () => {
    const store = new SqlOutboxDouble([{ sequence: 7, event: shipped }]);
    const [entry] = await store.pending(10);
    expect(await store.markFailed(entry)).toBe(1);
    expect(await store.markFailed(entry)).toBe(2);
    await store.park(entry);
    expect(await store.pending(10)).toEqual([]);
  });
});
