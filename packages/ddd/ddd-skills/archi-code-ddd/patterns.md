# Recommended patterns

Part of the `archi-code-ddd` skill: read it only when that skill routes here. Each block is a
file of a context (see `where-each-class-goes.md`); replace the names and keep the shape. Longer
examples (IndexedDB repository, broker channel) are in the package README. Format with the
project's Prettier.

## Value objects

```ts
export class OrderId extends IdType<'OrderId'> {}

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
    this.moveTo(PaymentStatus.CAPTURED);
    this.record(
      new PaymentCapturedDomainEvent({ paymentId: this.id.value, amount: this.amount.toPrimitives() }),
    );
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

  private moveTo(status: PaymentStatus): void {
    this._status = new PaymentStatusType(status);
    this._updatedAt = UpdatedAt.now();
  }
}
```

A child entity is the same shape without dates nor `create`: `class OrderLine extends
Entity<LineNumber>` with `super(id)`, VO fields and methods only its root calls.

## Domain service

`PlaceOrder` receives `CouponCatalog` (a domain port) and does `new OrderPricing(this.coupons)` in
`handle`; a service two use cases share (`CourseFinder`) receives the abstract repository the
same way.

```ts
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

Creating: `const order = Order.create(OrderId.generate(), …)` → `save` → `publish` → `return
order.id.value`. Removing: `order.assertDiscardable(); await this.orders.remove(order);`.

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

## Read model projection

```ts
export class OrderSummaryProjection {
  constructor(private readonly store: OrderSummaryStore) {}

  async apply({ eventId, orderId, occurredOn, changes }: OrderSummaryChange): Promise<void> {
    if (await this.store.hasApplied(eventId.value)) {
      return;
    }
    const occurred = occurredOn.toString();
    const current = (await this.store.find(orderId.value)) ?? emptySummary(orderId.value, occurred);
    const lastEventAt = occurred > current.lastEventAt ? occurred : current.lastEventAt;
    await this.store.save({ ...current, ...changes, lastEventAt }, eventId.value);
  }
}
```

## Repository

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

IndexedDB keeps the same shape over a `private static readonly` `IndexedDbTable.of(...)`: inside
one `IndexedDbTable.transaction([table], 'readwrite', async (tx) => …)` it reads the stored
version with `tx.get`, throws `ConcurrencyException` when it differs and writes `{
...order.toPrimitives(), version: version + 1 }` with `tx.put` (`tx.delete` to remove).

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
```

## Entry points

One shared helper, `platform/http/http.ts` (the requests and responses are the project's own
types):

```ts
export interface HttpRequest {
  auth?: { userId?: string; role?: string };
  params?: Record<string, string>;
  body?: unknown;
}

export interface HttpResponse {
  status: number;
  body?: unknown;
}

export type JsonBody = Record<string, unknown>;

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
  private static readonly NOT_FOUND_CODES = new Set(['SCH001']);

  constructor(private readonly logger: Logger) {}

  async respond(action: () => Promise<HttpResponse>): Promise<HttpResponse> {
    try {
      return await action();
    } catch (error) {
      return this.failure(error);
    }
  }

  jsonBody(request: HttpRequest): JsonBody | null {
    const { body } = request;
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as JsonBody)
      : null;
  }

  badRequest(message: string): HttpResponse {
    return { status: 400, body: { code: 'BAD_REQUEST', message } };
  }

  unauthenticated(): HttpResponse {
    return { status: 401, body: { code: 'UNAUTHENTICATED', message: 'Sign in first' } };
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
    const status = Http.NOT_FOUND_CODES.has(code) ? 404 : Http.STATUS[kind];
    const errors = error instanceof ValidationException ? error.errors : undefined;
    return { status, body: { code, message: (error as Error).message, errors } };
  }
}
```

A controller method checks the actor, then the shape of each field it passes (`typeof
body.reason === 'string'`, never its value), and calls one use case:

```ts
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
```

## Tests

Real situations, fixture factories in `test/support/`, native matchers; never fix the time. An
event-flow test asserts on what the reaction caused and delivers the same event twice. One
repository contract runs against every adapter (IndexedDB on a real browser, emptying its table
before each test).

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
  it('refuses a stale save', async () => {
    const orders = await make();
    await orders.save(aPendingOrder());
    const first = await orders.findById(new OrderId(orderId));
    const second = await orders.findById(new OrderId(orderId));
    await orders.save(first!);
    await expect(orders.save(second!)).rejects.toThrow(ConcurrencyException);
  });
}
```
