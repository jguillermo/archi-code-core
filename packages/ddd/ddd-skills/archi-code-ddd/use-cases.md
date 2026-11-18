# Use cases

Part of the `archi-code-ddd` skill: read it only when that skill routes here. What every use case
follows (user and reaction) and the user use case. A reaction also reads `reactions.md`.

## Rules

A use case is one business action. There are two kinds; the only difference is where the input
comes from.

| Kind              | Input        | Class                                                              | Run by         |
| ----------------- | ------------ | ------------------------------------------------------------------ | -------------- |
| user use case     | request data | `<Action> extends UseCase<<Action>Input, <Action>Command, Output>` | an entry point |
| reaction use case | an event     | `<Action>On<Event> extends EventListener<<Event>DomainEvent>`      | the event bus  |

- A use case does **one thing**: one business action, one class, one aggregate saved once
  [Distilled ch. 5; IDDD ch. 10]; a flow of several actions is several use cases chained by events,
  never one use case with flags or a `type` field that switch behaviors. The exceptions IDDD ch. 10
  accepts (a bulk change over many aggregates of one kind, such as `DiscountCheapCourses`) are
  written down as a decision record in `docs/decisions/NNNN-<title>.md`, or in the decision
  records folder the project already has (context, decision,
  consequences) before the code. It is **named after the business action**, a verb and a noun a
  domain expert would say (`PlaceOrder`, `ConfirmTransferReceived`, `MarkOrderPaid`), never
  technical or CRUD names (`UpdateOrder`, `OrderService`, `ProcessOrder`). It never imports nor
  calls another use case or a reaction, opens no transaction, handles no HTTP, checks no raw input
  shape and holds no business rule.
- Constructor parameters, `private readonly` and only what `handle` uses, in this order: the
  repository of the aggregate (`private readonly orders: OrderRepository`, the abstract class of
  the domain, never `AggregateFinder<X> & AggregateSaver<X>`), the dependencies of the domain
  services it instantiates (the abstract repository each one needs, such as `CouponRepository`;
  never the service itself), the application ports it calls, `EventBus`, `Logger`; the body is `super();`.

### A use case never uses another use case (strict rule)

This rule has no exception (user rule): **a use case never instantiates, receives, imports,
extends nor calls another use case** (nor a reaction use case), not even to reuse a few lines.
`new PublishCourse(...)` or `this.publishCourse.execute(...)` inside another use case is always
wrong, and so is a base use case with shared helpers. A use case is the entry to one business
action; calling one from another mixes two actions, two authorizations and two error translations.

When two use cases share logic, that logic moves to the domain:

- a rule of one aggregate → a method of the aggregate;
- a business rule that reads aggregates or spans several (register one only when it does not
  exist yet, compute over several) → a **domain service** in `domain/service/<Service>.ts`; a
  lookup alone is not one: each use case keeps its own `findById` with
  `AggregateNotFoundException`;
- a technical step → a port;
- an action that must follow another → the first records an event and a reaction runs the second.

Each use case then instantiates the domain service inside `handle` and passes it the
dependencies it received in its own constructor. Example: `CreateCourse` and `ImportCourse` both
register a course: check that it does not exist yet, create it and save it. The wrong answer is
that one uses the other. The right one:

1. `domain/service/CourseRegistration.ts`: `class CourseRegistration` with
   `constructor(private readonly courses: CourseRepository) {}` and
   `register(id, title): Promise<Course>` (`throw new CourseAlreadyExists(id.value)` when
   `findById` finds it; otherwise `Course.create(id, title)`, `await this.courses.save(course)`
   and return the course).
2. `domain/exception/CourseAlreadyExists.ts`: a business error (`extends DomainException`, a code
   of the context). The domain cannot throw `AggregateNotFoundException`: it lives in
   `/application` and the domain never imports it. `ExceptionClassifier` gives the error
   `ExceptionKind.Invalid` (422).
3. `CreateCourse` and `ImportCourse` each receive `CourseRepository` by constructor and do
   `new CourseRegistration(this.courses).register(...)` inside `handle`; the service already
   saved the course, so each use case only publishes `course.pullDomainEvents()`.

Reading one aggregate to show it is never a use case (no `FindCourse`): it is the query port of a
read model.

### User use cases

- The file `application/<action>/<action>.ts` exports `interface <Action>Input` (primitives and
  data types; `actorId` or `actorRole` when an actor matters), `interface <Action>Command` (value
  objects, composites, `New<Child>[]`) and the class. `Output` is `void`, the new id as
  `string`, or a DTO of primitives when the client needs the result of the action; never an
  aggregate.
- `protected toCommand(input)` is exactly `return ValueObjectBuilder.build({ … })`: enums
  `new <Enum>Type(input.x as <Enum>)`, composites `X.fromPrimitives(input.x)`, money
  `Money.fromPrimitives(input.x as { amount: number; currency: Currency })`, lists of shapes
  `ValueObjectBuilder.buildList(input.lines, (line) => ValueObjectBuilder.build({ … }))`, the
  requester `new CustomerId(input.actorId)`.
- `protected async handle(command)`, in this order: (1) authorization by role → `throw new
  NotAllowedException('<English message>')`; (2) a new id, `<Aggregate>Id.generate()`, or a
  derived one; (3) `<Aggregate>.create(...)`, or `findById` and, when it is `null`, `throw new
  AggregateNotFoundException('<Aggregate>', id.value)` (a lookup another use case also needs stays in
  each one: a bare shared `findById` is not a domain service); (4) the business method, passing the
  requester when the aggregate checks it; (5) `await repo.save(x)` once (or `await
  repo.remove(x)`; when the domain service the use case executed already saved the aggregate, the
  use case does not save it again), then `await this.events.publish(x.pullDomainEvents())`; (6)
  log if the
  business wants a trace; (7) return the output. `UseCase` has no helpers. `execute` keeps package
  exceptions and wraps any other error of either step in `UnexpectedErrorException` with `cause`:
  let errors propagate, never catch.
- **Authorization belongs to the use case**: the entry point puts the requester (`actorId`,
  `actorRole`) in the input, `toCommand` builds it as a value object and `handle` throws
  `NotAllowedException` when the actor alone decides it (only treasury confirms transfers). A rule
  that depends on the aggregate's state (only the buyer cancels the order) is a business error of
  the aggregate.
- **Concurrency**: by default let `ConcurrencyException` reach the entry point (409). A use case
  whose change is safe to repeat (set an address) may retry the whole load → change → save →
  publish in `handle` with `private static readonly ATTEMPTS = 3`, rethrowing anything that is not
  a `ConcurrencyException` and the last conflict [IDDD ch. 10; IDDD appendix A]. Never retry with
  the same loaded aggregate, and never retry a relative change (a 10% discount would apply twice).
- **External side effects** (charge a gateway, send an email, call another system) never run
  before `save` in a user use case: a conflict on `save` would leave the effect done and
  unrecorded. The use case only records the intent (`invoice.requestPayment(requester, amount)` →
  `InvoicePaymentRequestedDomainEvent`, status `PAYMENT_REQUESTED`) and saves. A reaction to that
  event receives the application port by constructor and calls it directly (no domain service around a
  bare port call) with an **idempotency key**, then records the outcome on the aggregate
  (`invoice.settleCharge(key, outcome)`, code in `reactions.md`) and saves. The key is one per
  attempt and per effect: the `eventId` of the event that asked for it (a declined charge retried
  is a new request with a new key; the refund has its own key). The aggregate stores the key of the
  attempt in progress and answers whether it still awaits that outcome (`invoice.awaitsCharge(key)`):
  the reaction returns when it does not. The aggregate id is a key only for an effect that happens
  once in the aggregate's life. Secrets the effect needs (a card token) never go in the aggregate
  nor the event: a port keeps them under a reference. An event that takes the aggregate out of an
  intermediate state must not be lost: the repository writes it to an outbox.
- **Uniqueness across aggregates** ("one active enrollment per student and course") is never a
  `search` before `create`: two concurrent requests both pass it. Make the unique key the derived
  id (UUID v5 of student + course + attempt number), so the repository refuses the second insert
  with `ConcurrencyException` (409). Uniqueness that ends (one appointment per vet and slot while
  it is active) is a reservation aggregate under the derived id (`VetSlot` with `hold`/`release`);
  when it is not the same aggregate as the main one, the use case holds the reservation and a
  reaction to the hold creates the main aggregate; a concurrent first hold is a
  `ConcurrencyException`. A `search` check is acceptable only as an accepted eventual-consistency
  decision record.
- **Bulk changes** (`DiscountCheapCourses`) search with a `Criteria` and `limit`, change and save
  each aggregate, and page; when the change removes rows from the result, re-read the first page
  instead of moving the offset.

## Code

### User use case

`application/confirm-transfer-received/confirm-transfer-received.ts`: `Input` and `Command` in the
same file, `toCommand` with one `ValueObjectBuilder.build`, `handle` with authorization → load →
business method → save → publish:

```ts
import {
  AggregateNotFoundException,
  NotAllowedException,
  UseCase,
  ValueObjectBuilder,
} from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';

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
      received: () =>
        Money.fromPrimitives(input.received as { amount: number; currency: Currency }),
    });
  }

  protected async handle(command: ConfirmTransferReceivedCommand): Promise<void> {
    if (command.actorRole.value !== StaffRole.TREASURY) {
      throw new NotAllowedException(
        `The role ${command.actorRole.value} may not confirm transfers`,
      );
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

The data type, `application/request-payment/money-data.ts` (the rest of the context imports it
from there):

```ts
export interface MoneyData {
  amount: number;
  currency: string;
}
```

A requester the aggregate checks (`application/cancel-order/cancel-order.ts`): the actor goes in
the input, becomes a value object and is passed to the business method:

```ts
export interface CancelOrderInput {
  actorId: string;
  orderId: string;
}

export interface CancelOrderCommand {
  requester: CustomerId;
  orderId: OrderId;
}

export class CancelOrder extends UseCase<CancelOrderInput, CancelOrderCommand, void> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: CancelOrderInput): CancelOrderCommand {
    return ValueObjectBuilder.build({
      requester: () => new CustomerId(input.actorId),
      orderId: () => new OrderId(input.orderId),
    });
  }

  protected async handle(command: CancelOrderCommand): Promise<void> {
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      throw new AggregateNotFoundException('Order', command.orderId.value);
    }
    order.cancel(command.requester);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
```

Creating: the use case generates the id and passes the answer of a domain service it
instantiates itself (`PlaceOrder` receives `CouponRepository` by constructor, never `OrderPricing`);
lists of shapes use `buildList`; it returns the new id:

```ts
  protected toCommand(input: PlaceOrderInput): PlaceOrderCommand {
    return ValueObjectBuilder.build({
      actorId: () => new CustomerId(input.actorId),
      customerId: () => new CustomerId(input.customerId),
      lines: () =>
        ValueObjectBuilder.buildList(input.lines, (line) =>
          ValueObjectBuilder.build({
            sku: () => new Sku(line.sku),
            quantity: () => new Quantity(line.quantity),
            unitPrice: () =>
              Money.fromPrimitives(line.unitPrice as { amount: number; currency: Currency }),
          }),
        ),
      shippingAddress: () => ShippingAddress.fromPrimitives(input.shippingAddress),
      couponCodes: () => new CouponCodes(input.couponCodes),
      paymentMethod: () => new PaymentMethodType(input.paymentMethod as PaymentMethod),
    });
  }

  protected async handle(command: PlaceOrderCommand): Promise<string> {
    if (!command.actorId.equals(command.customerId)) {
      throw new NotAllowedException(
        `Customer ${command.actorId.value} may not place orders for ${command.customerId.value}`,
      );
    }
    const discount = await new OrderPricing(this.coupons).discountFor(command.couponCodes);
    const order = Order.create(OrderId.generate(), command.customerId, command.lines, /* … */ discount);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
    return order.id.value;
  }
```

A change safe to repeat retries the whole load → change → save on a conflict:

```ts
  private static readonly ATTEMPTS = 3;

  protected async handle(command: ChangeShippingAddressCommand): Promise<void> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const order = await this.orders.findById(command.orderId);
        if (order === null) {
          throw new AggregateNotFoundException('Order', command.orderId.value);
        }
        order.changeShippingAddress(command.requester, command.shippingAddress);
        await this.orders.save(order);
        return await this.events.publish(order.pullDomainEvents());
      } catch (error) {
        if (!(error instanceof ConcurrencyException) || attempt === ChangeShippingAddress.ATTEMPTS) {
          throw error;
        }
      }
    }
  }
```

Removing: the aggregate answers whether it may go, the repository removes the loaded aggregate:

```ts
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      throw new AggregateNotFoundException('Order', command.orderId.value);
    }
    order.assertDiscardable();
    await this.orders.remove(order);
    await this.events.publish(order.pullDomainEvents());
```

Acting on the outcome the aggregate returns, never on its state:

```ts
  protected async handle(command: RetireCourseCommand): Promise<void> {
    if (command.actorRole.value !== ActorRole.EDITOR) {
      throw new NotAllowedException(`The role ${command.actorRole.value} may not retire courses`);
    }
    const course = await this.courses.findById(command.courseId);
    if (course === null) {
      throw new AggregateNotFoundException('Course', command.courseId.value);
    }
    if (course.retire() === CourseRetirement.DISCARDED) {
      await this.courses.remove(course);
    } else {
      await this.courses.save(course);
    }
    await this.events.publish(course.pullDomainEvents());
  }
```

Uniqueness across aggregates is the derived id, never a `search` before `create`: the second
`save` of the same id is a `ConcurrencyException` (409):

```ts
export class EnrollmentId extends IdType<'EnrollmentId'> {
  static forAttempt(student: StudentReference, course: CourseReference, attempt: number): EnrollmentId {
    return new EnrollmentId(
      UuidType.fromValue(`enrollment:${student.value}:${course.value}:${attempt}`),
    );
  }
}
```

## What not to do

- A use case that instantiates, receives, imports, extends or calls another use case or a
  reaction (`new PublishCourse(this.courses, bus).execute(...)` inside `CreateCourse`, or a use case
  received by constructor), or a base use case with shared helpers. It is forbidden with no
  exception, even to reuse a lookup: move the shared logic to the aggregate or to a domain
  service that each use case instantiates (`new CourseRegistration(this.courses)`), or chain the
  actions with an event.
- A use case that does several things (`UpdateOrder` that ships, cancels or renames depending on
  the input) or saves more than one aggregate outside the IDDD ch. 10 exceptions written down as
  a decision record in the project's decision records folder (`docs/decisions/` when it has
  none).
- Technical or CRUD names (`OrderService`, `UpdateUser`, `SaveOrder`, `ProcessPayment` when the
  business says `CapturePayment`).
- `Input`/`Command` interfaces in another file than their use case, or a command class.
- Constructor dependencies the use case does not use, or a repository typed with the package
  roles (`AggregateFinder<Order> & AggregateSaver<Order>`): every use case and reaction of an
  aggregate receives its abstract repository (`OrderRepository`).
- Calling `bus.publish` before `repository.save`, or publishing without `pullDomainEvents()`.
- Catching errors inside `handle` just to rethrow them as `ApplicationException`: let them
  propagate; `execute` keeps package exceptions and wraps the rest.
- Retrying a `ConcurrencyException` with the same loaded aggregate, without a limit, or for a
  command that is not safe to repeat (a relative change such as a 10% discount never retries: it
  may apply twice).
- Opening, joining or closing transactions in a use case, a reaction or the domain, or passing a
  transaction runner, unit of work, session or connection to them.
- Changing the use case so events are not lost between `save` and `publish`: the repository
  stores them in the same atomic write (an outbox) and a relay delivers them.
- Uniqueness across aggregates checked with `search` before `create`: make it the derived id.
- A bulk `search` without `limit` (page through it), or one that moves the offset when its change
  removes rows from the result.
- Returning an aggregate from a use case: return an id, a DTO or nothing.
- A query use case (`FindCourse` included: reading by id is a read-model query port).
