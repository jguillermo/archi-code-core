import { describe, expect, expectTypeOf, it } from 'vitest';
import { InMemoryInbox } from '../../../src/infrastructure/inbox/in-memory-inbox';
import type { InboxStore } from '../../../src/infrastructure/inbox/inbox-store';
import type { TransactionParticipant } from '../../../src/infrastructure/transaction/transaction-participant';

const shippedEventId = 'e7c1a1b0-1d2e-4f3a-8b4c-5d6e7f8a9b0c';

describe('InMemoryInbox: the events each consumer already processed, for tests', () => {
  it('is an InboxStore and a participant of an in-memory transaction', () => {
    expectTypeOf<InMemoryInbox>().toMatchTypeOf<InboxStore>();
    expectTypeOf<InMemoryInbox>().toMatchTypeOf<TransactionParticipant>();
  });

  it('accepts an event the first time and refuses it when the relay delivers it again', async () => {
    const inbox = new InMemoryInbox();
    expect(await inbox.markProcessed('NotifyCustomerOnOrderShipped', shippedEventId)).toBe(true);
    expect(await inbox.markProcessed('NotifyCustomerOnOrderShipped', shippedEventId)).toBe(false);
  });

  it('recognizes the same event id written in capitals by another producer', async () => {
    const inbox = new InMemoryInbox();
    await inbox.markProcessed('NotifyCustomerOnOrderShipped', shippedEventId);
    expect(
      await inbox.markProcessed('NotifyCustomerOnOrderShipped', shippedEventId.toUpperCase()),
    ).toBe(false);
  });

  it('keeps each consumer apart: every listener processes the event once', async () => {
    const inbox = new InMemoryInbox();
    await inbox.markProcessed('NotifyCustomerOnOrderShipped', shippedEventId);
    expect(await inbox.markProcessed('InvoiceOrderOnOrderShipped', shippedEventId)).toBe(true);
  });

  it('forgets what was marked after the snapshot when a transaction rolls back', async () => {
    const inbox = new InMemoryInbox();
    const restore = inbox.snapshot();
    await inbox.markProcessed('NotifyCustomerOnOrderShipped', shippedEventId);
    restore();
    expect(await inbox.markProcessed('NotifyCustomerOnOrderShipped', shippedEventId)).toBe(true);
  });
});
