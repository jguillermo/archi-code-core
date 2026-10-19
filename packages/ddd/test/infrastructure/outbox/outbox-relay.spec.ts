import { describe, expect, it, vi } from 'vitest';
import { OutboxRelay } from '../../../src/infrastructure/outbox/outbox-relay';
import { InMemoryOutbox } from '../../../src/infrastructure/outbox/in-memory-outbox';
import { EventBase } from '../../../src/domain/index';
import type { SerializedEvent } from '../../../src/domain/index';

class OrderShipped extends EventBase {
  static readonly eventName = 'OrderShipped';
}

const orderIds = [
  '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c',
  '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f',
  '5d6e7f80-9a1b-4c2d-8e3f-4a5b6c7d8e9f',
];

async function outboxWithShipments(): Promise<InMemoryOutbox<OrderShipped>> {
  const outbox = new InMemoryOutbox<OrderShipped>();
  await outbox.publish(orderIds.map((id) => new OrderShipped(id)));
  return outbox;
}

describe('OutboxRelay: delivers the events a transaction committed, after the commit', () => {
  it('delivers every pending event in order and marks them, so they are not delivered twice', async () => {
    const outbox = await outboxWithShipments();
    const broker: SerializedEvent[] = [];
    const relay = new OutboxRelay(outbox, (event) => {
      broker.push(event);
    });

    expect(await relay.forward()).toBe(3);
    expect(broker.map((event) => event.aggregateId)).toEqual(orderIds);
    expect(await relay.forward()).toBe(0);
    expect(broker).toHaveLength(3);
  });

  it('hands each event with its outbox sequence, so a consumer can keep the order', async () => {
    const outbox = await outboxWithShipments();
    const received: [string, number][] = [];
    await new OutboxRelay(outbox, (event, sequence) => {
      received.push([event.aggregateId, sequence]);
    }).forward();
    expect(received).toEqual([
      [orderIds[0], 1],
      [orderIds[1], 2],
      [orderIds[2], 3],
    ]);
  });

  it('delivers at most the batch size on each run', async () => {
    const outbox = await outboxWithShipments();
    const deliver = vi.fn(async () => undefined);
    const relay = new OutboxRelay(outbox, deliver);
    expect(await relay.forward(2)).toBe(2);
    expect(await relay.forward(2)).toBe(1);
    expect(deliver).toHaveBeenCalledTimes(3);
  });

  it('when the broker fails, keeps the failed event and the next ones for the next run', async () => {
    const outbox = await outboxWithShipments();
    const broker: string[] = [];
    let brokerDown = true;
    const relay = new OutboxRelay(outbox, async (event) => {
      if (brokerDown && event.aggregateId === orderIds[1]) {
        throw new Error('broker unavailable');
      }
      broker.push(event.aggregateId);
    });

    await expect(relay.forward()).rejects.toThrow('broker unavailable');
    expect(broker).toEqual([orderIds[0]]);
    expect((await outbox.pending(10)).map((entry) => entry.event.aggregateId)).toEqual(
      orderIds.slice(1),
    );

    brokerDown = false;
    expect(await relay.forward()).toBe(2);
    expect(broker).toEqual(orderIds);
  });

  it('marks nothing when the first delivery fails', async () => {
    const outbox = await outboxWithShipments();
    const markPublished = vi.spyOn(outbox, 'markPublished');
    const relay = new OutboxRelay(outbox, () => {
      throw new Error('broker unavailable');
    });
    await expect(relay.forward()).rejects.toThrow('broker unavailable');
    expect(markPublished).not.toHaveBeenCalled();
    expect(await outbox.pending(10)).toHaveLength(3);
  });

  it('does nothing with an empty outbox', async () => {
    const outbox = new InMemoryOutbox();
    const markPublished = vi.spyOn(outbox, 'markPublished');
    expect(await new OutboxRelay(outbox, vi.fn()).forward()).toBe(0);
    expect(markPublished).not.toHaveBeenCalled();
  });
});
