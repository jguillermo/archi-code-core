import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  EventSubscriber,
  Subscription,
} from '../../../src/application/event/event-subscriber';
import { EventListener } from '../../../src/application/event/event-listener';
import { ListensTo } from '../../../src/application/event/listens-to';
import { EventBase } from '../../../src/domain/index';

class OrderPlaced extends EventBase {
  static readonly eventName = 'OrderPlaced';
}

@ListensTo(OrderPlaced)
class ReserveStockOnOrderPlaced extends EventListener<OrderPlaced> {
  handle(): void {
    return undefined;
  }
}

class ListenerBook implements EventSubscriber<OrderPlaced> {
  readonly subscribed: string[] = [];

  async subscribe(listener: EventListener<OrderPlaced>): Promise<Subscription> {
    const name = ListensTo.eventOf(listener);
    this.subscribed.push(name);
    return {
      unsubscribe: async () => void this.subscribed.splice(this.subscribed.indexOf(name), 1),
    };
  }
}

describe('EventSubscriber: the port that connects listeners to a bus', () => {
  it('subscribes a listener and resolves to a subscription that unsubscribes asynchronously', () => {
    expectTypeOf<EventSubscriber<OrderPlaced>['subscribe']>().toEqualTypeOf<
      (listener: EventListener<OrderPlaced>) => Promise<Subscription>
    >();
    expectTypeOf<Subscription>().toEqualTypeOf<{ unsubscribe(): Promise<void> }>();
  });

  it('a bus keeps the listener until it unsubscribes', async () => {
    const book = new ListenerBook();
    const subscription = await book.subscribe(new ReserveStockOnOrderPlaced());
    expect(book.subscribed).toStrictEqual(['OrderPlaced']);
    await subscription.unsubscribe();
    expect(book.subscribed).toStrictEqual([]);
  });
});
