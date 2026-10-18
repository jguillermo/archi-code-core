import { describe, expect, expectTypeOf, it } from 'vitest';
import { EventListener, ListensTo } from '../../../src/application/index';
import type { EventBus } from '../../../src/application/index';
import { EventBase } from '../../../src/domain/index';
import { EventDispatcher } from '../../../src/infrastructure/event/event-dispatcher';
import { InMemoryEventBus } from '../../../src/infrastructure/event/in-memory-event-bus';

class OrderPlaced extends EventBase {
  static readonly eventName = 'order.placed';

  constructor(
    orderId: string,
    readonly customer: string,
  ) {
    super(orderId);
  }
}

class OrderShipped extends EventBase {
  static readonly eventName = 'order.shipped';
}

type OrderEvent = OrderPlaced | OrderShipped;

@ListensTo(OrderPlaced)
class SendConfirmationOnOrderPlaced extends EventListener<OrderPlaced> {
  readonly sentTo: string[] = [];

  handle(event: OrderPlaced): void {
    this.sentTo.push(event.customer);
  }
}

@ListensTo(OrderShipped)
class NotifyWarehouseOnOrderShipped extends EventListener<OrderShipped> {
  readonly notified: string[] = [];

  async handle(event: OrderShipped): Promise<void> {
    this.notified.push(event.aggregateId);
  }
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

describe('InMemoryEventBus: publishing domain events inside one process', () => {
  it('can be injected wherever the application asks for an EventBus', () => {
    expectTypeOf(new InMemoryEventBus<OrderEvent>()).toMatchTypeOf<EventBus<OrderEvent>>();
  });

  it('hands each published event to the listeners its dispatcher holds', async () => {
    const confirmation = new SendConfirmationOnOrderPlaced();
    const warehouse = new NotifyWarehouseOnOrderShipped();
    const bus = new InMemoryEventBus<OrderEvent>(new EventDispatcher([confirmation, warehouse]));
    await bus.publish([new OrderPlaced(orderId, 'Ana'), new OrderShipped(orderId)]);
    expect(confirmation.sentTo).toEqual(['Ana']);
    expect(warehouse.notified).toEqual([orderId]);
  });

  it('without a dispatcher it only records what was published', async () => {
    const bus = new InMemoryEventBus<OrderEvent>();
    await expect(bus.publish([new OrderShipped(orderId)])).resolves.toBeUndefined();
    expect(bus.published).toHaveLength(1);
  });

  it('rejects the publish when a listener fails, keeping the events published so far', async () => {
    @ListensTo(OrderPlaced)
    class ChargeCardOnOrderPlaced extends EventListener<OrderPlaced> {
      handle(): void {
        throw new Error('payment gateway down');
      }
    }
    const warehouse = new NotifyWarehouseOnOrderShipped();
    const bus = new InMemoryEventBus<OrderEvent>(
      new EventDispatcher([new ChargeCardOnOrderPlaced(), warehouse]),
    );
    await expect(
      bus.publish([new OrderPlaced(orderId, 'Ana'), new OrderShipped(orderId)]),
    ).rejects.toThrow('payment gateway down');
    expect(bus.published).toHaveLength(1);
    expect(warehouse.notified).toEqual([]);
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
});
