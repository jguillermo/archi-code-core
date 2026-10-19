import { describe, expect, it } from 'vitest';
import { PublishedLanguage } from '../../../src/infrastructure/event/published-language';
import { InMemoryOutbox } from '../../../src/infrastructure/outbox/in-memory-outbox';
import { OutboxRelay } from '../../../src/infrastructure/outbox/outbox-relay';
import type { PublishedMessage } from '../../../src/infrastructure/event/published-language';
import { EventBase } from '../../../src/domain/index';
import type { EventMetadata } from '../../../src/domain/index';
import { InfrastructureException } from '../../../src/exceptions/index';

class OrderPlaced extends EventBase {
  static readonly eventName = 'order.placed';

  constructor(
    orderId: string,
    readonly customerEmail: string,
    readonly totalCents: number,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

class OrderLinesChanged extends EventBase {
  static readonly eventName = 'order.lines_changed';
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const eventId = 'e7c1a1b0-1d2e-4f3a-8b4c-5d6e7f8a9b0c';

function salesLanguage(): PublishedLanguage {
  return new PublishedLanguage().expose(OrderPlaced, {
    name: 'sales.order_placed',
    version: 1,
    data: (event) => ({ orderId: event.aggregateId, totalCents: event.totalCents }),
  });
}

function placed(): OrderPlaced {
  return new OrderPlaced(orderId, 'ana@example.com', 2500, {
    eventId,
    occurredOn: '2026-03-01T09:30:00Z',
  });
}

describe('PublishedLanguage: what this context promises to other contexts', () => {
  it('turns an internal event into the published contract, without the data others do not need', () => {
    expect(salesLanguage().translate(placed().toJSON())).toEqual({
      name: 'sales.order_placed',
      version: 1,
      messageId: eventId,
      occurredOn: '2026-03-01T09:30:00.000Z',
      data: { orderId, totalCents: 2500 },
    });
  });

  it('keeps internal events inside the context', () => {
    const language = salesLanguage();
    expect(language.translate(new OrderLinesChanged(orderId).toJSON())).toBeNull();
    expect(language.isPublished('order.lines_changed')).toBe(false);
    expect(language.isPublished('order.placed')).toBe(true);
  });

  it('gives a frozen message, so a broker adapter cannot change the contract', () => {
    const message = salesLanguage().translate(placed().toJSON()) as PublishedMessage;
    expect(Object.isFrozen(message)).toBe(true);
    expect(Object.isFrozen(message.data)).toBe(true);
  });

  it('feeds a broker from the outbox relay, sending only the published events', async () => {
    const outbox = new InMemoryOutbox();
    await outbox.publish([placed(), new OrderLinesChanged(orderId)]);
    const language = salesLanguage();
    const broker: PublishedMessage[] = [];
    const relay = new OutboxRelay(outbox, (event) => {
      const message = language.translate(event);
      if (message !== null) {
        broker.push(message);
      }
    });
    expect(await relay.forward()).toBe(2);
    expect(broker.map((message) => message.name)).toEqual(['sales.order_placed']);
  });

  it('refuses to expose the same event twice', () => {
    const expose = () =>
      salesLanguage().expose(OrderPlaced, {
        name: 'sales.order_placed',
        version: 2,
        data: () => ({}),
      });
    expect(expose).toThrow(InfrastructureException);
    expect(expose).toThrow('Event "order.placed" is already exposed.');
  });

  it.each([
    ['a blank name', { name: ' ', version: 1 }],
    ['version 0', { name: 'sales.order_placed', version: 0 }],
    ['a decimal version', { name: 'sales.order_placed', version: 1.5 }],
  ])('refuses a contract with %s', (_, contract) => {
    expect(() =>
      new PublishedLanguage().expose(OrderPlaced, { ...contract, data: () => ({}) }),
    ).toThrow('Event "order.placed" needs a published name and a version from 1.');
  });
});
