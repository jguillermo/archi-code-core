# Reaction use cases and events between contexts

Part of the `archi-code-ddd` skill: read it only when that skill routes here. Listeners that react
to an event, the copies of foreign events and external side effects. The rules every use case
follows are in `use-cases.md`.

## Rules

### Reaction use cases

`[Fuera de los libros: convención de @archi-code/ddd]`: the books put an event subscriber in the
application layer that calls an application service [IDDD ch. 8]; here the listener **is** the
use case, one class, with no `UseCase` behind it.

- File `application/<action>/<action>-on-<event>.ts` (in a read model,
  `application/<read-model>/<action>/<action>-on-<event>.ts`), class `<Action>On<Event>`, where
  `<Event>` is the event class name without `DomainEvent`. One event per class, and one class per
  reaction, also when several events feed one read model.
- It extends `EventListener<<Event>DomainEvent>` and is decorated with
  `@ListensTo(<Event>DomainEvent, { consumer: '<context>.<action>-on-<event>' })`: the consumer
  is its identity in the channel (its queue in a broker), the context plus the file name without
  `.ts`, a stable literal unique in the system, never derived from the class name, which minifiers
  change. The event class is the local copy of another context's event, or the context's own event
  (read models, reactions inside the context).
- Constructor as a user use case, with the same parameters in the same order (the constructor
  rule of `use-cases.md`); a read-model reaction receives only its projection.
- `async handle(event)`, in this order: (1) `const { a, b } = ValueObjectBuilder.build({ a: () =>
  new A(event.a), … })`; (2) a derived id (`PaymentId.forOrder(orderReference)`); (3a) to create:
  `if ((await repo.findById(id)) !== null) { return; }` then `<Aggregate>.create(...)`; (3b) to
  change: `const x = await repo.findById(id); if (x === null) { return; }`; (4) the reaction
  method, which returns silently when it does not apply; (5) `save` once and
  `publish(x.pullDomainEvents())`; (6) log if needed, only when the method recorded events.
- **Facts may arrive in any order between aggregates**: the reaction to a closing fact
  (cancelled, voided) that finds no aggregate under the derived id creates it already closed
  (`found ?? Payment.createVoided(id, …)`), so the creating reaction that arrives later finds the
  id taken and returns. Do it only when the producer can emit both facts for the same aggregate
  (check its states: if a completed appointment can never be cancelled, a cancellation with no
  invoice just returns). A fact is never lost because of its order.
- It never checks authorization, throws `AggregateNotFoundException` nor a business error (the
  channel would redeliver it forever), calls a use case or another reaction, handles HTTP nor
  catches errors. There is no `UseCase` wrapper: `DomainEventBus` logs a failure (`warn` for
  domain and application exceptions, `error` otherwise) and rethrows it to the channel, whose
  redelivery is the retry.
- **Reactions are idempotent**: delivery is at least once. Creating checks that the derived id is
  not taken, changing relies on the reaction method returning when the fact is already applied,
  an external effect relies on the aggregate's `awaits…(key)` and the gateway's idempotency key,
  and a projection skips an `eventId` it already applied.

### Events between contexts

- A context never imports another context's event class. For each event of another context it
  reacts to, the consumer declares **one copy per foreign event and context**:
  `application/<action>/<event>-domain-event.ts` in the folder of the first reaction that hears it,
  with the same class name and `eventName` as the producer and the union of the fields its
  reactions read, written like a domain event (inline types, `EventMetadata`). Every other reaction
  of the context imports that copy, and `registry()` registers it once (`EventRegistry` refuses an
  `eventName` twice).
- Plain shapes the application receives (`MoneyData`, `AddressData`) are `export interface` in
  kebab-case files in the folder of the use case that first needs them; the rest of the context
  imports them from there. They never live in `domain/` and are never shared between contexts.
  The nested objects of a foreign event are data types too, named after the event
  (`PaidOrderAddress`, `PaidOrderItem` in `prepare-shipment/paid-order-address.ts` and
  `paid-order-item.ts`): the event copy still writes its field types inline, and the registry
  factory casts with them (`address: json.address as PaidOrderAddress`,
  `items: json.items as PaidOrderItem[]`), never with `Event['field']`. The context's own events
  (registered for its read model) are cast with the data types the context already has
  (`total: json.total as MoneyData`, `address: json.address as AddressData`) and with an inline
  shape for the rest (`items: json.items as { sku: string; quantity: number }[]`): no new data
  type is created only for the registry.
- Every port is an application port: an interface next to its first use case
  (`application/<action>/<port>.ts`), implemented in `infrastructure`, whether it gives data only
  the use case needs (`PetOwnerships` for authorization) or reaches another system
  (`PaymentGateway`). There are no domain ports: the domain never declares an interface for
  another layer to implement, only the abstract repository of each aggregate
  (`domain-services.md`).
- An event whose data no value object accepts makes `ValueObjectBuilder.build` throw a
  `ValidationException` in the reaction: it is not caught; `DomainEventBus` logs it and the
  channel keeps it as an undeliverable message (a dead-letter queue in a broker).
- The event's JSON is the contract between contexts: never change its data incompatibly under
  the same `eventName`. When the events leave the system (a broker shared with other teams), the
  adapter that talks to the broker translates them to a published, versioned contract
  (`messageId` = `eventId`) [IDDD ch. 13].

## Code

### Reaction use case

The listener is the use case. The copy of the other context's event,
`application/request-payment/order-created-domain-event.ts` (same class name and `eventName` as
the producer, the union of the fields the reactions of this context read; one copy per context):

```ts
import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class OrderCreatedDomainEvent extends EventBase {
  static readonly eventName = 'order.created';

  readonly orderId: string;
  readonly total: { amount: number; currency: string };
  readonly paymentMethod: string;

  constructor({
    orderId,
    total,
    paymentMethod,
    eventId,
    occurredOn,
  }: {
    orderId: string;
    total: { amount: number; currency: string };
    paymentMethod: string;
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.orderId = orderId;
    this.total = total;
    this.paymentMethod = paymentMethod;
  }
}
```

Creating, `application/request-payment/request-payment-on-order-created.ts`: the derived id makes
a redelivery a no-op:

```ts
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus } from '@archi-code/ddd/application';

@ListensTo(OrderCreatedDomainEvent, { consumer: 'payments.request-payment-on-order-created' })
export class RequestPaymentOnOrderCreated extends EventListener<OrderCreatedDomainEvent> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  async handle(event: OrderCreatedDomainEvent): Promise<void> {
    const { orderReference, amount, method } = ValueObjectBuilder.build({
      orderReference: () => new OrderReference(event.orderId),
      amount: () => Money.fromPrimitives(event.total as { amount: number; currency: Currency }),
      method: () => new PaymentMethodType(event.paymentMethod as PaymentMethod),
    });
    const paymentId = PaymentId.forOrder(orderReference);
    if ((await this.payments.findById(paymentId)) !== null) {
      return;
    }
    const payment = Payment.create(paymentId, orderReference, amount, method);
    payment.process();
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
```

Changing, `application/cancel-unpaid-order/cancel-unpaid-order-on-payment-rejected.ts`: a
missing aggregate returns, the reaction method returns when the fact does not apply, and the
business trace is logged after publishing, only when the method recorded events:

```ts
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { EventBus, Logger } from '@archi-code/ddd/application';

@ListensTo(PaymentRejectedDomainEvent, {
  consumer: 'sales.cancel-unpaid-order-on-payment-rejected',
})
export class CancelUnpaidOrderOnPaymentRejected extends EventListener<PaymentRejectedDomainEvent> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventBus,
    private readonly logger: Logger,
  ) {
    super();
  }

  async handle(event: PaymentRejectedDomainEvent): Promise<void> {
    const { orderId, reason } = ValueObjectBuilder.build({
      orderId: () => new OrderId(event.orderId),
      reason: () => new RejectionReason(event.reason),
    });
    const order = await this.orders.findById(orderId);
    if (order === null) {
      return;
    }
    order.cancelForRejectedPayment(reason);
    await this.orders.save(order);
    const events = order.pullDomainEvents();
    await this.events.publish(events);
    if (events.length > 0) {
      this.logger.info('order_cancelled_for_rejected_payment', {
        orderId: orderId.value,
        reason: reason.value,
      });
    }
  }
}
```

Order-independent, `application/settle-cancelled-order-payment/settle-cancelled-order-payment-on-order-cancelled.ts`:
the cancellation may arrive before the payment exists, so it creates it already voided under the
derived id (the creating reaction that arrives later finds the id taken and returns):

```ts
@ListensTo(OrderCancelledDomainEvent, {
  consumer: 'payments.settle-cancelled-order-payment-on-order-cancelled',
})
export class SettleCancelledOrderPaymentOnOrderCancelled extends EventListener<OrderCancelledDomainEvent> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  async handle(event: OrderCancelledDomainEvent): Promise<void> {
    const { orderReference, amount, method } = ValueObjectBuilder.build({
      orderReference: () => new OrderReference(event.orderId),
      amount: () => Money.fromPrimitives(event.total as { amount: number; currency: Currency }),
      method: () => new PaymentMethodType(event.paymentMethod as PaymentMethod),
    });
    const paymentId = PaymentId.forOrder(orderReference);
    const found = await this.payments.findById(paymentId);
    const payment = found ?? Payment.createVoided(paymentId, orderReference, amount, method);
    payment.settleForCancelledOrder();
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
```

### External side effect

The user use case only records the intent and saves; a reaction to that event calls the application
port directly with the `eventId` that asked as idempotency key and records the outcome. The
aggregate keeps the key of the attempt in progress (`ChargeKey extends UuidType`, optional):

```ts
// inside Invoice
  requestPayment(requester: StudentReference, offered: Money): void {
    this.assertOwnedBy(requester);
    if (!this.isIn(InvoiceStatus.OPEN) && !this.isIn(InvoiceStatus.PAYMENT_DECLINED)) {
      throw new InvoiceNotPayable(this.id.value, this._status.value);
    }
    if (!offered.equals(this.amount)) {
      throw new PaymentAmountMismatch(this.id.value);
    }
    const requested = new InvoicePaymentRequestedDomainEvent({
      invoiceId: this.id.value,
      amount: this.amount.toPrimitives(),
    });
    this._chargeKey = new ChargeKey(requested.eventId);
    this.moveTo(InvoiceStatus.PAYMENT_REQUESTED);
    this.record(requested);
  }

  awaitsCharge(key: ChargeKey): boolean {
    return this.isIn(InvoiceStatus.PAYMENT_REQUESTED) && this._chargeKey.equals(key);
  }

  settleCharge(key: ChargeKey, outcome: ChargeOutcome): void {
    if (!this.awaitsCharge(key)) {
      return;
    }
    if (outcome.chargeId.isNull) {
      this.moveTo(InvoiceStatus.PAYMENT_DECLINED);
      this.record(/* InvoicePaymentDeclinedDomainEvent with outcome.declineReason.value */);
    } else {
      this._chargeId = outcome.chargeId;
      this.moveTo(InvoiceStatus.PAID);
      this.record(/* InvoicePaidDomainEvent */);
    }
  }
```

The application port, `application/charge-invoice/payment-gateway.ts` (the card token stays behind it, never in the
aggregate nor the event):

```ts
export interface PaymentGateway {
  charge(key: ChargeKey, student: StudentReference, amount: Money): Promise<ChargeOutcome>;
}
```

The reaction, `application/charge-invoice/charge-invoice-on-invoice-payment-requested.ts`:

```ts
@ListensTo(InvoicePaymentRequestedDomainEvent, {
  consumer: 'billing.charge-invoice-on-invoice-payment-requested',
})
export class ChargeInvoiceOnInvoicePaymentRequested extends EventListener<InvoicePaymentRequestedDomainEvent> {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly gateway: PaymentGateway,
    private readonly events: EventBus,
  ) {
    super();
  }

  async handle(event: InvoicePaymentRequestedDomainEvent): Promise<void> {
    const { invoiceId, key } = ValueObjectBuilder.build({
      invoiceId: () => new InvoiceId(event.invoiceId),
      key: () => new ChargeKey(event.eventId),
    });
    const invoice = await this.invoices.findById(invoiceId);
    if (invoice === null || !invoice.awaitsCharge(key)) {
      return;
    }
    const outcome = await this.gateway.charge(key, invoice.student, invoice.amount);
    invoice.settleCharge(key, outcome);
    await this.invoices.save(invoice);
    await this.events.publish(invoice.pullDomainEvents());
  }
}
```

A retry of a declined payment is a new `requestPayment`, a new event and so a new key; a refund
has its own event and key. The repository writes `invoice.payment_requested` to an outbox when it
must not be lost.

## What not to do

- A listener that calls a `UseCase`, or a `UseCase` class next to a listener for the same
  reaction: the reaction use case is the listener, one class whose `handle` builds the value
  objects, decides and saves.
- A reaction without `@ListensTo`, decorated with two events, or with a consumer that is not
  `'<context>.<file name without .ts>'`: taken from the class (`this.name`), shared by two
  reactions or renamed casually (it is its queue in a broker).
- A reaction that checks authorization, throws `AggregateNotFoundException` or a business error,
  catches errors or retries: it returns when the aggregate is missing or the fact does not apply,
  and the channel's redelivery is its retry.
- A reaction that creates without checking that the derived id is free: a redelivery would
  create a second aggregate or a conflict.
- A reaction to a closing fact (cancelled) that returns when the aggregate does not exist yet,
  although the producer can emit both facts: it creates it already closed under the derived id.
- Subscribing reactions by a text name or calling them from a use case: the composition root
  subscribes them with `bus.subscribe(listener)`.
- An external side effect (gateway charge, email) before `save` in a user use case: record the
  intent, and a reaction runs the effect with an idempotency key and records the outcome.
- An idempotency key that is the aggregate id for a repeatable effect (a retried declined charge
  replays the decline) or shared by two effects (charge and refund): one key per attempt and
  effect, the `eventId` that asked for it.
- A secret (card token) stored in the aggregate or carried by an event: a port keeps it under a
  reference.
- Importing the producer's event class in a consumer context, or two copies of the same foreign
  event in one context: one copy per event and context, next to its first reaction, with the
  union of the fields its reactions read, registered once.
- Changing the data of a published event incompatibly under the same `eventName` when no factory
  can read both shapes: publish a new event instead.
