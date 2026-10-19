import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ChannelSubscription, EventChannel } from '../../../../src/application/index';
import type { SerializedEvent } from '../../../../src/domain/index';
import { EventDeliveryException } from '../../../../src/exceptions/index';
import { InMemoryEventChannel } from '../../../../src/infrastructure/event/in-memory/in-memory-event-channel';
import { describeEventChannelContract, orderEvent } from '../../../contract/event-channel-contract';

const placed = orderEvent('OrderPlaced', '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a', {
  lines: [{ sku: 'TORCH-01', units: 2 }],
});
const shipped = orderEvent('OrderShipped', '2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b');

describeEventChannelContract('InMemoryEventChannel (serial)', () => new InMemoryEventChannel());
describeEventChannelContract(
  'InMemoryEventChannel (parallel)',
  () => new InMemoryEventChannel({ delivery: 'parallel' }),
);

describe('InMemoryEventChannel: events delivered inside the process', () => {
  it('is an EventChannel', () => {
    expectTypeOf<InMemoryEventChannel>().toMatchTypeOf<EventChannel>();
  });

  it('resolves send once every consumer handled the events', async () => {
    const channel = new InMemoryEventChannel();
    const handled: string[] = [];
    await channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', async (event) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      handled.push(event.eventId);
    });

    await channel.send([placed]);

    expect(handled).toStrictEqual([placed.eventId]);
  });

  it('never runs a consumer synchronously inside send', async () => {
    const channel = new InMemoryEventChannel();
    const steps: string[] = [];
    await channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', async () => {
      steps.push('consumer');
    });

    const sending = channel.send([placed]);
    steps.push('after send');
    await sending;

    expect(steps).toStrictEqual(['after send', 'consumer']);
  });

  it('gives consumers a frozen copy, so one consumer cannot change what the next one reads', async () => {
    const channel = new InMemoryEventChannel();
    const received: SerializedEvent[] = [];
    await channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', async (event) => {
      received.push(event);
    });

    await channel.send([placed]);

    expect(received[0]).not.toBe(placed);
    expect(Object.isFrozen(received[0])).toBe(true);
    expect(Object.isFrozen(received[0].lines)).toBe(true);
    expect(Object.isFrozen(placed)).toBe(false);
  });

  it('records what was sent, in order, as a copy', async () => {
    const channel = new InMemoryEventChannel();
    expect(channel.sent).toStrictEqual([]);

    await channel.send([placed]);
    await channel.send([shipped]);

    expect(channel.sent.map((event) => event.eventName)).toStrictEqual([
      'OrderPlaced',
      'OrderShipped',
    ]);
    expect(channel.sent).not.toBe(channel.sent);
    expect(channel.sent).toStrictEqual([placed, shipped]);
  });

  it('does not call a consumer that started receiving during the delivery', async () => {
    const channel = new InMemoryEventChannel();
    const late: string[] = [];
    const reserving = await channel.receive(
      'OrderPlaced',
      'ReserveStockOnOrderPlaced',
      async () => {
        await reserving.close();
        await channel.receive('OrderPlaced', 'ConfirmOrderOnOrderPlaced', async (event) => {
          late.push(event.eventId);
        });
      },
    );

    await channel.send([placed]);
    expect(late).toStrictEqual([]);

    await channel.send([orderEvent('OrderPlaced', '3f4a5b6c-7d8e-4f9a-8b1c-2d3e4f5a6b7c')]);
    expect(late).toStrictEqual(['3f4a5b6c-7d8e-4f9a-8b1c-2d3e4f5a6b7c']);
  });

  it('skips a consumer closed by an earlier one during the same delivery', async () => {
    const channel = new InMemoryEventChannel();
    const confirmed: string[] = [];
    let confirming: ChannelSubscription = { close: async () => undefined };
    await channel.receive('OrderPlaced', 'CancelConfirmationOnOrderPlaced', async () => {
      await confirming.close();
    });
    confirming = await channel.receive(
      'OrderPlaced',
      'ConfirmOrderOnOrderPlaced',
      async (event) => {
        confirmed.push(event.eventId);
      },
    );

    await channel.send([placed]);

    expect(confirmed).toStrictEqual([]);
  });

  describe('serial delivery (default)', () => {
    it('runs the consumers one after another, in the order they started receiving', async () => {
      const channel = new InMemoryEventChannel();
      const steps: string[] = [];
      await channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', async () => {
        steps.push('stock starts');
        await new Promise((resolve) => setTimeout(resolve, 5));
        steps.push('stock ends');
      });
      await channel.receive('OrderPlaced', 'ConfirmOrderOnOrderPlaced', async () => {
        steps.push('mail');
      });

      await channel.send([placed]);

      expect(steps).toStrictEqual(['stock starts', 'stock ends', 'mail']);
    });

    it('stops at the first failing consumer with its own error, and sends nothing after it', async () => {
      const channel = new InMemoryEventChannel();
      const calls: string[] = [];
      await channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', async () => {
        throw new Error('warehouse offline');
      });
      await channel.receive('OrderPlaced', 'ConfirmOrderOnOrderPlaced', async () => {
        calls.push('mail');
      });
      await channel.receive('OrderShipped', 'InvoiceOrderOnOrderShipped', async () => {
        calls.push('invoice');
      });

      await expect(channel.send([placed, shipped])).rejects.toThrow('warehouse offline');

      expect(calls).toStrictEqual([]);
      expect(channel.sent).toStrictEqual([placed]);
    });
  });

  describe('parallel delivery', () => {
    it('starts every consumer without waiting for the previous one', async () => {
      const channel = new InMemoryEventChannel({ delivery: 'parallel' });
      const steps: string[] = [];
      await channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', async () => {
        steps.push('stock starts');
        await new Promise((resolve) => setTimeout(resolve, 5));
        steps.push('stock ends');
      });
      await channel.receive('OrderPlaced', 'ConfirmOrderOnOrderPlaced', async () => {
        steps.push('mail');
      });

      await channel.send([placed]);

      expect(steps).toStrictEqual(['stock starts', 'mail', 'stock ends']);
    });

    it('runs every consumer and reports all failures in one EventDeliveryException', async () => {
      const channel = new InMemoryEventChannel({ delivery: 'parallel' });
      const calls: string[] = [];
      const offline = new Error('warehouse offline');
      const bounced = new Error('mailbox full');
      await channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', async () => {
        throw offline;
      });
      await channel.receive('OrderPlaced', 'TrackOrderOnOrderPlaced', async () => {
        calls.push('tracking');
      });
      await channel.receive('OrderPlaced', 'ConfirmOrderOnOrderPlaced', () => {
        throw bounced;
      });

      const sending = channel.send([placed]);

      await expect(sending).rejects.toThrow(EventDeliveryException);
      await expect(sending).rejects.toThrow('2 of 3 consumers of "OrderPlaced" failed.');
      await sending.catch((error: EventDeliveryException) => {
        expect(error.errors).toStrictEqual([offline, bounced]);
      });
      expect(calls).toStrictEqual(['tracking']);
    });
  });
});
