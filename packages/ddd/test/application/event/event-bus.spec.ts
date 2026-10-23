import { describe, expect, expectTypeOf, it } from 'vitest';
import type { EventBus } from '../../../src/application/event/event-bus';
import { EventBase } from '../../../src/domain/index';
import type { SerializedEvent } from '../../../src/domain/index';

class OrderPlaced extends EventBase {
  static readonly eventName = 'OrderPlaced';

  constructor(
    readonly orderId: string,
    readonly customer: string,
  ) {
    super();
  }
}

class OrderCancelled extends EventBase {
  static readonly eventName = 'OrderCancelled';

  constructor(readonly orderId: string) {
    super();
  }
}

class OutboxEventBus implements EventBus<OrderPlaced | OrderCancelled> {
  readonly rows: SerializedEvent[] = [];

  async publish(events: readonly (OrderPlaced | OrderCancelled)[]): Promise<void> {
    this.rows.push(...events.map((event) => ({ ...event })));
  }
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

describe('EventBus: the port that publishes what the domain recorded', () => {
  it('takes a read-only list of the events it is typed with', () => {
    expectTypeOf<EventBus<OrderPlaced>['publish']>().toEqualTypeOf<
      (events: readonly OrderPlaced[]) => Promise<void>
    >();
    expectTypeOf<EventBus['publish']>().parameter(0).toEqualTypeOf<readonly EventBase[]>();
  });

  it('an outbox adapter stores each event serialized, in order', async () => {
    const bus = new OutboxEventBus();
    await bus.publish([new OrderPlaced(orderId, 'Ana'), new OrderCancelled(orderId)]);
    expect(bus.rows).toMatchObject([
      { eventName: 'OrderPlaced', orderId, customer: 'Ana' },
      { eventName: 'OrderCancelled', orderId },
    ]);
  });

  it('publishing nothing is allowed', async () => {
    const bus = new OutboxEventBus();
    await bus.publish([]);
    expect(bus.rows).toEqual([]);
  });

  it('refuses events the bus is not typed for', async () => {
    const bus: EventBus<OrderPlaced> = { publish: async () => undefined };
    // @ts-expect-error a bus of OrderPlaced does not accept a plain string
    await bus.publish(['OrderPlaced']);
    expect(true).toBe(true);
  });
});
