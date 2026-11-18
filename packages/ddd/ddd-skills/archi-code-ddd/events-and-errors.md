# Domain events and business errors

Part of the `archi-code-ddd` skill: read it only when that skill routes here. The events an
aggregate records and the business errors of a context.

## Rules

`[Fuera de los libros: convención de @archi-code/ddd]`: the `DomainEvent` suffix, the
`'<aggregate>.<past_action>'` name and the object constructor are package conventions; the books
name the event class and its type after the fact alone (`OrderPlaced`) [IDDD ch. 8].

- `event/<Aggregate><PastAction>DomainEvent.ts` extends `EventBase`; the creation event is
  `<Aggregate>CreatedDomainEvent`. It declares `static readonly eventName =
  '<aggregate>.<past_action>'` in snake_case (`'order.line_quantity_changed'`), a fact in the past
  tense, unique in the whole system; the base copies it into the event's `eventName` field, and
  a missing or blank one throws `InvalidEventDefinitionException`. Never `OrderUpdated` with the
  whole state.
- Fields are `readonly` and primitive data only: text, finite numbers, booleans, `null`, lists
  and plain objects of them. Money is `{ amount: number; currency: string }`, dates ISO text.
  Never value objects, `Date`s, `undefined`, class instances, `toPrimitives()` of an aggregate nor
  personal data nobody needs. Carry what consumers need to act without asking back (the total and
  payment method in `order.cancelled`, so a payment can be settled even if it does not exist yet).
- The id of the aggregate is a named field (`orderId`, `paymentId`, `shipmentId`), and so are
  references to other aggregates (`orderId` in payment events). There is no `aggregateId` and no
  schema version.
- No interfaces nor type aliases in an event file: the field types are inline and the
  constructor takes one object typed inline as `{ …fields } & EventMetadata`, destructures
  `eventId, occurredOn`, calls `super({ eventId, occurredOn })` and assigns each
  field.
- An event is plain data: no methods, no `toPrimitives`/`fromPrimitives`. A new event has no
  `occurredOn`: the event bus sets it when it sends the event, so the JSON it sends is
  `{ eventName, eventId, occurredOn, ...fields }`, in that order (an event that already carries
  `occurredOn` keeps it). A listener reads `event.occurredOn` (`string | undefined`) from the
  rebuilt event.
- Only its aggregate creates it: `this.record(new OrderPaidDomainEvent({ orderId: this.id.value, … }))`.
  Pass `eventId` and `occurredOn` only when rebuilding an event a channel delivered.
- There is no union type of an aggregate's events (no `<Aggregate>Event`): `AggregateRoot` takes
  only the id type (`AggregateRoot<OrderId>`), and `record`, `pullDomainEvents`, `EventBus`,
  `DomainEventBus` and `EventRegistry` work with `EventBase`, the class every event extends.
- `record(event)` is `protected` and keeps the event as it is; `pullDomainEvents()` returns the
  events (typed `EventBase[]`) in order and empties the list. Pull them after saving, to publish.
- **Events carry no schema version.** Adding an optional field old readers can ignore is
  compatible; a change they cannot follow is a new event with its own `eventName`, or the
  `EventRegistry` factory reads both shapes from the stored JSON.

- A business error is `exception/<WhatWentWrong>.ts` (no `Exception` suffix) extending
  `DomainException`, with only a constructor that receives primitives for the message and calls
  `super('<English message>', ['<CTX><NNN>'])`: one prefix per context (`SAL`, `PAY`, `SHP`, `MNY`
  for money) and the next free number. Only the aggregates, entities, value objects and domain
  services of the same context throw it, never a reaction method. Money errors live in
  `shared-kernel/money/`.

## Code

### Events and business errors

`event/PaymentCapturedDomainEvent.ts` and `exception/PaymentNotAwaitingTransfer.ts`:

```ts
import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class PaymentCapturedDomainEvent extends EventBase {
  static readonly eventName = 'payment.captured';

  readonly paymentId: string;
  readonly orderId: string;
  readonly amount: { amount: number; currency: string };

  constructor({
    paymentId,
    orderId,
    amount,
    eventId,
    occurredOn,
  }: {
    paymentId: string;
    orderId: string;
    amount: { amount: number; currency: string };
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.paymentId = paymentId;
    this.orderId = orderId;
    this.amount = amount;
  }
}
```

```ts
import { DomainException } from '@archi-code/ddd/domain';

export class PaymentNotAwaitingTransfer extends DomainException {
  constructor(paymentId: string, status: string) {
    super(`Payment ${paymentId} is ${status} and is not waiting for a transfer`, ['PAY001']);
  }
}
```

## What not to do

- An event class named without the `DomainEvent` suffix, or an `eventName` that is the class name
  or not `'<aggregate>.<past_action>'` in snake_case.
- Events named `OrderUpdated` carrying the whole state, named in present tense, carrying value
  objects, `Date`s, `undefined`, class instances, the `toPrimitives()` of an aggregate or personal data that
  consumers do not need.
- Interfaces, type aliases or imported data types in an event file, or positional constructor
  parameters: the constructor takes one object typed inline as `{ …fields } & EventMetadata`.
- An `aggregateId` field or a schema version: the id is a named field (`orderId`).
- Declaring `eventName` as a method or an instance field, or adding methods to an event.
- Creating an event outside its aggregate, or setting its `occurredOn` when recording it (the
  event bus sets it when it sends the event).
- Declaring a union type of an aggregate's events (`type OrderEvent = …`) or passing an event type
  to `AggregateRoot`, `EventBus`, `DomainEventBus` or `EventRegistry`: they take no event type and
  work with `EventBase`.
- Generating `eventId`/`occurredOn` yourself for a new event: the base sets `eventId` and the
  event bus sets `occurredOn` when it sends the event.
