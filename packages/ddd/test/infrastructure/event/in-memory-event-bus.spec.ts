import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { EventBus } from '../../../src/application/index';
import { EventBase } from '../../../src/domain/index';
import { InMemoryEventBus } from '../../../src/infrastructure/event/in-memory-event-bus';

class OrderPlaced extends EventBase {
  constructor(
    orderId: string,
    readonly customer: string,
  ) {
    super(orderId);
  }

  eventName(): string {
    return 'order.placed';
  }
}

class OrderShipped extends EventBase {
  eventName(): string {
    return 'order.shipped';
  }
}

type OrderEvent = OrderPlaced | OrderShipped;

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

describe('InMemoryEventBus: publishing domain events inside one process', () => {
  it('can be injected wherever the application asks for an EventBus', () => {
    expectTypeOf(new InMemoryEventBus<OrderEvent>()).toMatchTypeOf<EventBus<OrderEvent>>();
  });

  it('a welcome email handler receives the order it subscribed to', async () => {
    const bus = new InMemoryEventBus<OrderEvent>();
    const sendConfirmation = vi.fn();
    bus.subscribe<OrderPlaced>('order.placed', (event) => sendConfirmation(event.customer));
    await bus.publish([new OrderPlaced(orderId, 'Ana')]);
    expect(sendConfirmation).toHaveBeenCalledExactlyOnceWith('Ana');
  });

  it('types the handler with the subscribed event', () => {
    const bus = new InMemoryEventBus<OrderEvent>();
    bus.subscribe<OrderPlaced>('order.placed', (event) => {
      expectTypeOf(event).toEqualTypeOf<OrderPlaced>();
    });
  });

  it('does not call the handlers of other events', async () => {
    const bus = new InMemoryEventBus<OrderEvent>();
    const notifyWarehouse = vi.fn();
    bus.subscribe('order.shipped', notifyWarehouse);
    await bus.publish([new OrderPlaced(orderId, 'Ana')]);
    expect(notifyWarehouse).not.toHaveBeenCalled();
  });

  it('publishes events nobody listens to without failing', async () => {
    const bus = new InMemoryEventBus<OrderEvent>();
    await expect(bus.publish([new OrderShipped(orderId)])).resolves.toBeUndefined();
    expect(bus.published).toHaveLength(1);
  });

  it('calls every handler of an event, waiting for each one before the next', async () => {
    const bus = new InMemoryEventBus<OrderEvent>();
    const log: string[] = [];
    bus.subscribe('order.placed', async () => {
      await delay(5);
      log.push('reserve stock');
    });
    bus.subscribe('order.placed', () => {
      log.push('send confirmation');
    });
    await bus.publish([new OrderPlaced(orderId, 'Ana')]);
    expect(log).toEqual(['reserve stock', 'send confirmation']);
  });

  it('delivers the events of one publish in the order the aggregate recorded them', async () => {
    const bus = new InMemoryEventBus<OrderEvent>();
    const log: string[] = [];
    bus.subscribe('order.placed', () => {
      log.push('placed');
    });
    bus.subscribe('order.shipped', () => {
      log.push('shipped');
    });
    await bus.publish([new OrderPlaced(orderId, 'Ana'), new OrderShipped(orderId)]);
    expect(log).toEqual(['placed', 'shipped']);
  });

  it('stops delivering to a handler once it unsubscribes', async () => {
    const bus = new InMemoryEventBus<OrderEvent>();
    const audit = vi.fn();
    const keep = vi.fn();
    const unsubscribe = bus.subscribe('order.placed', audit);
    bus.subscribe('order.placed', keep);
    await bus.publish([new OrderPlaced(orderId, 'Ana')]);
    unsubscribe();
    await bus.publish([new OrderPlaced(orderId, 'Luis')]);
    expect(audit).toHaveBeenCalledTimes(1);
    expect(keep).toHaveBeenCalledTimes(2);
  });

  it('unsubscribing twice is harmless', async () => {
    const bus = new InMemoryEventBus<OrderEvent>();
    const audit = vi.fn();
    const unsubscribe = bus.subscribe('order.placed', audit);
    unsubscribe();
    unsubscribe();
    await bus.publish([new OrderPlaced(orderId, 'Ana')]);
    expect(audit).not.toHaveBeenCalled();
  });

  describe('published: what a use case test asserts on', () => {
    it('keeps every published event in order, across publishes', async () => {
      const bus = new InMemoryEventBus<OrderEvent>();
      const placed = new OrderPlaced(orderId, 'Ana');
      const shipped = new OrderShipped(orderId);
      await bus.publish([placed]);
      await bus.publish([shipped]);
      expect(bus.published).toEqual([placed, shipped]);
      expect(bus.published.map((event) => event.eventName())).toEqual([
        'order.placed',
        'order.shipped',
      ]);
    });

    it('is a copy: changing it does not change what was published', async () => {
      const bus = new InMemoryEventBus<OrderEvent>();
      await bus.publish([new OrderPlaced(orderId, 'Ana')]);
      (bus.published as OrderEvent[]).length = 0;
      expect(bus.published).toHaveLength(1);
      expect(bus.published).not.toBe(bus.published);
    });

    it('starts empty', () => {
      expect(new InMemoryEventBus().published).toEqual([]);
    });
  });

  it('rejects the publish when a handler fails, without calling the next handlers', async () => {
    const bus = new InMemoryEventBus<OrderEvent>();
    const next = vi.fn();
    bus.subscribe('order.placed', async () => {
      throw new Error('mail server down');
    });
    bus.subscribe('order.placed', next);
    await expect(bus.publish([new OrderPlaced(orderId, 'Ana')])).rejects.toThrow(
      'mail server down',
    );
    expect(next).not.toHaveBeenCalled();
  });
});
