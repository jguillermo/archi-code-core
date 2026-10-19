import { describe, expect, expectTypeOf, it } from 'vitest';
import { InMemoryOutbox } from '../../../src/infrastructure/outbox/in-memory-outbox';
import type { OutboxStore } from '../../../src/infrastructure/outbox/outbox-store';
import { EventBase } from '../../../src/domain/index';
import type { EventMetadata } from '../../../src/domain/index';
import type { EventBus } from '../../../src/application/index';

class OrderPlaced extends EventBase {
  static readonly eventName = 'OrderPlaced';

  constructor(
    orderId: string,
    readonly customer: string,
    readonly placedAt: Date,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

class OrderShipped extends EventBase {
  static readonly eventName = 'OrderShipped';
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const at = { occurredOn: '2026-03-01T09:30:00Z' };

function placed(): OrderPlaced {
  return new OrderPlaced(orderId, 'Ana', new Date('2026-03-01T09:30:00Z'), at);
}

describe('InMemoryOutbox: where a use case leaves its events, in the same transaction', () => {
  it('is the EventBus a use case publishes to and the store a relay reads', () => {
    expectTypeOf<InMemoryOutbox<OrderPlaced>>().toMatchTypeOf<EventBus<OrderPlaced>>();
    expectTypeOf<InMemoryOutbox>().toMatchTypeOf<OutboxStore>();
  });

  describe('publishing', () => {
    it('stores each event serialized, as a row of an outbox table, numbered in order', async () => {
      const outbox = new InMemoryOutbox<OrderPlaced | OrderShipped>();
      const event = placed();
      await outbox.publish([event, new OrderShipped(orderId, at)]);
      expect(await outbox.pending(10)).toEqual([
        {
          sequence: 1,
          event: {
            eventName: 'OrderPlaced',
            eventVersion: 1,
            eventId: event.eventId,
            aggregateId: orderId,
            occurredOn: '2026-03-01T09:30:00.000Z',
            customer: 'Ana',
            placedAt: '2026-03-01T09:30:00.000Z',
          },
        },
        { sequence: 2, event: expect.objectContaining({ eventName: 'OrderShipped' }) },
      ]);
    });

    it('keeps numbering across publications', async () => {
      const outbox = new InMemoryOutbox();
      await outbox.publish([placed()]);
      await outbox.publish([new OrderShipped(orderId, at)]);
      expect((await outbox.pending(10)).map((entry) => entry.sequence)).toEqual([1, 2]);
    });

    it('stores nothing for an aggregate without new events', async () => {
      const outbox = new InMemoryOutbox();
      await outbox.publish([]);
      expect(await outbox.pending(10)).toEqual([]);
    });

    it('keeps a frozen copy: neither the event nor the returned entry can change what is stored', async () => {
      const outbox = new InMemoryOutbox();
      await outbox.publish([placed()]);
      const [entry] = await outbox.pending(10);
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.event)).toBe(true);
      expect(() => ((entry.event as unknown as { customer: string }).customer = 'Mallory')).toThrow(
        TypeError,
      );
    });

    it('freezes the nested data of a stored event too, such as the lines it carries', async () => {
      class OrderLinesChanged extends EventBase {
        static readonly eventName = 'OrderLinesChanged';

        constructor(
          id: string,
          readonly lines: { sku: string; units: number }[],
        ) {
          super(id);
        }
      }
      const outbox = new InMemoryOutbox();
      await outbox.publish([new OrderLinesChanged(orderId, [{ sku: 'TORCH-01', units: 2 }])]);
      const [entry] = await outbox.pending(10);
      const lines = entry.event.lines as { sku: string; units: number }[];
      expect(Object.isFrozen(lines[0])).toBe(true);
      expect(() => {
        lines[0].units = 5;
      }).toThrow(TypeError);
    });
  });

  describe('reading and marking', () => {
    it('returns at most the requested number of pending entries, oldest first', async () => {
      const outbox = new InMemoryOutbox();
      await outbox.publish([placed(), placed(), placed()]);
      expect((await outbox.pending(2)).map((entry) => entry.sequence)).toEqual([1, 2]);
    });

    it('does not return the entries already marked as published', async () => {
      const outbox = new InMemoryOutbox();
      await outbox.publish([placed(), new OrderShipped(orderId, at)]);
      const [first] = await outbox.pending(1);
      await outbox.markPublished([first]);
      expect((await outbox.pending(10)).map((entry) => entry.sequence)).toEqual([2]);
    });
  });

  describe('as a participant of an in-memory transaction', () => {
    it('forgets the events published after the snapshot when it is restored', async () => {
      const outbox = new InMemoryOutbox();
      await outbox.publish([placed()]);
      const restore = outbox.snapshot();
      await outbox.publish([new OrderShipped(orderId, at)]);
      restore();
      await outbox.publish([new OrderShipped(orderId, at)]);
      expect((await outbox.pending(10)).map((entry) => entry.sequence)).toEqual([1, 2]);
    });

    it('undoes the marks made after the snapshot', async () => {
      const outbox = new InMemoryOutbox();
      await outbox.publish([placed()]);
      const restore = outbox.snapshot();
      await outbox.markPublished(await outbox.pending(10));
      restore();
      expect(await outbox.pending(10)).toHaveLength(1);
    });
  });
});
