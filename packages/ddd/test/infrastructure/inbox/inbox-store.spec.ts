import { describe, expect, expectTypeOf, it } from 'vitest';
import type { InboxStore } from '../../../src/infrastructure/inbox/inbox-store';

class ProcessedMessagesTableDouble implements InboxStore {
  private readonly rows = new Set<string>();

  async markProcessed(consumer: string, eventId: string): Promise<boolean> {
    const key = `${consumer}/${eventId}`;
    const inserted = !this.rows.has(key);
    this.rows.add(key);
    return inserted;
  }
}

describe('InboxStore: what a consumer needs to process each event only once', () => {
  it('only requires markProcessed, which says whether it was the first time', () => {
    expectTypeOf<InboxStore>().toEqualTypeOf<{
      markProcessed(consumer: string, eventId: string): Promise<boolean>;
    }>();
  });

  it('can be implemented as an insert that ignores duplicates in any database', async () => {
    const inbox = new ProcessedMessagesTableDouble();
    expect(await inbox.markProcessed('NotifyCustomerOnOrderShipped', 'event-1')).toBe(true);
    expect(await inbox.markProcessed('NotifyCustomerOnOrderShipped', 'event-1')).toBe(false);
  });
});
