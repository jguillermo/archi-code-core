# Recommended patterns

Part of the `archi-code-ddd` skill: read it only when that skill routes here. Each block is a
file of a context (see `where-each-class-goes.md`); replace the names and keep the shape.

## Value objects

```ts
export class Nickname extends StringType {}
export class OrderId extends IdType<'OrderId'> {}

@Validations([
  { validator: 'isInt', properties: { min: 1, max: 99 }, message: 'From 1 to 99 units' },
])
export class Quantity extends Required(NumberType) {}

@Validations([
  { validator: 'isLength', properties: { min: 3, max: 80 }, message: 'From 3 to 80 characters' },
])
export class ProductTitle extends Required(StringType) {
  protected filter(value: unknown): string {
    return StringSanitizer.singleLine(super.filter(value));
  }
}

export class PaymentId extends IdType<'PaymentId'> {
  static forOrder(order: OrderReference): PaymentId {
    return new PaymentId(UuidType.fromValue(`payment-of-order:${order.value}`));
  }
}

export class PaymentStatusOption extends EnumType<PaymentStatus> {
  protected getEnum(): typeof PaymentStatus {
    return PaymentStatus;
  }
}
export class PaymentStatusType extends Required(PaymentStatusOption) {}
```

A composite with behavior:

```ts
export class Money extends Composite({ amount: Cents, currency: MoneyCurrency }) {
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

Money.fromPrimitives({ amount: 1250, currency: 'EUR' }).toPrimitives();
```

A composite with a list field and a rule over the whole value:

```ts
@Validations([
  {
    custom: 'atLeastOneItem',
    fn: (contents) => (contents as ShipmentContents).items.length > 0,
    message: 'A shipment carries at least one item',
  },
])
export class ShipmentContents extends Composite({ items: [ShipmentItem] }) {}
```

## Events and business errors

```ts
export class PaymentCapturedDomainEvent extends EventBase {
  static readonly eventName = 'payment.captured';

  readonly paymentId: string;
  readonly amount: { amount: number; currency: string };

  constructor({
    paymentId,
    amount,
    eventId,
    occurredOn,
  }: { paymentId: string; amount: { amount: number; currency: string } } & EventMetadata) {
    super({ eventId, occurredOn });
    this.paymentId = paymentId;
    this.amount = amount;
  }
}

export class PaymentNotAwaitingTransfer extends DomainException {
  constructor(paymentId: string, status: string) {
    super(`Payment ${paymentId} is ${status} and is not waiting for a transfer`, ['PAY001']);
  }
}
```

## Aggregate

```ts
export class Payment extends AggregateRoot<PaymentId> {
  readonly amount: Money;
  private _status: PaymentStatusType;
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(
    id: PaymentId,
    amount: Money,
    status: PaymentStatusType,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
  ) {
    super(id);
    this.amount = amount;
    this._status = status;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(id: PaymentId, amount: Money): Payment {
    const payment = new Payment(
      id,
      amount,
      new PaymentStatusType(PaymentStatus.PENDING),
      CreatedAt.now(),
      UpdatedAt.now(),
    );
    payment.record(
      new PaymentCreatedDomainEvent({ paymentId: id.value, amount: amount.toPrimitives() }),
    );
    return payment;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Payment>): Payment {
    return new Payment(
      new PaymentId(primitives.id),
      Money.fromPrimitives(primitives.amount),
      new PaymentStatusType(primitives.status),
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
    );
  }

  get status(): PaymentStatusType {
    return this._status;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  confirmTransfer(received: Money): void {
    if (this._status.value !== PaymentStatus.AWAITING_TRANSFER) {
      throw new PaymentNotAwaitingTransfer(this.id.value, this._status.value);
    }
    this.capture();
  }

  voidForCancelledOrder(): void {
    if (this._status.value !== PaymentStatus.PENDING) {
      return;
    }
    this.moveTo(PaymentStatus.VOIDED);
  }

  toPrimitives(): PrimitiveTypes<Payment> {
    return {
      id: this.id.value,
      amount: this.amount.toPrimitives(),
      status: this._status.value,
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }

  private capture(): void {
    this.moveTo(PaymentStatus.CAPTURED);
    this.record(
      new PaymentCapturedDomainEvent({
        paymentId: this.id.value,
        amount: this.amount.toPrimitives(),
      }),
    );
  }

  private moveTo(status: PaymentStatus): void {
    this._status = new PaymentStatusType(status);
    this._updatedAt = UpdatedAt.now();
  }
}
```

A child entity, changed only through its root:

```ts
export class OrderLine extends Entity<LineNumber> {
  readonly sku: Sku;
  private _quantity: Quantity;
  readonly unitPrice: Money;

  constructor(id: LineNumber, sku: Sku, quantity: Quantity, unitPrice: Money) {
    super(id);
    this.sku = sku;
    this._quantity = quantity;
    this.unitPrice = unitPrice;
  }

  get quantity(): Quantity {
    return this._quantity;
  }

  changeQuantity(quantity: Quantity): void {
    this._quantity = quantity;
  }
}
```

A specification, and a domain service with its domain port (`PlaceOrder` receives `CouponCatalog`
and does `new OrderPricing(this.coupons)` in `handle`):

```ts
export class SubtotalAtLeast extends Specification<Order> {
  constructor(private readonly cents: number) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.subtotal().isAtLeast(this.cents);
  }
}

export interface CouponCatalog {
  discountOf(code: CouponCode): Promise<DiscountPercent | null>;
}

export class OrderPricing {
  private static readonly MAX_DISCOUNT = 50;

  constructor(private readonly catalog: CouponCatalog) {}

  async discountFor(codes: CouponCodes): Promise<DiscountPercent> {
    let percent = 0;
    for (const code of codes.items) {
      const discount = await this.catalog.discountOf(code);
      if (discount === null) {
        throw new UnknownCoupon(code.value);
      }
      percent += discount.value;
    }
    return new DiscountPercent(Math.min(percent, OrderPricing.MAX_DISCOUNT));
  }
}
```

## User use case

```ts
export interface ConfirmTransferReceivedInput {
  actorRole: string;
  paymentId: string;
  received: MoneyData;
}

export interface ConfirmTransferReceivedCommand {
  actorRole: StaffRoleType;
  paymentId: PaymentId;
  received: Money;
}

export class ConfirmTransferReceived extends UseCase<
  ConfirmTransferReceivedInput,
  ConfirmTransferReceivedCommand,
  void
> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: ConfirmTransferReceivedInput): ConfirmTransferReceivedCommand {
    return ValueObjectBuilder.build({
      actorRole: () => new StaffRoleType(input.actorRole as StaffRole),
      paymentId: () => new PaymentId(input.paymentId),
      received: () => Money.fromPrimitives(input.received as { amount: number; currency: Currency }),
    });
  }

  protected async handle(command: ConfirmTransferReceivedCommand): Promise<void> {
    if (command.actorRole.value !== StaffRole.TREASURY) {
      throw new NotAllowedException(`The role ${command.actorRole.value} may not confirm transfers`);
    }
    const payment = await this.payments.findById(command.paymentId);
    if (payment === null) {
      throw new AggregateNotFoundException('Payment', command.paymentId.value);
    }
    payment.confirmTransfer(command.received);
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
```

Creating with a domain service built inside `handle` (`PlaceOrder` receives `CouponCatalog`):

```ts
  protected async handle(command: PlaceOrderCommand): Promise<string> {
    const discount = await new OrderPricing(this.coupons).discountFor(command.couponCodes);
    const order = Order.create(OrderId.generate(), command.customerId, command.lines, discount);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
    return order.id.value;
  }
```

Removing: `order.assertDiscardable(); await this.orders.remove(order);`.

## Logic two use cases share: a domain service, never another use case

```ts
export class CourseFinder {
  constructor(private readonly courses: CourseRepository) {}

  async find(id: CourseId): Promise<Course> {
    const course = await this.courses.findById(id);
    if (course === null) {
      throw new CourseNotFound(id.value);
    }
    return course;
  }

  async assertDoesNotExist(id: CourseId): Promise<void> {
    if ((await this.courses.findById(id)) !== null) {
      throw new CourseAlreadyExists(id.value);
    }
  }
}

export class PublishCourse extends UseCase<PublishCourseInput, PublishCourseCommand, void> {
  constructor(
    private readonly courses: CourseRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: PublishCourseInput): PublishCourseCommand {
    return ValueObjectBuilder.build({
      actorRole: () => new ActorRoleType(input.actorRole as ActorRole),
      courseId: () => new CourseId(input.courseId),
    });
  }

  protected async handle(command: PublishCourseCommand): Promise<void> {
    if (command.actorRole.value !== ActorRole.EDITOR) {
      throw new NotAllowedException(`The role ${command.actorRole.value} may not publish courses`);
    }
    const course = await new CourseFinder(this.courses).find(command.courseId);
    course.publish();
    await this.courses.save(course);
    await this.events.publish(course.pullDomainEvents());
  }
}

export class CreateCourse extends UseCase<CreateCourseInput, CreateCourseCommand, string> {
  constructor(
    private readonly courses: CourseRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: CreateCourseInput): CreateCourseCommand {
    return ValueObjectBuilder.build({
      courseId: () => new CourseId(input.courseId),
      title: () => new CourseTitle(input.title),
    });
  }

  protected async handle(command: CreateCourseCommand): Promise<string> {
    await new CourseFinder(this.courses).assertDoesNotExist(command.courseId);
    const course = Course.create(command.courseId, command.title);
    await this.courses.save(course);
    await this.events.publish(course.pullDomainEvents());
    return course.id.value;
  }
}
```

Its spec stubs the abstract repository with `vi.fn()`:

```ts
function coursesFinding(course: Course | null): CourseRepository {
  return { findById: vi.fn().mockResolvedValue(course) } as unknown as CourseRepository;
}

it('a course that is not in the catalog cannot be found', async () => {
  await expect(new CourseFinder(coursesFinding(null)).find(courseId)).rejects.toBeInstanceOf(
    CourseNotFound,
  );
});
```

## Reaction use case

```ts
@ListensTo(OrderCreatedDomainEvent, { consumer: 'payments.request-payment-on-order-created' })
export class RequestPaymentOnOrderCreated extends EventListener<OrderCreatedDomainEvent> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  async handle(event: OrderCreatedDomainEvent): Promise<void> {
    const { orderReference, amount } = ValueObjectBuilder.build({
      orderReference: () => new OrderReference(event.orderId),
      amount: () => Money.fromPrimitives(event.total as { amount: number; currency: Currency }),
    });
    const paymentId = PaymentId.forOrder(orderReference);
    if ((await this.payments.findById(paymentId)) !== null) {
      return;
    }
    const payment = Payment.create(paymentId, amount);
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
```

## Read model

```ts
export interface OrderSummaries {
  byId(orderId: string): Promise<OrderSummary | null>;
  ofCustomer(customerId: string): Promise<OrderSummary[]>;
}

export class OrderSummaryProjection {
  constructor(private readonly store: OrderSummaryStore) {}

  async apply({ eventId, orderId, occurredOn, changes }: OrderSummaryChange): Promise<void> {
    if (await this.store.hasApplied(eventId.value)) {
      return;
    }
    const lastEventAt = occurredOn.toString();
    const current = (await this.store.find(orderId.value)) ?? emptySummary(orderId.value);
    await this.store.save({ ...current, ...changes, lastEventAt }, eventId.value);
  }
}
```

## Repositories and adapters

```ts
export abstract class OrderRepository
  extends AggregateRepository<Order>
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateRemover<Order>
{
  abstract findById(id: OrderId): Promise<Order | null>;
  abstract save(order: Order): Promise<void>;
  abstract remove(order: Order): Promise<void>;
}

export class InMemoryOrderRepository extends OrderRepository {
  private readonly rows = new Map<string, { version: number; primitives: PrimitiveTypes<Order> }>();
  private readonly versions = new WeakMap<Order, number>();

  async findById(id: OrderId): Promise<Order | null> {
    const row = this.rows.get(id.value);
    if (row === undefined) {
      return null;
    }
    const order = Order.fromPrimitives(structuredClone(row.primitives));
    this.versions.set(order, row.version);
    return order;
  }

  async save(order: Order): Promise<void> {
    const version = this.checkedVersion(order);
    this.rows.set(order.id.value, {
      version: version + 1,
      primitives: structuredClone(order.toPrimitives()),
    });
    this.versions.set(order, version + 1);
  }

  async remove(order: Order): Promise<void> {
    this.checkedVersion(order);
    this.rows.delete(order.id.value);
  }

  private checkedVersion(order: Order): number {
    const version = this.versions.get(order) ?? 0;
    if ((this.rows.get(order.id.value)?.version ?? 0) !== version) {
      throw new ConcurrencyException('Order', order.id.value, version);
    }
    return version;
  }
}
```

IndexedDB: a static `IndexedDbTable`, version check and write in one transaction:

```ts
type OrderRow = PrimitiveTypes<Order> & { version: number };

export class IndexedDbOrderRepository extends OrderRepository {
  private static readonly orders = IndexedDbTable.of<OrderRow, 'byCustomer'>('orders', {
    database: 'shop',
    indexes: { byCustomer: { keyPath: 'customerId' } },
  });
  private readonly versions = new WeakMap<Order, number>();

  async findById(id: OrderId): Promise<Order | null> {
    const row = await IndexedDbOrderRepository.orders.get(id.value);
    if (row === null) {
      return null;
    }
    const { version, ...primitives } = row;
    const order = Order.fromPrimitives(primitives);
    this.versions.set(order, version);
    return order;
  }

  async save(order: Order): Promise<void> {
    const key = order.id.value;
    const version = this.versions.get(order) ?? 0;
    const table = IndexedDbOrderRepository.orders;
    await IndexedDbTable.transaction([table], 'readwrite', async (tx) => {
      if (((await tx.get(table, key))?.version ?? 0) !== version) {
        throw new ConcurrencyException('Order', key, version);
      }
      await tx.put(table, { ...order.toPrimitives(), version: version + 1 });
    });
    this.versions.set(order, version + 1);
  }

  async remove(order: Order): Promise<void> {
    const key = order.id.value;
    const version = this.versions.get(order) ?? 0;
    const table = IndexedDbOrderRepository.orders;
    await IndexedDbTable.transaction([table], 'readwrite', async (tx) => {
      if (((await tx.get(table, key))?.version ?? 0) !== version) {
        throw new ConcurrencyException('Order', key, version);
      }
      await tx.delete(table, key);
    });
  }
}
```

## Composition root

```ts
export class PaymentsContext {
  private constructor(
    readonly controller: PaymentsController,
    private readonly subscriptions: Subscription[],
  ) {}

  static async start({ channel, logger }: PaymentsSettings): Promise<PaymentsContext> {
    const bus = new DomainEventBus(channel, PaymentsContext.registry(), logger);
    const payments = new InMemoryPaymentRepository();
    const subscriptions = [await bus.subscribe(new RequestPaymentOnOrderCreated(payments, bus))];
    const controller = new PaymentsController(new ConfirmTransferReceived(payments, bus), logger);
    return new PaymentsContext(controller, subscriptions);
  }

  async stop(): Promise<void> {
    for (const subscription of this.subscriptions.splice(0)) {
      await subscription.unsubscribe();
    }
  }

  private static registry(): EventRegistry {
    return new EventRegistry().register(
      OrderCreatedDomainEvent,
      (json) =>
        new OrderCreatedDomainEvent({
          orderId: json.orderId as string,
          total: json.total as MoneyData,
          eventId: json.eventId,
          occurredOn: json.occurredOn,
        }),
    );
  }
}

const channel = new InMemoryEventChannel({ delivery: 'serial' });
const payments = await PaymentsContext.start({ channel, logger });
```

## Entry points

```ts
export class Http {
  private static readonly STATUS: Record<ExceptionKind, number> = {
    [ExceptionKind.NotFound]: 404,
    [ExceptionKind.NotAllowed]: 403,
    [ExceptionKind.Conflict]: 409,
    [ExceptionKind.Malformed]: 400,
    [ExceptionKind.Invalid]: 422,
    [ExceptionKind.Rejected]: 400,
    [ExceptionKind.Internal]: 500,
  };

  constructor(private readonly logger: Logger) {}

  async respond(action: () => Promise<HttpResponse>): Promise<HttpResponse> {
    try {
      return await action();
    } catch (error) {
      return this.failure(error);
    }
  }

  private failure(error: unknown): HttpResponse {
    const kind = ExceptionClassifier.classify(error);
    const known =
      error instanceof DomainException ||
      error instanceof ApplicationException ||
      error instanceof InfrastructureException;
    const code = known ? error.code : 'E000';
    if (kind === ExceptionKind.Internal) {
      this.logger.error('http_request_failed', { code, error });
      return { status: 500, body: { code, message: 'Internal server error' } };
    }
    const errors = error instanceof ValidationException ? error.errors : undefined;
    return { status: Http.STATUS[kind], body: { code, message: (error as Error).message, errors } };
  }
}

export class PaymentsController {
  private readonly http: Http;

  constructor(
    private readonly confirmTransferReceived: ConfirmTransferReceived,
    logger: Logger,
  ) {
    this.http = new Http(logger);
  }

  confirmTransfer(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const role = request.auth?.role;
      if (role === undefined) {
        return this.http.unauthenticated();
      }
      const body = this.http.jsonBody(request);
      if (body === null) {
        return this.http.badRequest('Send the received amount as a JSON object');
      }
      await this.confirmTransferReceived.execute({
        actorRole: role,
        paymentId: request.params?.paymentId as string,
        received: body as unknown as MoneyData,
      });
      return { status: 204 };
    });
  }
}
```

## Tests

Real situations, fixture factories in `test/support/`, native matchers. Compare VO dates with
`toEqual` or `.toISOString()`; never fix the time. An event-flow test asserts on what the reaction
caused and what the channel carried (never on the reaction being called) and delivers the same
event twice. One repository contract runs against every adapter; the IndexedDB one on a real
browser IndexedDB (Vitest browser mode), never a double, emptying its table before each test
(`await IndexedDbTable.of('orders').clear()`).

```ts
it('a transfer that arrives is captured and survives the round trip', () => {
  const payment = aPaymentAwaitingTransfer();
  payment.confirmTransfer(Money.fromPrimitives({ amount: 4_990, currency: 'EUR' }));
  expect(payment.pullDomainEvents().map((event) => ({ ...event }))).toMatchObject([
    { eventName: 'payment.captured' },
  ]);
  expect(Payment.fromPrimitives(payment.toPrimitives()).toPrimitives()).toEqual(
    payment.toPrimitives(),
  );
});

export function orderRepositoryContract(make: () => Promise<OrderRepository>): void {
  it('loads what it saved', async () => {
    const orders = await make();
    const order = aPendingOrder();
    await orders.save(order);
    expect((await orders.findById(order.id))?.toPrimitives()).toEqual(order.toPrimitives());
  });

  it('refuses a stale save', async () => {
    const orders = await make();
    await orders.save(aPendingOrder());
    const first = await orders.findById(new OrderId(orderId));
    const second = await orders.findById(new OrderId(orderId));
    await orders.save(first!);
    await expect(orders.save(second!)).rejects.toThrow(ConcurrencyException);
  });
}

describe('InMemoryOrderRepository', () =>
  orderRepositoryContract(async () => new InMemoryOrderRepository()));
describe('IndexedDbOrderRepository', () =>
  orderRepositoryContract(async () => new IndexedDbOrderRepository()));
```

## Another event channel

One `EventChannel` class in `infrastructure/messaging/`; use cases, reactions and `DomainEventBus`
stay the same. RabbitMQ: one durable topic exchange, the event name as routing key, one durable
queue per consumer and event, `ack` when the reaction finished, `nack` without requeue when it
failed (a dead-letter exchange keeps them). `publish` resolves when the broker took the messages:
an integration test waits for the effect instead of reading it right after `execute`.

```ts
class RabbitMqEventChannel implements EventChannel {
  constructor(
    private readonly amqp: AmqpChannel,
    private readonly exchange = 'shop.events',
  ) {}

  async send(events: readonly SerializedEvent[]): Promise<void> {
    await this.amqp.assertExchange(this.exchange, 'topic', { durable: true });
    for (const event of events) {
      this.amqp.publish(this.exchange, event.eventName, Buffer.from(JSON.stringify(event)), {
        persistent: true,
        messageId: event.eventId,
      });
    }
  }

  async receive(
    eventName: string,
    consumer: string,
    handler: ChannelHandler,
  ): Promise<ChannelSubscription> {
    const queue = `${consumer}.${eventName}`;
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
    return { close: async () => void (await this.amqp.cancel(consumerTag)) };
  }
}
```
