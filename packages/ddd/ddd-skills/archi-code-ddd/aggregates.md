# Aggregates and child entities

Part of the `archi-code-ddd` skill: read it only when that skill routes here. Aggregate roots, child
entities, their conversion to primitives and the current time.

## Rules

`[Fuera de los libros: convención de @archi-code/ddd]`: the public constructor, `create`, the
getters named like the fields and `fromPrimitives`/`toPrimitives` are package
conventions; the books allow a private constructor with a factory [IDDD ch. 11], getters only
where needed [Distilled ch. 5] and a mapper in infrastructure [IDDD ch. 6].

- Aggregates extend `AggregateRoot<<Aggregate>Id>` and call `super(id)`; the id
  is exposed as `readonly id` (no `_id` + getter), `equals` compares class and id, and an id that
  holds no value throws `RequiredValueException` [IDDD ch. 5].
- Member order: `private static readonly` business constants → fields → public constructor →
  `static create` (and `static create<ClosedState>`) → `static fromPrimitives` → getters → public
  queries → business methods → `toPrimitives` → private helpers.
- Fields: a value that never changes is `readonly <name>`; one that changes is
  `private _<name>` with `get <name>()`. `readonly createdAt: CreatedAt` and
  `private _updatedAt: UpdatedAt` (with its getter) are the last two. Every field is a value
  object, a composite or an array of child entities; never a primitive, a `Date` nor a plain
  object (a flag is `class GiftWrap extends Required(BooleanType) {}`).
- **Constructor: public, and it only assigns.** It receives every field already built (id first,
  `createdAt` and `updatedAt` last), calls `super(id)` and assigns: no checks, no events, no
  defaults. `create` and `fromPrimitives` both call it.
- **`static create(id, ...valueObjects)`** starts the aggregate: it receives the id
  and the value objects already built, builds the child entities from
  `New<Child>` shapes and assigns their local ids (`new LineNumber(index + 1)`), sets the initial
  state (`new OrderStatusType(OrderStatus.PENDING_PAYMENT)`, `new PaymentReference(null)`,
  `CreatedAt.now()`, `UpdatedAt.now()`), checks the creation invariants (on the input
  before building, or with private `assert…()` after) throwing business errors, records
  `<Aggregate>CreatedDomainEvent` and returns. It never generates nor computes the id: the use
  case passes it (`OrderId.generate()`, `PaymentId.forOrder(order)`). Skip the creation event only
  for an aggregate whose creation nobody hears.
- **`static create<ClosedState>(id, …)`** (`Payment.createVoided`) is the only other factory: a
  closing fact (cancelled, voided) that arrives before the creating one builds the aggregate
  already closed under the derived id and records its closing event, so the creating reaction that
  arrives later finds the id taken and returns.
- **`static fromPrimitives(primitives: PrimitiveTypes<<Aggregate>>)`** rebuilds every field with
  its constructor (`new X(primitives.x)`) or `X.fromPrimitives(primitives.x)` for composites,
  rebuilds child entities with their constructor and calls the aggregate constructor. No events,
  no invariant checks.
- **`toPrimitives(): PrimitiveTypes<<Aggregate>>`** returns every field as plain data: VO →
  `.value`; composite → `.toPrimitives()`; child entity → an object literal
  `{ id: line.id.value, …fields }` written by the aggregate. `fromPrimitives(toPrimitives())`
  gives an equal aggregate, and each aggregate has a round-trip test. `PrimitiveTypes<T>` only
  sees **public** non-method members (it strips the leading `_`): nothing checks private state at
  run time, so a private field without its getter or left out of `toPrimitives()` compiles and is
  lost when saving.
- **Each state change is a business method** named after the business action (`cancel`,
  `markShipped`, `changeLineQuantity`): parameters are value objects; it
  returns `void` (or an outcome, below), changes the fields, updates `_updatedAt` (through private
  `moveTo(status)` / `touch()`) and records zero or more events.
- **A command can be refused, a fact cannot.** A method a user asks for (called by a user use
  case) throws a business error when it does not apply in the current state
  (`OrderNotCancellable`). A method that registers a fact that already happened elsewhere (called
  by a reaction use case: `markPaid`, `markShipped`, `cancelForRejectedPayment`) returns without
  changes when it does not apply and never throws a business error: events may arrive twice or
  late.
- **The aggregate decides, the use case never branches on its state.** When the outcome of an
  action changes what the use case does next (remove or save), the aggregate method returns it as
  an enum declared next to the aggregate (`aggregate/CourseRetirement.ts`: `course.retire()` →
  `CourseRetirement.DISCARDED | ARCHIVED`); the use case only acts on that answer.
- **A rule between who asks and the aggregate's state is the aggregate's**: the user use case
  passes the requester as a value object and the method checks it first (`order.cancel(requester)`
  → private `assertOwnedBy(requester)` → `OrderOwnedByAnotherCustomer`, a business error, 422).
  Every user method of an owned aggregate checks it, not only `cancel`. Only the actor alone
  deciding (a role) is `NotAllowedException` (403) in the use case.
- A method that changes state and then finds a broken invariant restores the previous state
  before rethrowing (`changeLineQuantity` restores the line's quantity when `assertTotal` throws).
- Public queries may exist (`subtotal()`, `total()`, `isIn(status)`), and a public `assert…()`
  for a precondition a use case checks before an operation that does not change the aggregate
  (`order.assertDiscardable()` before `orders.remove(order)`).
- **Time-based rules** ("expired", "in the future") are decided by an aggregate method, the only
  code that reads the current time (`CreatedAt.now()`/`UpdatedAt.now()`); a search filters by
  state and pages.
- An aggregate never holds a repository, the event bus, a logger, HTTP, a version nor setters.
  Another aggregate is referenced by its id (`customerId:
  CustomerId`), never by the object. An aggregate never calls, instantiates,
  imports nor receives a domain service, by constructor or as a method argument: only use cases
  execute domain services, and the aggregate receives loaded data or the answer of the service as
  a method argument (`domain-services.md`).
- **Child entities** (`entity/<Entity>.ts`, a part with an identity of its own inside the
  aggregate) extend `Entity<<IdVO>>` (`LineNumber extends Required(NumberType)`); fields as the
  aggregate's without `createdAt`/`updatedAt`; the constructor receives value objects, calls
  `super(id)` and assigns. They may have queries (`subtotal()`) and business methods only their
  root calls (`changeQuantity(quantity)`; Tell, Don't Ask [IDDD ch. 5 and 10]), never setters,
  events, `create` nor `toPrimitives`/`fromPrimitives` (the aggregate converts them). Their
  identity is local to the aggregate [IDDD ch. 10]. Prefer a composite over a child entity when
  nobody looks the part up by id [IDDD ch. 6]; as soon as a use case changes one part by its
  number (`changeLineQuantity(requester, lineNumber, quantity)`), the part is a child entity:
  `create` receives `New<Child>` shapes and numbers them, and a rule over all of them (no repeated
  SKU) is a business error of the aggregate (`DuplicateSku`), checked by a private `assert…()`.
- The aggregate carries **no version**: optimistic concurrency is the repository's.

- The current time comes only from the date value objects: `CreatedAt.now()` and
  `UpdatedAt.now()` (no argument, the system time), called inside the aggregate; never
  `Date.now()` nor `new Date()` for the current time (`new Date(createdAt.value.getTime() + ms)`
  from a known value is fine). Nothing receives nor passes a time source: not the aggregate
  methods, the use cases nor the composition. An event's `occurredOn` is set by the event bus when
  it sends the event. Tests never fix the time: they check that a stamped date is valid and build
  the dates of a loaded state with the constructor (`new CreatedAt('2026-03-01T09:30:00Z')`).

## Code

### Aggregate

`aggregate/Payment.ts`: public constructor that only assigns, `create` with the initial state and
the creation event, `createVoided` for a cancellation that arrives before the payment exists,
`fromPrimitives`/`toPrimitives`, a method a user asks for (throws) and reaction methods (return
silently):

```ts
import { AggregateRoot, CreatedAt, UpdatedAt } from '@archi-code/ddd/domain';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';

export class Payment extends AggregateRoot<PaymentId> {
  private static readonly LIMIT_CENTS: Record<PaymentMethod, number> = {
    [PaymentMethod.CARD]: 50_000,
    [PaymentMethod.TRANSFER]: 500_000,
  };

  readonly orderReference: OrderReference;
  private _amount: Money;
  readonly method: PaymentMethodType;
  private _status: PaymentStatusType;
  private _rejection: RejectionCodeType;
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(
    id: PaymentId,
    orderReference: OrderReference,
    amount: Money,
    method: PaymentMethodType,
    status: PaymentStatusType,
    rejection: RejectionCodeType,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
  ) {
    super(id);
    this.orderReference = orderReference;
    this._amount = amount;
    this.method = method;
    this._status = status;
    this._rejection = rejection;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(
    id: PaymentId,
    orderReference: OrderReference,
    amount: Money,
    method: PaymentMethodType,
  ): Payment {
    const payment = new Payment(
      id,
      orderReference,
      amount,
      method,
      new PaymentStatusType(PaymentStatus.PENDING),
      new RejectionCodeType(null),
      CreatedAt.now(),
      UpdatedAt.now(),
    );
    payment.record(
      new PaymentCreatedDomainEvent({
        paymentId: payment.id.value,
        orderId: payment.orderReference.value,
        amount: payment._amount.toPrimitives(),
        method: payment.method.value,
      }),
    );
    return payment;
  }

  static createVoided(
    id: PaymentId,
    orderReference: OrderReference,
    amount: Money,
    method: PaymentMethodType,
  ): Payment {
    const payment = new Payment(
      id,
      orderReference,
      amount,
      method,
      new PaymentStatusType(PaymentStatus.VOIDED),
      new RejectionCodeType(null),
      CreatedAt.now(),
      UpdatedAt.now(),
    );
    payment.record(
      new PaymentVoidedDomainEvent({
        paymentId: payment.id.value,
        orderId: payment.orderReference.value,
      }),
    );
    return payment;
  }

  static fromPrimitives(primitives: PrimitiveTypes<Payment>): Payment {
    return new Payment(
      new PaymentId(primitives.id),
      new OrderReference(primitives.orderReference),
      Money.fromPrimitives(primitives.amount),
      new PaymentMethodType(primitives.method),
      new PaymentStatusType(primitives.status),
      new RejectionCodeType(primitives.rejection),
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
    );
  }

  get amount(): Money {
    return this._amount;
  }

  get status(): PaymentStatusType {
    return this._status;
  }

  get rejection(): RejectionCodeType {
    return this._rejection;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  process(): void {
    if (this._status.value !== PaymentStatus.PENDING) {
      return;
    }
    if (this.exceedsLimit()) {
      this.reject(RejectionCode.LIMIT_EXCEEDED);
    } else if (this.method.value === PaymentMethod.CARD) {
      this.capture();
    } else {
      this.awaitTransfer();
    }
  }

  confirmTransfer(received: Money): void {
    if (this._status.value !== PaymentStatus.AWAITING_TRANSFER) {
      throw new PaymentNotAwaitingTransfer(this.id.value, this._status.value);
    }
    if (received.equals(this._amount)) {
      this.capture();
    } else {
      this.reject(RejectionCode.AMOUNT_MISMATCH);
    }
  }

  settleForCancelledOrder(): void {
    if (this._status.value === PaymentStatus.CAPTURED) {
      this.moveTo(PaymentStatus.REFUNDED);
      this.record(
        new PaymentRefundedDomainEvent({
          paymentId: this.id.value,
          orderId: this.orderReference.value,
          amount: this._amount.toPrimitives(),
        }),
      );
    } else if (this._status.value === PaymentStatus.AWAITING_TRANSFER) {
      this.moveTo(PaymentStatus.VOIDED);
      this.record(
        new PaymentVoidedDomainEvent({
          paymentId: this.id.value,
          orderId: this.orderReference.value,
        }),
      );
    }
  }

  toPrimitives(): PrimitiveTypes<Payment> {
    return {
      id: this.id.value,
      orderReference: this.orderReference.value,
      amount: this._amount.toPrimitives(),
      method: this.method.value,
      status: this._status.value,
      rejection: this._rejection.value,
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }

  private exceedsLimit(): boolean {
    return this._amount.isAtLeast(Payment.LIMIT_CENTS[this.method.value] + 1);
  }

  private awaitTransfer(): void {
    this.moveTo(PaymentStatus.AWAITING_TRANSFER);
    this.record(
      new PaymentAwaitingTransferDomainEvent({
        paymentId: this.id.value,
        orderId: this.orderReference.value,
        amount: this._amount.toPrimitives(),
      }),
    );
  }

  private capture(): void {
    this.moveTo(PaymentStatus.CAPTURED);
    this.record(
      new PaymentCapturedDomainEvent({
        paymentId: this.id.value,
        orderId: this.orderReference.value,
        amount: this._amount.toPrimitives(),
      }),
    );
  }

  private reject(code: RejectionCode): void {
    this._rejection = new RejectionCodeType(code);
    this.moveTo(PaymentStatus.REJECTED);
    this.record(
      new PaymentRejectedDomainEvent({
        paymentId: this.id.value,
        orderId: this.orderReference.value,
        amount: this._amount.toPrimitives(),
        reason: code,
      }),
    );
  }

  private moveTo(status: PaymentStatus): void {
    this._status = new PaymentStatusType(status);
    this._updatedAt = UpdatedAt.now();
  }
}
```

Child entities and the requester: `create` receives `New<Child>` shapes of value objects
(`aggregate/NewOrderLine.ts`) and assigns the local ids; every method a user asks for checks the
requester first; `toPrimitives` writes each child as an object literal; a change that breaks an
invariant is undone before rethrowing:

```ts
import { Entity } from '@archi-code/ddd/domain';

export interface NewOrderLine {
  sku: Sku;
  quantity: Quantity;
  unitPrice: Money;
}

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

  subtotal(): Money {
    return this.unitPrice.times(this._quantity.value);
  }

  changeQuantity(quantity: Quantity): void {
    this._quantity = quantity;
  }
}

// inside Order
  static create(id: OrderId, customerId: CustomerId, lines: NewOrderLine[] /* , … */): Order {
    if (lines.length < 1 || lines.length > Order.MAX_LINES) {
      throw new OrderLineCountOutOfRange(lines.length);
    }
    const order = new Order(
      id,
      customerId,
      lines.map(
        (line, index) =>
          new OrderLine(new LineNumber(index + 1), line.sku, line.quantity, line.unitPrice),
      ),
      new OrderStatusType(OrderStatus.PENDING_PAYMENT),
      /* … the other fields: shipping address, payment method, payment reference */
      CreatedAt.now(),
      UpdatedAt.now(),
    );
    order.assertDistinctSkus();
    order.assertTotal();
    order.record(new OrderCreatedDomainEvent({ orderId: order.id.value /* , … */ }));
    return order;
  }

  changeLineQuantity(requester: CustomerId, lineNumber: LineNumber, quantity: Quantity): void {
    this.assertOwnedBy(requester);
    this.assertPendingPayment();
    const line = this._lines.find((candidate) => candidate.id.equals(lineNumber));
    if (line === undefined) {
      throw new OrderLineNotFound(this.id.value, lineNumber.value);
    }
    const previous = line.quantity;
    line.changeQuantity(quantity);
    try {
      this.assertTotal();
    } catch (error) {
      line.changeQuantity(previous);
      throw error;
    }
    this.touch();
    this.record(
      new OrderLineQuantityChangedDomainEvent({
        orderId: this.id.value,
        lineNumber: lineNumber.value,
        quantity: quantity.value,
        total: this.total().toPrimitives(),
      }),
    );
  }

  cancel(requester: CustomerId): void {
    this.assertOwnedBy(requester);
    if (!this.isIn(OrderStatus.PENDING_PAYMENT) && !this.isIn(OrderStatus.PAID)) {
      throw new OrderNotCancellable(this.id.value, this._status.value);
    }
    const wasPaid = this.isIn(OrderStatus.PAID);
    this.moveTo(OrderStatus.CANCELLED);
    this.record(
      new OrderCancelledDomainEvent({
        orderId: this.id.value,
        reason: 'cancelled_by_customer',
        wasPaid,
        total: this.total().toPrimitives(),
        paymentMethod: this.paymentMethod.value,
      }),
    );
  }

  markPaid(payment: PaymentReference): void {
    if (!this.isIn(OrderStatus.PENDING_PAYMENT)) {
      return;
    }
    this._paymentReference = payment;
    this.moveTo(OrderStatus.PAID);
    this.record(/* OrderPaidDomainEvent */);
  }

  toPrimitives(): PrimitiveTypes<Order> {
    return {
      id: this.id.value,
      customerId: this.customerId.value,
      lines: this._lines.map((line) => ({
        id: line.id.value,
        sku: line.sku.value,
        quantity: line.quantity.value,
        unitPrice: line.unitPrice.toPrimitives(),
      })),
      status: this._status.value,
      /* … every other field, none left out: paymentMethod, paymentReference */
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }

  private assertOwnedBy(requester: CustomerId): void {
    if (!requester.equals(this.customerId)) {
      throw new OrderOwnedByAnotherCustomer(this.id.value);
    }
  }
```

The aggregate decides and returns the outcome when it changes what the use case does next
(`aggregate/CourseRetirement.ts` next to the aggregate):

```ts
export enum CourseRetirement {
  DISCARDED = 'discarded',
  ARCHIVED = 'archived',
}

// inside Course
  retire(): CourseRetirement {
    if (this.isIn(CourseStatus.ARCHIVED)) {
      throw new CourseAlreadyRetired(this.id.value);
    }
    if (this.isIn(CourseStatus.DRAFT)) {
      this.record(new CourseDiscardedDomainEvent({ courseId: this.id.value }));
      return CourseRetirement.DISCARDED;
    }
    this.moveTo(CourseStatus.ARCHIVED);
    this.record(new CourseArchivedDomainEvent({ courseId: this.id.value }));
    return CourseRetirement.ARCHIVED;
  }
```

## What not to do

- A private constructor, or a constructor that checks, defaults or records events: it is public
  and only assigns; `create` and `fromPrimitives` call it.
- Generating or computing the id inside `create` (`OrderId.generate()`,
  `PaymentId.forOrder(...)` in the aggregate): the use case passes the id.
- A business factory with another name than `create` (except `create<ClosedState>`, such as
  `Payment.createVoided`, for a closing fact that arrives before the creating one), or a `create`
  that records anything but `<Aggregate>CreatedDomainEvent` or skips the creation invariants.
- Raw state in an aggregate (`private _shipped: boolean`, `private _at: Date`, a `string` field):
  wrap it in a value object.
- A private field without its public getter, or left out of `toPrimitives()`: it compiles and is
  lost when saving; the round-trip test of each aggregate must cover every field.
- Declaring `private readonly _id` + `get id()`: the id goes to `super(id)`.
- `toPrimitives()` returning value objects or composites instead of `vo.value` /
  `composite.toPrimitives()`; `fromPrimitives` that records events or checks invariants.
- A method a user asks for that silently ignores a state where it does not apply: it throws a
  business error.
- A reaction method (called by a reaction use case) that throws a business error when the fact
  does not apply: it returns without changes; events arrive twice or late.
- A user method of an owned aggregate that does not check the requester (only `cancel` checks it,
  `changeShippingAddress` does not): every user method receives the requester and checks it first.
- A use case that branches on the aggregate's state (`if (course.status.value === …) remove else
  save`): the aggregate method returns the outcome as an enum and the use case acts on it.
- Leaving the aggregate half changed when an invariant breaks after a change: restore the
  previous state before rethrowing.
- A domain service received, called or instantiated by an aggregate (by constructor or as a method
  argument), or a repository received by its constructor: the use case executes the domain service
  and passes the loaded data or the answer of the service as a method argument.
- Authorization checks in the aggregate (only the actor's role decides): they are the use case's
  (`NotAllowedException`); rules over the aggregate's state, the requester included, stay in the
  aggregate.
- Declaring a `version` field in an aggregate, or putting it in `toPrimitives()`.
- Calling `record()` from outside the aggregate (it is `protected`) or forgetting `super(...)`.
- A child entity as a plain class, with setters, events, `create` or its own
  `toPrimitives`, or called from outside its aggregate.
- Using `new Date()` or `Date.now()` for the current time in domain or application code: use
  `CreatedAt.now()` / `UpdatedAt.now()`; "expired" or "in the future" is an aggregate method.
