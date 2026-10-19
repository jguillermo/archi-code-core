import { describe, expect, it } from 'vitest';
import type { EventChannel } from '../../src/application/index';
import type { SerializedEvent } from '../../src/domain/index';
import { InfrastructureException } from '../../src/exceptions/index';

export type EventChannelFactory = () => EventChannel | Promise<EventChannel>;

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

export function orderEvent(
  eventName: 'OrderPlaced' | 'OrderShipped',
  eventId: string,
  payload: Record<string, unknown> = {},
): SerializedEvent {
  return {
    eventName,
    eventVersion: 1,
    eventId,
    aggregateId: orderId,
    occurredOn: '2026-10-19T09:30:00.000Z',
    ...payload,
  };
}

export async function eventually(assertion: () => void, timeout = 2000): Promise<void> {
  const deadline = Date.now() + timeout;
  for (;;) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() > deadline) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
}

function inbox() {
  const received: SerializedEvent[] = [];
  return { received, handler: async (event: SerializedEvent) => void received.push(event) };
}

export function describeEventChannelContract(name: string, create: EventChannelFactory): void {
  describe(`${name} fulfils the EventChannel contract`, () => {
    it('delivers an event only to the consumers that receive its name, as the same JSON', async () => {
      const channel = await create();
      const shipping = inbox();
      const billing = inbox();
      await channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', shipping.handler);
      await channel.receive('OrderShipped', 'InvoiceOrderOnOrderShipped', billing.handler);
      const placed = orderEvent('OrderPlaced', '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a', {
        lines: [{ sku: 'TORCH-01', units: 2 }],
      });

      await channel.send([placed]);

      await eventually(() => expect(shipping.received).toStrictEqual([placed]));
      expect(billing.received).toStrictEqual([]);
    });

    it('delivers each event to every consumer of its name', async () => {
      const channel = await create();
      const stock = inbox();
      const mail = inbox();
      await channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', stock.handler);
      await channel.receive('OrderPlaced', 'ConfirmOrderOnOrderPlaced', mail.handler);

      await channel.send([orderEvent('OrderPlaced', '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a')]);

      await eventually(() => {
        expect(stock.received).toHaveLength(1);
        expect(mail.received).toHaveLength(1);
      });
    });

    it('gives one consumer the events of one send in their order', async () => {
      const channel = await create();
      const stock = inbox();
      await channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', stock.handler);
      const ids = [
        '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a',
        '2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b',
        '3f4a5b6c-7d8e-4f9a-8b1c-2d3e4f5a6b7c',
      ];

      await channel.send(ids.map((id) => orderEvent('OrderPlaced', id)));

      await eventually(() =>
        expect(stock.received.map((event) => event.eventId)).toStrictEqual(ids),
      );
    });

    it('accepts an empty send', async () => {
      const channel = await create();
      await expect(channel.send([])).resolves.toBeUndefined();
    });

    it('accepts events nobody receives', async () => {
      const channel = await create();
      await expect(
        channel.send([orderEvent('OrderShipped', '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a')]),
      ).resolves.toBeUndefined();
    });

    it('refuses a second receiver for the same event and consumer while the first is open', async () => {
      const channel = await create();
      await channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', inbox().handler);
      await expect(
        channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', inbox().handler),
      ).rejects.toThrow(InfrastructureException);
    });

    it('lets a consumer receive again once its subscription is closed', async () => {
      const channel = await create();
      const first = await channel.receive(
        'OrderPlaced',
        'ReserveStockOnOrderPlaced',
        inbox().handler,
      );
      await first.close();
      const stock = inbox();
      await channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', stock.handler);

      await channel.send([orderEvent('OrderPlaced', '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a')]);

      await eventually(() => expect(stock.received).toHaveLength(1));
    });

    it('stops delivering to a closed subscription, and only to that one', async () => {
      const channel = await create();
      const stock = inbox();
      const mail = inbox();
      const reserving = await channel.receive(
        'OrderPlaced',
        'ReserveStockOnOrderPlaced',
        stock.handler,
      );
      await channel.receive('OrderPlaced', 'ConfirmOrderOnOrderPlaced', mail.handler);

      await reserving.close();
      await reserving.close();
      await channel.send([orderEvent('OrderPlaced', '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a')]);

      await eventually(() => expect(mail.received).toHaveLength(1));
      expect(stock.received).toStrictEqual([]);
    });

    it('a late close does not close the subscription opened after it', async () => {
      const channel = await create();
      const first = await channel.receive(
        'OrderPlaced',
        'ReserveStockOnOrderPlaced',
        inbox().handler,
      );
      await first.close();
      const stock = inbox();
      await channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', stock.handler);

      await first.close();
      await channel.send([orderEvent('OrderPlaced', '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a')]);

      await eventually(() => expect(stock.received).toHaveLength(1));
      await expect(
        channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', inbox().handler),
      ).rejects.toThrow(InfrastructureException);
    });
  });
}
