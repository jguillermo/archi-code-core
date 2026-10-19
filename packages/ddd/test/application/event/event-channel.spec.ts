import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  ChannelHandler,
  ChannelSubscription,
  EventChannel,
} from '../../../src/application/event/event-channel';
import type { SerializedEvent } from '../../../src/domain/index';

class QueueTable implements EventChannel {
  readonly rows: SerializedEvent[] = [];
  readonly queues = new Map<string, ChannelHandler>();

  async send(events: readonly SerializedEvent[]): Promise<void> {
    this.rows.push(...events);
  }

  async receive(
    eventName: string,
    consumer: string,
    handler: ChannelHandler,
  ): Promise<ChannelSubscription> {
    const queue = `${consumer}.${eventName}`;
    this.queues.set(queue, handler);
    return { close: async () => void this.queues.delete(queue) };
  }
}

describe('EventChannel: the only piece a messaging technology implements', () => {
  it('moves serialized events and names each receiver by event and consumer', () => {
    expectTypeOf<EventChannel['send']>().toEqualTypeOf<
      (events: readonly SerializedEvent[]) => Promise<void>
    >();
    expectTypeOf<EventChannel['receive']>().toEqualTypeOf<
      (eventName: string, consumer: string, handler: ChannelHandler) => Promise<ChannelSubscription>
    >();
    expectTypeOf<ChannelHandler>().toEqualTypeOf<(event: SerializedEvent) => Promise<void>>();
    expectTypeOf<ChannelSubscription>().toEqualTypeOf<{ close(): Promise<void> }>();
  });

  it('a queue-based adapter opens one durable queue per consumer and event', async () => {
    const table = new QueueTable();
    const subscription = await table.receive(
      'OrderPlaced',
      'ReserveStockOnOrderPlaced',
      async () => undefined,
    );
    expect(Array.from(table.queues.keys())).toStrictEqual([
      'ReserveStockOnOrderPlaced.OrderPlaced',
    ]);
    await subscription.close();
    expect(table.queues.size).toBe(0);
  });
});
