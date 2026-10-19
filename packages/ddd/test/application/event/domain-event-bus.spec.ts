import { describe, expect, expectTypeOf, it } from 'vitest';
import { DomainEventBus } from '../../../src/application/event/domain-event-bus';
import { EventRegistry } from '../../../src/application/event/event-registry';
import { EventListener } from '../../../src/application/event/event-listener';
import { ListensTo } from '../../../src/application/event/listens-to';
import type {
  ChannelHandler,
  ChannelSubscription,
  EventBus,
  EventChannel,
  EventSubscriber,
} from '../../../src/application/index';
import { EventBase } from '../../../src/domain/index';
import type { EventMetadata, SerializedEvent } from '../../../src/domain/index';
import { ApplicationException, UnknownEventException } from '../../../src/exceptions/index';

class OrderPlaced extends EventBase {
  static readonly eventName = 'OrderPlaced';

  constructor(
    orderId: string,
    readonly lines: { sku: string; units: number }[],
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

class OrderShipped extends EventBase {
  static readonly eventName = 'OrderShipped';
}

type OrderEvent = OrderPlaced | OrderShipped;

@ListensTo(OrderPlaced)
class ReserveStockOnOrderPlaced extends EventListener<OrderPlaced> {
  readonly reserved: OrderPlaced[] = [];

  handle(event: OrderPlaced): void {
    this.reserved.push(event);
  }
}

@ListensTo(OrderShipped)
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
  return new EventRegistry<OrderEvent>()
    .register(
      OrderPlaced,
      (json) => new OrderPlaced(json.aggregateId, json.lines as OrderPlaced['lines'], json),
    )
    .register(OrderShipped, (json) => new OrderShipped(json.aggregateId, json));
}

describe('DomainEventBus: the bus every channel shares', () => {
  it('is the EventBus of use cases and the EventSubscriber of the wiring', () => {
    expectTypeOf<DomainEventBus<OrderEvent>>().toMatchTypeOf<EventBus<OrderEvent>>();
    expectTypeOf<DomainEventBus<OrderEvent>>().toMatchTypeOf<EventSubscriber<OrderEvent>>();
  });

  it('sends the JSON of every published event to the channel in one send, in order', async () => {
    const channel = new RecordingChannel();
    const bus = new DomainEventBus(channel, orderEvents());
    const placed = new OrderPlaced(orderId, [{ sku: 'TORCH-01', units: 2 }]);
    const shipped = new OrderShipped(orderId);

    await bus.publish([placed, shipped]);

    expect(channel.sends).toStrictEqual([[placed.toJSON(), shipped.toJSON()]]);
  });

  it('freezes what it publishes: a published fact never changes', async () => {
    const bus = new DomainEventBus(new RecordingChannel(), orderEvents());
    const placed = new OrderPlaced(orderId, [{ sku: 'TORCH-01', units: 2 }]);

    await bus.publish([placed]);

    expect(Object.isFrozen(placed)).toBe(true);
    expect(Object.isFrozen(placed.lines)).toBe(true);
  });

  it('subscribes a listener under its event name, with its class name as consumer', async () => {
    const channel = new RecordingChannel();
    const bus = new DomainEventBus(channel, orderEvents());

    await bus.subscribe(new ReserveStockOnOrderPlaced());
    await bus.subscribe(new InvoiceOrderOnOrderShipped());

    expect(channel.receivers.map(({ eventName, consumer }) => [eventName, consumer])).toStrictEqual(
      [
        ['OrderPlaced', 'ReserveStockOnOrderPlaced'],
        ['OrderShipped', 'InvoiceOrderOnOrderShipped'],
      ],
    );
  });

  it('hands the listener the event rebuilt from its JSON, frozen, as any channel would', async () => {
    const bus = new DomainEventBus(new RecordingChannel(), orderEvents());
    const listener = new ReserveStockOnOrderPlaced();
    await bus.subscribe(listener);
    const placed = new OrderPlaced(orderId, [{ sku: 'TORCH-01', units: 2 }]);

    await bus.publish([placed]);

    const [received] = listener.reserved;
    expect(received).toBeInstanceOf(OrderPlaced);
    expect(received).not.toBe(placed);
    expect(received.toJSON()).toStrictEqual(placed.toJSON());
    expect(Object.isFrozen(received)).toBe(true);
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
      new EventRegistry<OrderEvent>().register(
        OrderShipped,
        (json) => new OrderShipped(json.aggregateId, json),
      ),
    );
    await expect(bus.subscribe(new ReserveStockOnOrderPlaced())).rejects.toThrow(
      UnknownEventException,
    );
    expect(channel.receivers).toStrictEqual([]);
  });

  it('propagates what the channel reports when a listener fails', async () => {
    @ListensTo(OrderShipped)
    class PrintLabelOnOrderShipped extends EventListener<OrderShipped> {
      handle(): void {
        throw new Error('label printer offline');
      }
    }
    const bus = new DomainEventBus(new RecordingChannel(), orderEvents());
    await bus.subscribe(new PrintLabelOnOrderShipped());

    await expect(bus.publish([new OrderShipped(orderId)])).rejects.toThrow('label printer offline');
  });
});
