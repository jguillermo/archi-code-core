import { describe, expect, expectTypeOf, it } from 'vitest';
import { DomainEventBus } from '../../../src/infrastructure/event/domain-event-bus';
import type { Subscription } from '../../../src/infrastructure/event/domain-event-bus';
import { EventRegistry } from '../../../src/infrastructure/event/event-registry';
import type {
  ChannelHandler,
  ChannelSubscription,
  EventChannel,
} from '../../../src/infrastructure/event/event-channel';
import { EventListener, ListensTo } from '../../../src/application/index';
import type { EventBus } from '../../../src/application/index';
import { EventBase } from '../../../src/domain/index';
import type { EventMetadata, SerializedEvent } from '../../../src/domain/index';
import { ApplicationException } from '../../../src/application/exceptions/application.exception';
import { ConcurrencyException } from '../../../src/application/exceptions/concurrency.exception';
import { DomainException } from '../../../src/domain/exceptions/domain.exception';
import { UnknownEventException } from '../../../src/infrastructure/exceptions/unknown-event.exception';
import { InMemoryLogger } from '../../../src/infrastructure/logging/in-memory-logger';

class OrderPlaced extends EventBase {
  static readonly eventName = 'OrderPlaced';

  constructor(
    readonly orderId: string,
    readonly lines: { sku: string; units: number }[],
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

class OrderShipped extends EventBase {
  static readonly eventName = 'OrderShipped';

  constructor(
    readonly orderId: string,
    metadata?: EventMetadata,
  ) {
    super(metadata);
  }
}

@ListensTo(OrderPlaced, { consumer: 'reserve-stock-on-order-placed' })
class ReserveStockOnOrderPlaced extends EventListener<OrderPlaced> {
  readonly reserved: OrderPlaced[] = [];

  handle(event: OrderPlaced): void {
    this.reserved.push(event);
  }
}

@ListensTo(OrderShipped, { consumer: 'invoice-order-on-order-shipped' })
class InvoiceOrderOnOrderShipped extends EventListener<OrderShipped> {
  handle(): void {
    return undefined;
  }
}

class RecordingChannel implements EventChannel {
  readonly sends: (readonly SerializedEvent[])[] = [];
  readonly receivers: { eventName: string; consumer: string; handler: ChannelHandler }[] = [];
  closed = 0;

  async send(events: readonly SerializedEvent[]): Promise<void> {
    this.sends.push(events);
    for (const event of events) {
      for (const receiver of this.receivers.filter((r) => r.eventName === event.eventName)) {
        await receiver.handler(event);
      }
    }
  }

  async receive(
    eventName: string,
    consumer: string,
    handler: ChannelHandler,
  ): Promise<ChannelSubscription> {
    this.receivers.push({ eventName, consumer, handler });
    return { close: async () => void this.closed++ };
  }
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

function orderEvents() {
  return new EventRegistry()
    .register(
      OrderPlaced,
      (json) => new OrderPlaced(json.orderId as string, json.lines as OrderPlaced['lines'], json),
    )
    .register(OrderShipped, (json) => new OrderShipped(json.orderId as string, json));
}

describe('DomainEventBus: the bus every channel shares', () => {
  it('is the EventBus of use cases and subscribes the listeners of the wiring', () => {
    expectTypeOf<DomainEventBus>().toMatchTypeOf<EventBus>();
    expectTypeOf<DomainEventBus['subscribe']>().toEqualTypeOf<
      (listener: EventListener) => Promise<Subscription>
    >();
  });

  it('sends the JSON of every published event to the channel in one send, in order', async () => {
    const channel = new RecordingChannel();
    const bus = new DomainEventBus(channel, orderEvents());
    const placed = new OrderPlaced(orderId, [{ sku: 'TORCH-01', units: 2 }]);
    const shipped = new OrderShipped(orderId);

    await bus.publish([placed, shipped]);

    expect(channel.sends).toStrictEqual([[{ ...placed }, { ...shipped }]]);
  });

  it('subscribes a listener under its event name, with the consumer name it declares', async () => {
    const channel = new RecordingChannel();
    const bus = new DomainEventBus(channel, orderEvents());

    await bus.subscribe(new ReserveStockOnOrderPlaced());
    await bus.subscribe(new InvoiceOrderOnOrderShipped());

    expect(channel.receivers.map(({ eventName, consumer }) => [eventName, consumer])).toStrictEqual(
      [
        ['OrderPlaced', 'reserve-stock-on-order-placed'],
        ['OrderShipped', 'invoice-order-on-order-shipped'],
      ],
    );
  });

  it('hands the listener the event rebuilt from its JSON, as any channel would', async () => {
    const bus = new DomainEventBus(new RecordingChannel(), orderEvents());
    const listener = new ReserveStockOnOrderPlaced();
    await bus.subscribe(listener);
    const placed = new OrderPlaced(orderId, [{ sku: 'TORCH-01', units: 2 }]);

    await bus.publish([placed]);

    const [received] = listener.reserved;
    expect(received).toBeInstanceOf(OrderPlaced);
    expect(received).not.toBe(placed);
    expect({ ...received }).toStrictEqual({ ...placed });
  });

  it('closes the channel subscription on unsubscribe', async () => {
    const channel = new RecordingChannel();
    const bus = new DomainEventBus(channel, orderEvents());
    const subscription = await bus.subscribe(new ReserveStockOnOrderPlaced());

    await subscription.unsubscribe();

    expect(channel.closed).toBe(1);
  });

  it('refuses a listener without @ListensTo', async () => {
    class ReserveStock extends EventListener<OrderPlaced> {
      handle(): void {
        return undefined;
      }
    }
    const bus = new DomainEventBus(new RecordingChannel(), orderEvents());
    await expect(bus.subscribe(new ReserveStock())).rejects.toThrow(ApplicationException);
  });

  it('refuses at wiring time a listener of an event the registry cannot rebuild', async () => {
    const channel = new RecordingChannel();
    const bus = new DomainEventBus(
      channel,
      new EventRegistry().register(
        OrderShipped,
        (json) => new OrderShipped(json.orderId as string, json),
      ),
    );
    await expect(bus.subscribe(new ReserveStockOnOrderPlaced())).rejects.toThrow(
      UnknownEventException,
    );
    expect(channel.receivers).toStrictEqual([]);
  });

  it('propagates what the channel reports when a listener fails', async () => {
    @ListensTo(OrderShipped, { consumer: 'print-label-on-order-shipped' })
    class PrintLabelOnOrderShipped extends EventListener<OrderShipped> {
      handle(): void {
        throw new Error('label printer offline');
      }
    }
    const bus = new DomainEventBus(new RecordingChannel(), orderEvents());
    await bus.subscribe(new PrintLabelOnOrderShipped());

    await expect(bus.publish([new OrderShipped(orderId)])).rejects.toThrow('label printer offline');
  });

  describe('logging', () => {
    it('logs at debug the name and ids of what it published, never the payload', async () => {
      const logger = new InMemoryLogger();
      const bus = new DomainEventBus(new RecordingChannel(), orderEvents(), logger);
      const placed = new OrderPlaced(orderId, [{ sku: 'TORCH-01', units: 2 }]);

      await bus.publish([placed]);

      expect(logger.entries).toStrictEqual([
        {
          level: 'debug',
          message: 'domain_events_published',
          context: {
            events: [{ eventName: 'OrderPlaced', eventId: placed.eventId }],
          },
        },
      ]);
    });

    it('logs nothing as published when the channel refuses the events', async () => {
      const logger = new InMemoryLogger();
      const channel = new RecordingChannel();
      channel.send = async () => {
        throw new Error('broker unreachable');
      };
      const bus = new DomainEventBus(channel, orderEvents(), logger);

      await expect(bus.publish([new OrderShipped(orderId)])).rejects.toThrow('broker unreachable');
      expect(logger.entries).toStrictEqual([]);
    });

    it('logs at info when a consumer starts and stops receiving', async () => {
      const logger = new InMemoryLogger();
      const bus = new DomainEventBus(new RecordingChannel(), orderEvents(), logger);

      const subscription = await bus.subscribe(new ReserveStockOnOrderPlaced());
      await subscription.unsubscribe();

      const context = { eventName: 'OrderPlaced', consumer: 'reserve-stock-on-order-placed' };
      expect(logger.entries).toStrictEqual([
        { level: 'info', message: 'event_listener_subscribed', context },
        { level: 'info', message: 'event_listener_unsubscribed', context },
      ]);
    });

    it('logs nothing for a listener it refuses at wiring time', async () => {
      const logger = new InMemoryLogger();
      const bus = new DomainEventBus(
        new RecordingChannel(),
        new EventRegistry().register(
          OrderShipped,
          (json) => new OrderShipped(json.orderId as string, json),
        ),
        logger,
      );

      await expect(bus.subscribe(new ReserveStockOnOrderPlaced())).rejects.toThrow(
        UnknownEventException,
      );
      expect(logger.entries).toStrictEqual([]);
    });

    it('logs a listener that fails as an error, with the event and the consumer, and still rejects', async () => {
      const outage = new Error('label printer offline');
      @ListensTo(OrderShipped, { consumer: 'print-label-on-order-shipped' })
      class PrintLabelOnOrderShipped extends EventListener<OrderShipped> {
        handle(): void {
          throw outage;
        }
      }
      const logger = new InMemoryLogger();
      const bus = new DomainEventBus(new RecordingChannel(), orderEvents(), logger);
      await bus.subscribe(new PrintLabelOnOrderShipped());
      const shipped = new OrderShipped(orderId);

      await expect(bus.publish([shipped])).rejects.toBe(outage);

      expect(logger.entries.filter(({ level }) => level === 'error')).toStrictEqual([
        {
          level: 'error',
          message: 'event_listener_failed',
          context: {
            eventName: 'OrderShipped',
            consumer: 'print-label-on-order-shipped',
            eventId: shipped.eventId,
            error: outage,
          },
        },
      ]);
    });

    it.each([
      ['a broken business rule', new DomainException('Order is already invoiced', ['ORD003'])],
      ['a concurrent change', new ConcurrencyException('Invoice', orderId, 1)],
    ])('logs a listener rejected by %s as a warning', async (_, rejection) => {
      @ListensTo(OrderShipped, { consumer: 'invoice-order-on-order-shipped' })
      class InvoiceOnShipped extends EventListener<OrderShipped> {
        handle(): void {
          throw rejection;
        }
      }
      const logger = new InMemoryLogger();
      const bus = new DomainEventBus(new RecordingChannel(), orderEvents(), logger);
      await bus.subscribe(new InvoiceOnShipped());

      await expect(bus.publish([new OrderShipped(orderId)])).rejects.toBe(rejection);

      expect(logger.entries.find(({ level }) => level === 'warn')).toMatchObject({
        message: 'event_listener_rejected',
        context: { consumer: 'invoice-order-on-order-shipped', error: rejection },
      });
      expect(logger.entries.some(({ level }) => level === 'error')).toBe(false);
    });

    it('logs as an error an event the registry cannot rebuild', async () => {
      const logger = new InMemoryLogger();
      const channel = new RecordingChannel();
      const bus = new DomainEventBus(channel, orderEvents(), logger);
      await bus.subscribe(new InvoiceOrderOnOrderShipped());
      const [receiver] = channel.receivers;

      await expect(
        receiver.handler({ ...new OrderShipped(orderId), eventName: 'OrderReturned' }),
      ).rejects.toThrow(UnknownEventException);

      expect(logger.entries[logger.entries.length - 1]).toMatchObject({
        level: 'error',
        message: 'event_listener_failed',
        context: { eventName: 'OrderShipped', consumer: 'invoice-order-on-order-shipped' },
      });
    });
  });
});
