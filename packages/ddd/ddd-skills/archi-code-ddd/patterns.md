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
class PackSize extends NumberType {}

new Email('ana@example.com').value; // 'ana@example.com'
new Email('x');
// ValidationException: Validation failed, Email: Value does not satisfy isEmail

new PackSize(-3);
// ValidationException: Validation failed, PackSize: Value does not satisfy isInt, PackSize: Must be even

const command = ValueObjects.build({
  email: () => new Email(input.email),
  packSize: () => new PackSize(input.packSize),
});
// input { email: 'x', packSize: 3 } → one ValidationException with every field:
// errors: [
//   { field: 'email', code: 'isEmail', message: 'Email: Value does not satisfy isEmail' },
//   { field: 'packSize', code: 'isEven', message: 'PackSize: Must be even' },
// ]
```

Aggregate with typed id, a list of composite value objects and events:

```ts
class OrderId extends IdType<'OrderId'> {}
class Sku extends Required(StringType) {}
class Quantity extends Required(NumberType) {}
class CustomerName extends Required(StringType) {}
class Shipped extends Required(BooleanType) {}

class OrderLine extends Composite({ sku: Sku, quantity: Quantity }) {}

class OrderPlaced extends EventBase {
  static readonly eventName = 'OrderPlaced';

  constructor(
    orderId: string,
    readonly customer: string,
    metadata?: EventMetadata,
  ) {
    super(orderId, metadata);
  }
}

class OrderLineAdded extends EventBase {
  static readonly eventName = 'OrderLineAdded';

  constructor(
    orderId: string,
    readonly sku: string,
    readonly quantity: number,
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

  addLine(sku: Sku, quantity: Quantity, clock: { now(): Date }): void {
    if (this._shipped.value) {
      throw new OrderShippedException(this.id.value);
    }
    this._lines = [...this._lines, new OrderLine({ sku, quantity })];
    this._updatedAt = UpdatedAt.now(clock);
    this.record(new OrderLineAdded(this.id.value, sku.value, quantity.value, { clock }));
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
  quantity: number;
}

interface AddOrderLineCommand {
  orderId: OrderId;
  sku: Sku;
  quantity: Quantity;
}

class AddOrderLine extends UseCase<AddOrderLineInput, AddOrderLineCommand, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: AddOrderLineInput): AddOrderLineCommand {
    return ValueObjects.build({
      orderId: () => new OrderId(input.orderId),
      sku: () => new Sku(input.sku),
      quantity: () => new Quantity(input.quantity),
    });
  }

  protected async handle(command: AddOrderLineCommand): Promise<void> {
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      throw new AggregateNotFoundException('Order', command.orderId.value);
    }
    order.addLine(command.sku, command.quantity, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
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

@ListensTo(OrderLineAdded, { consumer: 'prepare-shipment-on-order-line-added' })
class PrepareShipmentOnOrderLineAdded extends EventListener<OrderLineAdded> {
  constructor(private readonly prepareShipment: PrepareShipment) {
    super();
  }

  async handle(event: OrderLineAdded): Promise<void> {
    await this.prepareShipment.execute({ orderId: event.aggregateId, sku: event.sku });
  }
}
```

A real repository implements only the roles it supports, checks the version (also on `remove`,
which receives the loaded aggregate) and wraps driver errors with their cause:

```ts
class MongoOrderRepository
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateRemover<Order>
{
  constructor(private readonly collection: Collection<OrderDocument>) {}

  async findById(id: OrderId): Promise<Order | null> {
    const document = await this.collection.findOne({ _id: id.value });
    if (document === null) {
      return null;
    }
    const { _id, version, ...primitives } = document;
    return Order.fromPrimitives(primitives).restoreVersion(version);
  }

  async save(order: Order): Promise<void> {
    const data = { ...order.toPrimitives(), version: order.version + 1 };
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
      throw new ConcurrencyException('Order', order.id.value, order.version);
    }
    order.markPersisted();
  }

  async remove(order: Order): Promise<void> {
    const { deletedCount } = await this.collection.deleteOne({
      _id: order.id.value,
      version: order.version,
    });
    if (deletedCount === 0 && order.version > 0) {
      throw new ConcurrencyException('Order', order.id.value, order.version);
    }
  }
}
```

A repository per aggregate and technology: the constructor receives only its technology, the
aggregate converts itself and the repository calls it directly. The in-memory one
lives in the project's `test/support/`:

```ts
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
  PrimitiveTypes,
} from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/exceptions';

export class InMemoryOrderRepository
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateRemover<Order>
{
  private readonly rows = new Map<string, { version: number; primitives: PrimitiveTypes<Order> }>();

  async findById(id: OrderId): Promise<Order | null> {
    const row = this.rows.get(id.value);
    return row === undefined
      ? null
      : Order.fromPrimitives(structuredClone(row.primitives)).restoreVersion(row.version);
  }

  async save(order: Order): Promise<void> {
    const key = this.currentKey(order);
    const primitives = structuredClone(order.toPrimitives());
    this.rows.set(key, { version: order.version + 1, primitives });
    order.markPersisted();
  }

  async remove(order: Order): Promise<void> {
    this.rows.delete(this.currentKey(order));
  }

  private currentKey(order: Order): string {
    const key = order.id.value;
    if ((this.rows.get(key)?.version ?? 0) !== order.version) {
      throw new ConcurrencyException('Order', key, order.version);
    }
    return key;
  }
}
```

Wiring and tests with the in-memory adapters (repository, event channel), and the kind of an error:

```ts
const orders = new InMemoryOrderRepository();
const registry = new EventRegistry<OrderEvent>().register(
  OrderLineAdded,
  (json) => new OrderLineAdded(json.aggregateId, json.sku as string, json.quantity as number, json),
);
const channel = new InMemoryEventChannel(); // swap for your RabbitMQ or database channel
const bus = new DomainEventBus<OrderEvent>(channel, registry);
await bus.subscribe(new PrepareShipmentOnOrderLineAdded(new PrepareShipment(warehouse)));

const clock = new FixedClock('2026-03-01T09:30:00Z');
await orders.save(Order.place(new OrderId(orderId), new CustomerName('Ana'), clock));
await new AddOrderLine(orders, bus, clock).execute({
  orderId,
  sku: 'TORCH-01',
  quantity: 2,
});
channel.sent.map((event) => event.eventName); // ['OrderLineAdded']: PrepareShipment already ran

ExceptionClassifier.classify(new OrderShippedException(orderId)); // ExceptionKind.Invalid ('invalid')
```

A test of the event flow asserts on what the listener caused and on what the channel carried,
never on the listener being called:

```ts
import { describe, expect, it } from 'vitest';

describe('Adding a line to an order', () => {
  it('prepares the shipment of the new line', async () => {
    const prepared: string[] = [];
    const warehouse: Warehouse = {
      prepare: async (orderId, sku) => void prepared.push(`${orderId.value}:${sku.value}`),
    };
    const orders = new InMemoryOrderRepository();
    const channel = new InMemoryEventChannel();
    const bus = new DomainEventBus<OrderEvent>(channel, registry);
    await bus.subscribe(new PrepareShipmentOnOrderLineAdded(new PrepareShipment(warehouse)));
    const clock = new FixedClock('2026-03-01T09:30:00Z');
    await orders.save(Order.place(new OrderId(orderId), new CustomerName('Ana'), clock));

    await new AddOrderLine(orders, bus, clock).execute({
      orderId,
      sku: 'TORCH-01',
      quantity: 2,
    });

    expect(prepared).toEqual([`${orderId}:TORCH-01`]);
    expect(channel.sent).toMatchObject([
      { eventName: 'OrderLineAdded', aggregateId: orderId, sku: 'TORCH-01', quantity: 2 },
    ]);
  });
});
```

Another messaging technology is one `EventChannel` class in `infrastructure/messaging/`; the
use cases, the listeners and `DomainEventBus` stay the same, and the composition root changes one
line (`new DomainEventBus(new RabbitMqEventChannel(amqpChannel), registry)`). A RabbitMQ channel
over the methods of an amqplib channel it uses, declared structurally: one durable topic exchange,
the event name as routing key, one durable queue per consumer (the `consumer` of `@ListensTo`) and event,
`ack` when the listener finished and `nack` without requeue when it failed (a dead-letter
exchange on the queue keeps those messages):

```ts
import type { ChannelHandler, ChannelSubscription, EventChannel } from '@archi-code/ddd/infrastructure';
import type { SerializedEvent } from '@archi-code/ddd/domain';

interface AmqpMessage {
  content: Buffer;
}

interface AmqpChannel {
  assertExchange(exchange: string, type: 'topic', options: { durable: boolean }): Promise<unknown>;
  publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: { persistent: boolean; messageId: string; contentType: string },
  ): boolean;
  assertQueue(queue: string, options: { durable: boolean }): Promise<unknown>;
  bindQueue(queue: string, exchange: string, pattern: string): Promise<unknown>;
  consume(
    queue: string,
    onMessage: (message: AmqpMessage | null) => void,
  ): Promise<{ consumerTag: string }>;
  ack(message: AmqpMessage): void;
  nack(message: AmqpMessage, allUpTo: boolean, requeue: boolean): void;
  cancel(consumerTag: string): Promise<unknown>;
}

class RabbitMqEventChannel implements EventChannel {
  constructor(
    private readonly amqp: AmqpChannel,
    private readonly exchange = 'sales.events',
  ) {}

  async send(events: readonly SerializedEvent[]): Promise<void> {
    await this.amqp.assertExchange(this.exchange, 'topic', { durable: true });
    for (const event of events) {
      this.amqp.publish(this.exchange, event.eventName, Buffer.from(JSON.stringify(event)), {
        persistent: true,
        messageId: event.eventId,
        contentType: 'application/json',
      });
    }
  }

  async receive(
    eventName: string,
    consumer: string,
    handler: ChannelHandler,
  ): Promise<ChannelSubscription> {
    const queue = `${consumer}.${eventName}`;
    await this.amqp.assertExchange(this.exchange, 'topic', { durable: true });
    await this.amqp.assertQueue(queue, { durable: true });
    await this.amqp.bindQueue(queue, this.exchange, eventName);
    const { consumerTag } = await this.amqp.consume(queue, (message) => {
      if (message === null) {
        return;
      }
      handler(JSON.parse(message.content.toString()))
        .then(() => this.amqp.ack(message))
        .catch(() => this.amqp.nack(message, false, false));
    });
    let open = true;
    return {
      close: async () => {
        if (open) {
          open = false;
          await this.amqp.cancel(consumerTag);
        }
      },
    };
  }
}
```

With a broker, `publish` resolves when RabbitMQ took the messages, not when the listener ran: an
integration test waits for the effect (polling until `prepared` has the line) instead of reading it
right after `execute`.

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
    order.addLine(new Sku('TORCH-01'), new Quantity(2), clock);
    expect(order.toPrimitives()).toMatchObject({
      id: orderId,
      lines: [{ sku: 'TORCH-01', quantity: 2 }],
    });
    expect(order.pullDomainEvents().map((event) => event.toJSON())).toMatchObject([
      { eventName: 'OrderPlaced', aggregateId: orderId, customer: 'Ana' },
      { eventName: 'OrderLineAdded', sku: 'TORCH-01', quantity: 2 },
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
  constructor(private readonly minimumQuantity: number) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.lines.reduce((sum, line) => sum + line.quantity.value, 0) >= this.minimumQuantity;
  }
}

const freeShipping = new OrderAbove(10).and(new OrderAbove(100).not());
freeShipping.isSatisfiedBy(order);

const paidByCard: SatisfiedBy<Order> = { isSatisfiedBy: (candidate) => candidate.paidByCard() };
new OrderAbove(10).and(paidByCard); // any object with isSatisfiedBy combines too
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
is missing instead of making the channel redeliver forever:

```ts
class RegisterReservation extends UseCase<ReservationInput, ReservationCommand, void> {
  // constructor and toCommand as in AddOrderLine

  protected async handle(command: ReservationCommand): Promise<void> {
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      return;
    }
    order.registerStockReservation(command.reservationId, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
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
  make: () => Promise<AggregateFinder<Order> & AggregateSaver<Order> & AggregateRemover<Order>>,
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

  it('refuses to remove an order someone changed after it was loaded', async () => {
    const orders = await make();
    await orders.save(placeOrder());
    const first = await orders.findById(new OrderId(orderId));
    const second = await orders.findById(new OrderId(orderId));
    await orders.save(first!);
    await expect(orders.remove(second!)).rejects.toThrow(ConcurrencyException);
  });
}

describe('InMemoryOrderRepository', () =>
  orderRepositoryContract(async () => new InMemoryOrderRepository()));
describe('MongoOrderRepository', () => orderRepositoryContract(async () => mongoOrders()));
```
