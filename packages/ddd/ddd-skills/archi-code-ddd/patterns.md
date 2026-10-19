# Recommended patterns

Part of the `archi-code-ddd` skill: read it only when that skill routes here.

Optional by default, required with `Required(XType)`:

```ts
class Nickname extends StringType {} // value: string | null; constructor accepts string | null | nothing
class Name extends Required(StringType) {} // value: string; constructor demands string
class FullName extends Name {} // still required
```

Always-valid value objects: `@Validations` rules run in the constructor:

```ts
@Validations([{ validator: 'isEmail' }])
class Email extends Required(StringType) {}

@Validations([
  { validator: 'isInt', properties: { min: 0 } },
  { custom: 'isEven', fn: (v) => Number(v) % 2 === 0, message: 'Must be even' },
])
class Quantity extends NumberType {}

new Email('ana@example.com').value; // 'ana@example.com'
new Email('x');
// ValidationException: Validation failed, Email: Value does not satisfy isEmail

new Quantity(-3);
// ValidationException: Validation failed, Quantity: Value does not satisfy isInt, Quantity: Must be even

const command = ValueObjects.build({
  email: () => new Email(input.email),
  quantity: () => new Quantity(input.quantity),
});
// input { email: 'x', quantity: 3 } → one ValidationException with every field:
// errors: [
//   { field: 'email', code: 'isEmail', message: 'Email: Value does not satisfy isEmail' },
//   { field: 'quantity', code: 'isEven', message: 'Quantity: Must be even' },
// ]
```

Aggregate with typed id, a list of composite value objects and events:

```ts
class OrderId extends IdType {}
class Sku extends Required(StringType) {}
class Units extends Required(NumberType) {}
class CustomerName extends Required(StringType) {}
class Shipped extends Required(BooleanType) {}

class OrderLine extends Composite({ sku: Sku, units: Units }) {}

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

class OrderLineAdded extends EventBase {
  static readonly eventName = 'order.line_added';

  constructor(
    orderId: string,
    readonly sku: string,
    readonly units: number,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

type OrderEvent = OrderPlaced | OrderLineAdded;

class OrderShippedException extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is already shipped`, ['ORD001']);
  }
}

class Order extends AggregateRoot<OrderId, OrderEvent> {
  private constructor(
    id: OrderId,
    readonly customer: CustomerName,
    private _lines: OrderLine[],
    private _shipped: Shipped,
    private _updatedAt: UpdatedAt,
    readonly createdAt: CreatedAt,
  ) {
    super(id);
  }

  static place(id: OrderId, customer: CustomerName, clock: { now(): Date }): Order {
    const order = new Order(
      id,
      customer,
      [],
      new Shipped(false),
      UpdatedAt.now(clock),
      CreatedAt.now(clock),
    );
    order.record(new OrderPlaced(id.value, customer.value, { clock }));
    return order;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Order>): Order {
    return new Order(
      new OrderId(primitives.id),
      new CustomerName(primitives.customer),
      primitives.lines.map((line) => OrderLine.fromPrimitives(line)),
      new Shipped(primitives.shipped),
      new UpdatedAt(primitives.updatedAt),
      new CreatedAt(primitives.createdAt),
    );
  }

  get lines(): OrderLine[] {
    return [...this._lines];
  }

  get shipped(): Shipped {
    return this._shipped;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  addLine(sku: Sku, units: Units, clock: { now(): Date }): void {
    if (this._shipped.value) {
      throw new OrderShippedException(this.id.value);
    }
    this._lines = [...this._lines, new OrderLine({ sku, units })];
    this._updatedAt = UpdatedAt.now(clock);
    this.record(new OrderLineAdded(this.id.value, sku.value, units.value, { clock }));
  }

  toPrimitives(): PrimitiveTypes<Order> {
    return {
      id: this.id.value,
      customer: this.customer.value,
      lines: this._lines.map((line) => line.toPrimitives()),
      shipped: this.shipped.value,
      updatedAt: this.updatedAt.value,
      createdAt: this.createdAt.value,
    };
  }
}
```

Use case: the input becomes a command of value objects, then `handle` loads, changes, saves and
publishes:

```ts
interface AddOrderLineInput {
  orderId: string;
  sku: string;
  units: number;
}

interface AddOrderLineCommand {
  orderId: OrderId;
  sku: Sku;
  units: Units;
}

class AddOrderLine extends UseCase<AddOrderLineInput, AddOrderLineCommand, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly transactions: TransactionRunner,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: AddOrderLineInput): AddOrderLineCommand {
    return ValueObjects.build({
      orderId: () => new OrderId(input.orderId),
      sku: () => new Sku(input.sku),
      units: () => new Units(input.units),
    });
  }

  protected handle(command: AddOrderLineCommand): Promise<void> {
    return this.transactions.run(async () => {
      const order = await this.orders.findById(command.orderId);
      if (order === null) {
        throw new AggregateNotFoundException('Order', command.orderId.value);
      }
      order.addLine(command.sku, command.units, this.clock);
      await this.orders.save(order);
      await this.events.publish(order.pullDomainEvents());
    });
  }
}
```

Listener: named `<Action>On<Event>`, subscribed with `@ListensTo`, runs one use case:

```ts
interface Warehouse {
  prepare(orderId: OrderId, sku: Sku): Promise<void>;
}

class PrepareShipment extends UseCase<
  { orderId: string; sku: string },
  { orderId: OrderId; sku: Sku },
  void
> {
  constructor(private readonly warehouse: Warehouse) {
    super();
  }

  protected toCommand(input: { orderId: string; sku: string }): { orderId: OrderId; sku: Sku } {
    return ValueObjects.build({
      orderId: () => new OrderId(input.orderId),
      sku: () => new Sku(input.sku),
    });
  }

  protected async handle(command: { orderId: OrderId; sku: Sku }): Promise<void> {
    await this.warehouse.prepare(command.orderId, command.sku);
  }
}

@ListensTo(OrderLineAdded)
class PrepareShipmentOnOrderLineAdded extends EventListener<OrderLineAdded> {
  constructor(private readonly prepareShipment: PrepareShipment) {
    super();
  }

  async handle(event: OrderLineAdded): Promise<void> {
    await this.prepareShipment.execute({ orderId: event.aggregateId, sku: event.sku });
  }
}
```

A real repository implements only the roles it supports, checks the version and wraps driver
errors with their cause:

```ts
class MongoOrderRepository implements AggregateFinder<Order>, AggregateSaver<Order> {
  private readonly mapper = AggregateMapper.of(Order);

  async findById(id: OrderId): Promise<Order | null> {
    const document = await this.collection.findOne({ _id: id.value });
    if (document === null) {
      return null;
    }
    const { _id, version, ...primitives } = document;
    return this.mapper.fromPrimitives(primitives, version);
  }

  async save(order: Order): Promise<void> {
    const data = { ...this.mapper.toPrimitives(order), version: order.version + 1 };
    let written: boolean;
    try {
      written =
        order.version === 0
          ? await this.insertUnlessTaken(data)
          : (await this.collection.replaceOne({ _id: data.id, version: order.version }, data))
              .matchedCount === 1;
    } catch (error) {
      throw new InternalErrorException('saving order', { cause: error });
    }
    if (!written) {
      throw new ConcurrencyException(this.mapper.aggregateName, order.id.value, order.version);
    }
    order.markPersisted();
  }
}
```

Wiring and tests with the in-memory adapters (transaction, outbox, relay) and the HTTP mapper:

```ts
const orders = new InMemoryRepository(AggregateMapper.of(Order));
const outbox = new InMemoryOutbox<OrderEvent>();
const transactions = new InMemoryTransactionRunner([orders, outbox]);
const listeners = new EventDispatcher([
  new PrepareShipmentOnOrderLineAdded(new PrepareShipment(warehouse)),
]);
const registry = new DomainEventRegistry<OrderEvent>().register(
  OrderLineAdded,
  (json) => new OrderLineAdded(json.aggregateId, json.sku as string, json.units as number, json),
);
const relay = new OutboxRelay(outbox, (json) => listeners.dispatchSerialized(json, registry));

const clock = new FixedClock('2026-03-01T09:30:00Z');
await orders.save(Order.place(new OrderId(orderId), new CustomerName('Ana'), clock));
await new AddOrderLine(orders, outbox, transactions, clock).execute({
  orderId,
  sku: 'TORCH-01',
  units: 2,
});
await outbox.pending(10); // the OrderLineAdded event, committed with the order
await relay.forward(); // after the commit: PrepareShipment runs; OrderPlaced has no listener and is skipped

const errors = new HttpErrorMapper({ ORD001: 409 }); // a domain rule defaults to 422
const { status, body } = errors.map(caughtError);
```

Tests with Vitest: describe real situations, use a plain fixture factory in the project's
`test/support/` and the native matchers (there is no archi-code test package). Dates held by VOs and
events are immutable `Date` subclasses: compare them with `toEqual` or `.toISOString()`, not
`toStrictEqual` against a plain `Date`.

```ts
import { describe, expect, it } from 'vitest';

const orderId = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

describe('Order', () => {
  it('a customer adds a torch to a new order and the warehouse is told about it', () => {
    const clock = new FixedClock('2026-03-01T09:30:00Z');
    const order = Order.place(new OrderId(orderId), new CustomerName('Ana'), clock);
    order.addLine(new Sku('TORCH-01'), new Units(2), clock);
    expect(order.toPrimitives()).toMatchObject({
      id: orderId,
      lines: [{ sku: 'TORCH-01', units: 2 }],
    });
    expect(order.pullDomainEvents().map((event) => event.toJSON())).toMatchObject([
      { eventName: 'order.placed', aggregateId: orderId, customer: 'Ana' },
      { eventName: 'order.line_added', sku: 'TORCH-01', units: 2 },
    ]);
  });
});
```

Composite value objects and specifications:

```ts
@Validations([{ validator: 'isInt' }])
class Cents extends Required(NumberType) {}
@Validations([{ validator: 'isISO4217' }])
class Currency extends Required(StringType) {
  protected filter(value: unknown): string {
    return super.filter(value).trim().toUpperCase();
  }
}

class CurrencyMismatch extends DomainException {
  constructor(expected: string, received: string) {
    super(`Cannot add ${received} to ${expected}`, ['PAY001']);
  }
}

class Money extends Composite({ amount: Cents, currency: Currency }) {
  add(other: Money): Money {
    if (!this.currency.equals(other.currency)) {
      throw new CurrencyMismatch(this.currency.value, other.currency.value);
    }
    return new Money({
      amount: new Cents(this.amount.value + other.amount.value),
      currency: this.currency,
    });
  }
}

class StartDate extends Required(DateType) {}
class EndDate extends Required(DateType) {}

@Validations([
  {
    custom: 'endsAfterItStarts',
    fn: (range) => (range as Promotion).end.value >= (range as Promotion).start.value,
    message: 'A promotion cannot end before it starts',
  },
])
class Promotion extends Composite({ start: StartDate, end: EndDate }) {}

const price = Money.fromPrimitives({ amount: 1250, currency: ' eur ' });
price.toPrimitives(); // { amount: 1250, currency: 'EUR' }
price.equals(Money.fromPrimitives({ amount: 1250, currency: 'EUR' })); // true

class OrderAbove extends Specification<Order> {
  constructor(private readonly minimumUnits: number) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.lines.reduce((sum, line) => sum + line.units.value, 0) >= this.minimumUnits;
  }
}

const freeShipping = new OrderAbove(10).and(new OrderAbove(100).not());
freeShipping.isSatisfiedBy(order);
```

A state as an enum value object: the primitive is the enum option, so the round trip needs no cast:

```ts
enum Status {
  Pending = 'pending',
  Shipped = 'shipped',
}

class StatusType extends EnumType<Status> {
  protected getEnum(): typeof Status {
    return Status;
  }
}

class OrderStatus extends Required(StatusType) {
  isShipped(): boolean {
    return this.value === Status.Shipped;
  }
}

new OrderStatus(primitives.status); // primitives.status: Status, from PrimitiveTypes<Order>
```

A use case run by a listener registers a fact: it never refuses it, and returns when the aggregate
is missing instead of making the relay retry forever:

```ts
class RegisterReservation extends UseCase<ReservationInput, ReservationCommand, void> {
  // constructor and toCommand as in AddOrderLine

  protected handle(command: ReservationCommand): Promise<void> {
    return this.transactions.run(async () => {
      const order = await this.orders.findById(command.orderId);
      if (order === null) {
        return;
      }
      order.registerStockReservation(command.reservationId, this.clock);
      await this.orders.save(order);
      await this.events.publish(order.pullDomainEvents());
    });
  }
}
```

A read query: an application interface returning DTOs, implemented in infrastructure on the
database, never through aggregates or repositories:

```ts
export interface OrderSummary {
  readonly id: string;
  readonly customer: string;
  readonly lines: number;
}

export interface OrderSummaries {
  ofCustomer(
    customer: CustomerName,
    page: { limit: number; offset: number },
  ): Promise<OrderSummary[]>;
}
```

One repository contract, run against the in-memory reference and the real adapter:

```ts
export function orderRepositoryContract(
  make: () => Promise<AggregateFinder<Order> & AggregateSaver<Order>>,
): void {
  const clock = new FixedClock('2026-03-01T09:30:00Z');
  const placeOrder = () => Order.place(new OrderId(orderId), new CustomerName('Ana'), clock);

  it('loads what it saved', async () => {
    const orders = await make();
    const order = placeOrder();
    await orders.save(order);
    expect((await orders.findById(order.id))?.toPrimitives()).toEqual(order.toPrimitives());
  });

  it('saves the same object twice', async () => {
    const orders = await make();
    const order = placeOrder();
    await orders.save(order);
    await expect(orders.save(order)).resolves.toBeUndefined();
  });

  it('refuses a stale save and a new order with a taken id', async () => {
    const orders = await make();
    await orders.save(placeOrder());
    const first = await orders.findById(new OrderId(orderId));
    const second = await orders.findById(new OrderId(orderId));
    await orders.save(first!);
    await expect(orders.save(second!)).rejects.toThrow(ConcurrencyException);
    await expect(orders.save(placeOrder())).rejects.toThrow(ConcurrencyException);
  });
}

describe('InMemoryRepository', () =>
  orderRepositoryContract(async () => new InMemoryRepository(AggregateMapper.of(Order))));
describe('MongoOrderRepository', () => orderRepositoryContract(async () => mongoOrders()));
```
