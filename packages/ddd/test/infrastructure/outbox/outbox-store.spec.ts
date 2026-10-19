import { describe, expect, expectTypeOf, it } from 'vitest';
import type { OutboxEntry, OutboxStore } from '../../../src/infrastructure/outbox/outbox-store';
import type { SerializedEvent } from '../../../src/domain/index';

class SqlOutboxDouble implements OutboxStore {
  readonly published: number[] = [];

  constructor(private readonly rows: OutboxEntry[]) {}

  async pending(limit: number): Promise<readonly OutboxEntry[]> {
    return this.rows.filter((row) => !this.published.includes(row.sequence)).slice(0, limit);
  }

  async markPublished(entries: readonly OutboxEntry[]): Promise<void> {
    this.published.push(...entries.map((entry) => entry.sequence));
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
  it('reads the pending entries in order and marks the delivered ones', () => {
    expectTypeOf<OutboxStore>().toEqualTypeOf<{
      pending(limit: number): Promise<readonly OutboxEntry[]>;
      markPublished(entries: readonly OutboxEntry[]): Promise<void>;
    }>();
  });

  it('can be implemented over any database', async () => {
    const store = new SqlOutboxDouble([{ sequence: 7, event: shipped }]);
    const [entry] = await store.pending(10);
    await store.markPublished([entry]);
    expect(await store.pending(10)).toEqual([]);
  });
});
