# Tests

Part of the `archi-code-ddd` skill: read it only when that skill routes here. The tests generated
code ships with: aggregates, use cases, reactions, domain services and repository contracts.

## Rules

- Tests with Vitest describe real situations, use plain fixture factories in the project's
  `test/support/` and the native matchers.
- Dates held by VOs are immutable `Date` subclasses: compare them with `toEqual` or
  `.toISOString()`.
- Nothing fixes the time: a date stamped with `CreatedAt.now()` / `UpdatedAt.now()` or an
  `occurredOn` set by the bus is only checked to be a valid date, and the dates of a state the
  test loads are built with the constructor (`new CreatedAt('2026-03-01T09:30:00Z')`).
- Every aggregate has a test of its behavior, its events and the round trip
  (`fromPrimitives(toPrimitives())`) covering every field.
- Every user use case runs with the in-memory repository and a recording bus, including its
  refusals.
- A test of the event flow asserts on what the reaction caused and on what the channel carried,
  never on the reaction being called, and delivers the same event twice.
- One contract per repository, run against every adapter that extends it; the IndexedDB adapter
  runs it on a real browser IndexedDB (Vitest browser mode), never on a double of it.

## Code

### Tests

Every aggregate: its behavior, its events and the round trip:

```ts
import { describe, expect, it } from 'vitest';

describe('Payment', () => {
  it('a card payment within the limit is captured at once', () => {
    const order = new OrderReference(orderId);
    const payment = Payment.create(
      PaymentId.forOrder(order),
      order,
      Money.fromPrimitives({ amount: 4_990, currency: Currency.EUR }),
      new PaymentMethodType(PaymentMethod.CARD),
    );
    payment.process();
    expect(payment.pullDomainEvents().map((event) => ({ ...event }))).toMatchObject([
      { eventName: 'payment.created', orderId },
      { eventName: 'payment.captured', amount: { amount: 4_990, currency: 'EUR' } },
    ]);
    expect(Payment.fromPrimitives(payment.toPrimitives()).toPrimitives()).toEqual(
      payment.toPrimitives(),
    );
    expect(Number.isNaN(payment.createdAt.value.getTime())).toBe(false);
  });
});
```

A user use case with the in-memory repository and a recording bus, including the refusals:

```ts
describe('Cancelling an order', () => {
  it('only the customer who placed it may cancel it', async () => {
    const orders = new InMemoryOrderRepository();
    const order = aPendingOrder();
    await orders.save(order);
    const cancelOrder = new CancelOrder(orders, new DomainEventBus(new InMemoryEventChannel(), new EventRegistry()));

    await expect(
      cancelOrder.execute({ actorId: anotherCustomerId, orderId: order.id.value }),
    ).rejects.toBeInstanceOf(OrderOwnedByAnotherCustomer);
  });
});
```

A test of the event flow asserts on what the reaction caused and on what the channel carried,
never on the reaction being called, and delivers the same event twice:

```ts
describe('Requesting the payment of a new order', () => {
  it('creates one payment per order even when the event arrives twice', async () => {
    const channel = new InMemoryEventChannel();
    const context = await PaymentsContext.start({ channel, logger: new SilentLogger() });
    const bus = new DomainEventBus(channel, new EventRegistry());
    const orderCreated = new OrderCreatedDomainEvent({
      orderId,
      total: { amount: 4_990, currency: 'EUR' },
      paymentMethod: 'card',
    });

    await bus.publish([orderCreated]);
    await bus.publish([orderCreated]);

    expect(channel.sent.map((event) => event.eventName)).toEqual([
      'order.created',
      'payment.created',
      'payment.captured',
      'order.created',
    ]);
    await context.stop();
  });
});
```

One contract for the repository of orders, run against every adapter that extends it:

```ts
export function orderRepositoryContract(make: () => Promise<OrderRepository>): void {
  it('loads what it saved', async () => {
    const orders = await make();
    const order = aPendingOrder();
    await orders.save(order);
    expect((await orders.findById(order.id))?.toPrimitives()).toEqual(order.toPrimitives());
  });

  it('saves the same object twice', async () => {
    const orders = await make();
    const order = aPendingOrder();
    await orders.save(order);
    await expect(orders.save(order)).resolves.toBeUndefined();
  });

  it('refuses a stale save and a new order with a taken id', async () => {
    const orders = await make();
    await orders.save(aPendingOrder());
    const first = await orders.findById(new OrderId(orderId));
    const second = await orders.findById(new OrderId(orderId));
    await orders.save(first!);
    await expect(orders.save(second!)).rejects.toThrow(ConcurrencyException);
    await expect(orders.save(aPendingOrder())).rejects.toThrow(ConcurrencyException);
  });

  it('refuses to remove an order someone changed after it was loaded', async () => {
    const orders = await make();
    await orders.save(aPendingOrder());
    const first = await orders.findById(new OrderId(orderId));
    const second = await orders.findById(new OrderId(orderId));
    await orders.save(first!);
    await expect(orders.remove(second!)).rejects.toThrow(ConcurrencyException);
  });

  it('forgets an order once it is removed', async () => {
    const orders = await make();
    await orders.save(aPendingOrder());
    const order = await orders.findById(new OrderId(orderId));
    await orders.remove(order!);
    expect(await orders.findById(new OrderId(orderId))).toBeNull();
  });
}

describe('InMemoryOrderRepository', () =>
  orderRepositoryContract(async () => new InMemoryOrderRepository()));
describe('MongoOrderRepository', () => orderRepositoryContract(async () => mongoOrders()));
describe('IndexedDbOrderRepository', () =>
  orderRepositoryContract(async () => new IndexedDbOrderRepository()));
```

The IndexedDB adapter runs the same contract on a real browser IndexedDB (Vitest browser mode),
never on a double of it, emptying its table before each test
(`await IndexedDbTable.of('orders').clear()`).

## What not to do

- No round-trip test for an aggregate, or one that does not cover every field.
- Fixing the time, or asserting an exact stamped date: check that it is a valid date and build
  loaded dates with the constructor.
- Testing that a reaction was called instead of what it caused, or never delivering the same
  event twice.
- A repository spec per adapter instead of one contract every adapter runs; an IndexedDB adapter
  tested on a double instead of a real browser IndexedDB.
- Abstract fixtures (`foo`, `test1`) instead of real situations of the domain.
