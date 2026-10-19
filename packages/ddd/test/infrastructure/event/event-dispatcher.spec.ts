import { describe, expect, it } from 'vitest';
import { EventListener, ListensTo } from '../../../src/application/index';
import { EventBase } from '../../../src/domain/index';
import { ApplicationException } from '../../../src/exceptions/index';
import { DomainEventRegistry } from '../../../src/infrastructure/event/domain-event-registry';
import { EventDispatcher } from '../../../src/infrastructure/event/event-dispatcher';
import { InMemoryInbox } from '../../../src/infrastructure/inbox/in-memory-inbox';
import { InMemoryTransactionRunner } from '../../../src/infrastructure/transaction/in-memory-transaction-runner';
import type { EventMetadata } from '../../../src/domain/index';

class OrderPlaced extends EventBase {
  static readonly eventName = 'order.placed';

  constructor(
    orderId: string,
    readonly customer: string,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

class OrderCancelled extends EventBase {
  static readonly eventName = 'order.cancelled';
}

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const log: string[] = [];

@ListensTo(OrderPlaced)
class ReserveStockOnOrderPlaced extends EventListener<OrderPlaced> {
  async handle(event: OrderPlaced): Promise<void> {
    await delay(5);
    log.push(`reserve stock for ${event.aggregateId}`);
  }
}

@ListensTo(OrderPlaced)
class NotifyCustomerOnOrderPlaced extends EventListener<OrderPlaced> {
  handle(event: OrderPlaced): void {
    log.push(`notify ${event.customer}`);
  }
}

@ListensTo(OrderCancelled)
class ReleaseStockOnOrderCancelled extends EventListener<OrderCancelled> {
  handle(event: OrderCancelled): void {
    log.push(`release stock for ${event.aggregateId}`);
  }
}

class AuditEverything extends EventListener {
  handle(): void {
    log.push('audit');
  }
}

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

function dispatcher() {
  log.length = 0;
  return new EventDispatcher([
    new ReserveStockOnOrderPlaced(),
    new NotifyCustomerOnOrderPlaced(),
    new ReleaseStockOnOrderCancelled(),
  ]);
}

describe('EventDispatcher: hands each event to the listeners subscribed to it', () => {
  it('runs every listener of the event, waiting for each one, in the order they were added', async () => {
    await dispatcher().dispatch(new OrderPlaced(orderId, 'Ana'));
    expect(log).toEqual([`reserve stock for ${orderId}`, 'notify Ana']);
  });

  it('does not run the listeners of other events', async () => {
    await dispatcher().dispatch(new OrderCancelled(orderId));
    expect(log).toEqual([`release stock for ${orderId}`]);
  });

  it('dispatching an event nobody listens to does nothing', async () => {
    log.length = 0;
    await new EventDispatcher().dispatch(new OrderCancelled(orderId));
    expect(log).toEqual([]);
  });

  it('adds listeners one after another in a single expression', () => {
    const empty = new EventDispatcher();
    const listener = new NotifyCustomerOnOrderPlaced();
    expect(empty.add(listener)).toBe(empty);
    expect(empty.listenersOf('order.placed')).toEqual([listener]);
    expect(empty.listenersOf('order.cancelled')).toEqual([]);
  });

  it('refuses a listener without @ListensTo at start-up, a wiring mistake', () => {
    const add = () => new EventDispatcher().add(new AuditEverything());
    expect(add).toThrow(ApplicationException);
    expect(add).toThrow('AuditEverything needs @ListensTo(<event class>)');
  });

  it('a queue consumer rebuilds the message with the registry and dispatches it', async () => {
    const registry = new DomainEventRegistry().register(
      OrderPlaced,
      (json) => new OrderPlaced(json.aggregateId, json.customer as string, json),
    );
    const message = JSON.stringify(new OrderPlaced(orderId, 'Luis'));
    await dispatcher().dispatch(registry.fromJSON(message));
    expect(log).toEqual([`reserve stock for ${orderId}`, 'notify Luis']);
  });

  describe('dispatchSerialized: what an outbox relay or a queue consumer calls', () => {
    const placedOnly = () =>
      new DomainEventRegistry<OrderPlaced>().register(
        OrderPlaced,
        (json) => new OrderPlaced(json.aggregateId, json.customer as string, json),
      );

    it('rebuilds the stored event with the registry and runs its listeners', async () => {
      const listeners = dispatcher();
      await listeners.dispatchSerialized(new OrderPlaced(orderId, 'Luis').toJSON(), placedOnly());
      expect(log).toEqual([`reserve stock for ${orderId}`, 'notify Luis']);
    });

    it('skips an event nobody listens to without rebuilding it, so it never blocks the outbox', async () => {
      const listeners = new EventDispatcher([new ReserveStockOnOrderPlaced()]);
      log.length = 0;
      const shippedRow = { ...new OrderCancelled(orderId).toJSON(), eventName: 'order.shipped' };
      await expect(listeners.dispatchSerialized(shippedRow, placedOnly())).resolves.toBeUndefined();
      expect(log).toEqual([]);
    });

    it('still refuses an event that has listeners but no factory, a wiring mistake', async () => {
      const cancelled = new OrderCancelled(orderId).toJSON();
      await expect(dispatcher().dispatchSerialized(cancelled, placedOnly())).rejects.toThrow(
        'order.cancelled',
      );
    });
  });

  describe('idempotent delivery with an inbox, because the relay delivers at least once', () => {
    function idempotentDispatcher() {
      log.length = 0;
      const inbox = new InMemoryInbox();
      const transactions = new InMemoryTransactionRunner([inbox]);
      return {
        inbox,
        transactions,
        dispatcher: new EventDispatcher(
          [new ReserveStockOnOrderPlaced(), new NotifyCustomerOnOrderPlaced()],
          { inbox, transactions },
        ),
      };
    }

    it('runs each listener once for an event delivered twice', async () => {
      const { dispatcher: listeners } = idempotentDispatcher();
      const event = new OrderPlaced(orderId, 'Ana');
      await listeners.dispatch(event);
      await listeners.dispatch(event);
      expect(log).toEqual([`reserve stock for ${orderId}`, 'notify Ana']);
    });

    it('recognizes the redelivered event by its id, even rebuilt from the outbox JSON', async () => {
      const { dispatcher: listeners } = idempotentDispatcher();
      const event = new OrderPlaced(orderId, 'Ana');
      const registry = new DomainEventRegistry<OrderPlaced>().register(
        OrderPlaced,
        (json) => new OrderPlaced(json.aggregateId, json.customer as string, json),
      );
      await listeners.dispatch(event);
      await listeners.dispatch(registry.fromJSON(JSON.stringify(event)));
      expect(log).toHaveLength(2);
    });

    it('runs each listener in its own transaction, which joins the one of the use case it calls', async () => {
      const { dispatcher: listeners, transactions } = idempotentDispatcher();
      await listeners.dispatch(new OrderPlaced(orderId, 'Ana'));
      expect(transactions.committed).toBe(2);
    });

    it('when a listener fails, keeps the event pending for it and done for the ones before', async () => {
      log.length = 0;
      let mailServerDown = true;

      @ListensTo(OrderPlaced)
      class EmailCustomerOnOrderPlaced extends EventListener<OrderPlaced> {
        handle(event: OrderPlaced): void {
          if (mailServerDown) {
            throw new Error('mail server down');
          }
          log.push(`email ${event.customer}`);
        }
      }

      const inbox = new InMemoryInbox();
      const transactions = new InMemoryTransactionRunner([inbox]);
      const listeners = new EventDispatcher(
        [new NotifyCustomerOnOrderPlaced(), new EmailCustomerOnOrderPlaced()],
        { inbox, transactions },
      );
      const event = new OrderPlaced(orderId, 'Ana');

      await expect(listeners.dispatch(event)).rejects.toThrow('mail server down');
      mailServerDown = false;
      await listeners.dispatch(event);
      expect(log).toEqual(['notify Ana', 'email Ana']);
      expect(transactions.rolledBack).toBe(1);
    });
  });
});
