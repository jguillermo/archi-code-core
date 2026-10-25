# Online shop: an end-to-end example of @archi-code/ddd

An academic example of `@archi-code/ddd` in a small online shop with three
bounded contexts (Sales, Payments and Shipping) that only talk through domain events. Everything runs
in memory: repositories, the event channel, the read model and the HTTP entry points (simulated
controllers that return `{ status, body }`).

It lives in the package's `example/` folder, which is not published to npm. It is only code: it
has no specs and no command line, and the package's `check:types` type-checks it
(`tsc -p example/tsconfig.json`).

## Context map

```
                 order.created ─────────────────► Payments
   Sales  ◄───── payment.captured / payment.rejected
          ───── order.line_quantity_changed ──► Payments (adjusts a waiting transfer)
          ───── order.cancelled ──────────────► Payments (refund or void)
          ───── order.paid ───────────────────► Shipping
          ───── order.cancelled ──────────────► Shipping (cancel while preparing)
          ◄───── shipment.dispatched / shipment.delivered
```

- One `InMemoryEventChannel({ delivery: 'serial' })` is shared by the three contexts (`src/shop.ts`);
  each context has its own `DomainEventBus` and `EventRegistry` (`src/contexts/<context>/composition.ts`).
- Published events are named `'<aggregate>.<past_action>'` (`'order.created'`). A context never
  imports another one: the consumer declares its own class for each event it reads, with the same
  class name, the same `eventName` and only the fields it needs (published language, tolerant
  reader). For example `payments/application/request-payment/order-created-domain-event.ts` reads
  only `orderId`, `total` and `paymentMethod` of `order.created`.
- `contexts/shared-kernel/money` (`Money`, `Cents`, `CentsAmount`, `MoneyCurrency`,
  `CurrencyMismatch`) is the only code two contexts share.
- `platform/http/http.ts` is the technical helper every controller uses to translate errors with
  `ExceptionClassifier`; it holds no business rule.

## How the domain is written

These rules apply to every `src/contexts/<context>/domain/` folder. They describe what each kind of
class is, where its file goes, what it extends, what it may and may not contain and how it is
created. Every example is copied from a file of this example.

### Folders and files

Each `domain/` is split by kind of class, with no folder per module (each context has one
aggregate):

| Folder           | What goes in it                                                                   | In the example                                                                            |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `aggregate/`     | the aggregate root and the shape its `create` receives                            | `Order`, `NewOrderLine`, `Payment`, `Shipment`                                            |
| `entity/`        | child entities of an aggregate                                                    | `OrderLine`                                                                               |
| `value-object/`  | ids, simple value objects, enums, lists, composites and the shape of a `JsonType` | `OrderId`, `Sku`, `OrderStatusType`, `CouponCodes`, `ShippingAddress`, `CarrierLabelData` |
| `event/`         | the domain events and the union of the events of the aggregate                    | `OrderCreatedDomainEvent`, `OrderEvent`                                                   |
| `service/`       | domain services and the ports (interfaces) they use                               | `OrderPricing`, `CouponCatalog`                                                           |
| `exception/`     | business errors                                                                   | `OrderNotModifiable`, `UnknownCoupon`                                                     |
| `specification/` | specifications                                                                    | `FreeShippingEligible`, `SubtotalAtLeast`, `ContainsSku`                                  |

- One class per file. The file has the name of the class in PascalCase (`Order.ts`,
  `OrderNotModifiable.ts`, `OrderCreatedDomainEvent.ts`).
- The one exception is an enum, which lives in one file with its two classes (see
  [Enums](#enums)).
- `shared-kernel/money` (`Money`, `Cents`, `CentsAmount`, `MoneyCurrency`, `CurrencyMismatch`) is the
  only code two contexts share and keeps no subfolders.
- Code outside `domain/` (`application/`, `infrastructure/`, `interfaces/`) keeps kebab-case file
  names (`confirm-transfer-received.ts`).

### Aggregates

- **Folder and name**: `aggregate/<Aggregate>.ts` (`aggregate/Payment.ts`).
- **Extends**: `AggregateRoot<Id, Event>`, where `Id` is the id value object and `Event` the union
  of its events (`AggregateRoot<PaymentId, PaymentEvent>`).
- **Contains** only business logic, in this order:
  1. A local `interface Clock { now(): Date }`; the aggregate never imports the application port.
  2. Its business constants as `private static readonly` (`LIMIT_CENTS`, `MAX_LINES`).
  3. Its fields, declared at the top: `readonly` for what never changes, `private _field` for what
     changes (with a getter of the same name without `_`). Every field is a value object, a list
     of them, a child entity or a composite. `createdAt` (`readonly`) and `_updatedAt` go last.
  4. A **public constructor** that receives every value object already built (the id first) and
     only assigns them. It checks nothing and records nothing. `fromPrimitives` uses it too.
  5. `static create(...)`, see below.
  6. `static fromPrimitives(primitives: PrimitiveTypes<X>)` and `toPrimitives()`, written by hand:
     the aggregate is the only owner of its conversion.
  7. Getters of the mutable fields.
  8. Business methods (each change of state), then private helpers (`moveTo`, `touch`, `assert…`).
- **Does not contain**: ids computed from other data (the use case computes them, see
  [Use cases](#use-cases)), repositories,
  the event bus, loggers, HTTP or any other technical concern.

```ts
export class Payment extends AggregateRoot<PaymentId, PaymentEvent> {
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
```

#### `create`

`static create(id, ...valueObjects, clock)` builds a new aggregate and does only this:

1. Receives the id and the value objects of the new aggregate already built, and the clock last.
2. Sets the initial state (status, empty optional values, `CreatedAt.now(clock)`,
   `UpdatedAt.now(clock)`) and calls the constructor.
3. Checks the invariants of a new aggregate and throws its business error when one fails
   (`Order.create` checks 1 to 20 lines, no repeated SKU and the total).
4. Records `<Aggregate>CreatedDomainEvent` and returns the aggregate.

It does not take business decisions after the creation: those are business methods. When
`create` receives the parts of child entities, it builds them itself (`Order.create` numbers the
lines with `LineNumber`):

```ts
const order = new Order(
  id,
  customerId,
  lines.map(
    (line, index) =>
      new OrderLine(new LineNumber(index + 1), line.sku, line.quantity, line.unitPrice),
  ),
  new OrderStatusType(OrderStatus.PENDING_PAYMENT),
  // ...
  CreatedAt.now(clock),
  UpdatedAt.now(clock),
);
order.assertDistinctSkus();
order.assertTotal();
```

```ts
  static create(
    id: PaymentId,
    orderReference: OrderReference,
    amount: Money,
    method: PaymentMethodType,
    clock: Clock,
  ): Payment {
    const payment = new Payment(
      id,
      orderReference,
      amount,
      method,
      new PaymentStatusType(PaymentStatus.PENDING),
      new RejectionCodeType(null),
      CreatedAt.now(clock),
      UpdatedAt.now(clock),
    );

    payment.record(
      new PaymentCreatedDomainEvent({
        paymentId: payment.id.value,
        orderId: payment.orderReference.value,
        amount: payment._amount.toPrimitives(),
        method: payment.method.value,
        clock,
      }),
    );

    return payment;
  }
```

#### Business methods

- Every change of the aggregate is a method named after the business action (`process`,
  `confirmTransfer`, `cancel`, `markShipped`). It receives value objects and the clock, changes the
  fields, updates `_updatedAt` and may record one or more events.
- A method that a **user asks for** (`cancel`, `confirmTransfer`, `dispatch`, `deliver`,
  `changeLineQuantity`, `changeShippingAddress`) throws its business error when it does not apply
  in the current state.
- A method that **reacts to an event** of another context (`markPaid`, `cancelForRejectedPayment`,
  `markShipped`, `markDelivered`, `adjustAmount`, `settleForCancelledOrder`,
  `cancelForCancelledOrder`) returns without doing anything when it does not apply: the event is a
  fact and may arrive twice.
- `Payment` starts as `pending`; `process(clock)` decides: over the limit of its method it is
  rejected, a card is captured, a transfer waits for the money.

```ts
  process(clock: Clock): void {
    if (this._status.value !== PaymentStatus.PENDING) {
      return;
    }
    if (this.exceedsLimit()) {
      this.reject(RejectionCode.LIMIT_EXCEEDED, clock);
    } else if (this.method.value === PaymentMethod.CARD) {
      this.capture(clock);
    } else {
      this.awaitTransfer(clock);
    }
  }
```

```ts
  cancel(requester: CustomerId, clock: Clock): void {
    if (!requester.equals(this.customerId)) {
      throw new OrderOwnedByAnotherCustomer(this.id.value);
    }
    if (!this.isIn(OrderStatus.PENDING_PAYMENT) && !this.isIn(OrderStatus.PAID)) {
      throw new OrderNotCancellable(this.id.value, this._status.value);
    }
    const wasPaid = this.isIn(OrderStatus.PAID);
    this.moveTo(OrderStatus.CANCELLED, clock);
    this.record(
      new OrderCancelledDomainEvent({
        orderId: this.id.value,
        reason: 'cancelled_by_customer',
        wasPaid,
        clock,
      }),
    );
  }

  markShipped(trackingNumber: CarrierTrackingNumber, clock: Clock): void {
    if (!this.isIn(OrderStatus.PAID)) {
      return;
    }
    this.moveTo(OrderStatus.SHIPPED, clock);
    this.record(
      new OrderShippedDomainEvent({
        orderId: this.id.value,
        trackingNumber: trackingNumber.value,
        clock,
      }),
    );
  }
```

#### `fromPrimitives` and `toPrimitives`

The aggregate converts itself and its children; repositories only call these two methods.

- `PrimitiveTypes<X>` gives the shape: each value object becomes its value (an enum its option), a
  composite its primitives, a child entity an object with its `id` and fields.
- `toPrimitives()` reads every field: `.value` of each value object, `.toPrimitives()` of each
  composite, and maps each child entity by hand (the entity has no conversion of its own).
- `static fromPrimitives(primitives)` rebuilds every value object with its constructor (or the
  composite's `fromPrimitives`), rebuilds each child entity with its constructor and calls the
  aggregate constructor. It records no event and checks no invariant: the data was valid when saved.
- Every field goes both ways, `createdAt` and `updatedAt` included, so a round trip gives an equal
  aggregate.

```ts
  static fromPrimitives(primitives: PrimitiveTypes<Order>): Order {
    return new Order(
      new OrderId(primitives.id),
      new CustomerId(primitives.customerId),
      primitives.lines.map(
        (line) =>
          new OrderLine(
            new LineNumber(line.id),
            new Sku(line.sku),
            new Quantity(line.quantity),
            Money.fromPrimitives(line.unitPrice),
          ),
      ),
      new OrderStatusType(primitives.status),
      ShippingAddress.fromPrimitives(primitives.shippingAddress),
      new CouponCodes(primitives.couponCodes),
      new GiftWrap(primitives.giftWrap),
      new PaymentMethodType(primitives.paymentMethod),
      new DiscountPercent(primitives.discount),
      new PaymentReference(primitives.paymentReference),
      new CreatedAt(primitives.createdAt),
      new UpdatedAt(primitives.updatedAt),
    );
  }
```

```ts
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
      shippingAddress: this._shippingAddress.toPrimitives(),
      couponCodes: this.couponCodes.value,
      giftWrap: this.giftWrap.value,
      paymentMethod: this.paymentMethod.value,
      discount: this.discount.value,
      paymentReference: this._paymentReference.value,
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }
```

#### Private helpers

State changes go through `moveTo` and `touch`, and invariants through `assert…` methods that throw
the business error:

```ts
  private assertPendingPayment(): void {
    if (!this.isIn(OrderStatus.PENDING_PAYMENT)) {
      throw new OrderNotModifiable(this.id.value, this._status.value);
    }
  }

  private moveTo(status: OrderStatus, clock: Clock): void {
    this._status = new OrderStatusType(status);
    this.touch(clock);
  }

  private touch(clock: Clock): void {
    this._updatedAt = UpdatedAt.now(clock);
  }
```

#### The shape `create` receives

When `create` receives parts that the aggregate turns into child entities, their shape is an
interface of value objects in `aggregate/` (`Order.create` numbers the lines itself):

```ts
import type { Money } from '../../../shared-kernel/money/Money';
import type { Quantity } from '../value-object/Quantity';
import type { Sku } from '../value-object/Sku';

export interface NewOrderLine {
  sku: Sku;
  quantity: Quantity;
  unitPrice: Money;
}
```

### Child entities

- **Folder and name**: `entity/<Entity>.ts` (`entity/OrderLine.ts`).
- **Extends**: `Entity<Id>`; its id is a value object (`LineNumber`).
- **Contains**: its fields declared at the top (`readonly` or `private _field` with a getter), a
  constructor that receives value objects already built and assigns them, and business methods
  that only its aggregate calls. No setters.
- **Does not contain**: events (only the aggregate records events), `create`, conversion to
  primitives (the aggregate converts its children).
- **Created by**: its aggregate (`Order.create` and `Order.fromPrimitives`).

```ts
import { Entity } from '../../../../ddd/domain';
import type { Money } from '../../../shared-kernel/money/Money';
import type { LineNumber } from '../value-object/LineNumber';
import type { Quantity } from '../value-object/Quantity';
import type { Sku } from '../value-object/Sku';

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
```

### Value objects

All live in `value-object/`, one class per file, and are always valid: the constructor converts
the input, applies `Required` and runs every `@Validations` rule, and throws `ValidationException`
otherwise. Rules are declared with `@Validations` from `@archi-code/validation`, each with an
English `message` when the validator's own is not clear enough.

#### Simple value objects

- **Extends**: `Required(<Type>)` when the value is mandatory (`Sku`, `Quantity`, `GiftWrap`,
  `ExpectedDelivery`), or the bare type when it may be empty (`TrackingNumber`,
  `PaymentReference`), built with `null` for "no value".
- Types: `StringType`, `NumberType`, `BooleanType`, `DateType`, `UuidType`, `JsonType`.

```ts
import { Validations } from '@archi-code/validation';
import { Required, StringType } from '../../../../ddd/domain';

@Validations([
  {
    validator: 'matches',
    properties: { pattern: /^[A-Z0-9-]{3,20}$/ },
    message: 'A SKU has 3 to 20 capital letters, digits or dashes',
  },
])
export class Sku extends Required(StringType) {}
```

```ts
import { Validations } from '@archi-code/validation';
import { StringType } from '../../../../ddd/domain';

@Validations([
  {
    validator: 'matches',
    properties: { pattern: /^[A-Z]{2}\d{9}[A-Z]{2}$/ },
    message: 'A tracking number looks like AB123456789ES',
  },
])
export class TrackingNumber extends StringType {}
```

#### Custom types

When no type of the package converts the value as needed, a value object extends
`AbstractType<T>` and implements `protected filter(value: unknown): T`. `filter` converts the input
and throws `TypePrimitiveException` when it cannot; empty input never reaches it. Its `Required`
class goes in another file, like a list (`CentsAmount` → `Cents`):

```ts
import { AbstractType, TypePrimitiveException } from '../../../ddd/domain';

export class CentsAmount extends AbstractType<number> {
  protected filter(value: unknown): number {
    const cents = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (typeof cents !== 'number' || !Number.isSafeInteger(cents) || cents < 0) {
      throw new TypePrimitiveException('amount in cents', value);
    }
    return cents;
  }
}
```

```ts
import { Required } from '../../../ddd/domain';
import { CentsAmount } from './CentsAmount';

export class Cents extends Required(CentsAmount) {}
```

#### Ids

- **Extends**: `IdType<'<ClassName>'>`; the brand makes ids of different aggregates not
  interchangeable at compile time.
- An id computed from other data is a `static` method of the id (`PaymentId.forOrder`,
  `ShipmentId.forOrder`): one payment and one shipment per order. A reference to an aggregate of
  another context is a `Required(UuidType)` (`OrderReference`).

```ts
import { IdType } from '../../../../ddd/domain';

export class OrderId extends IdType<'OrderId'> {}
```

```ts
import { IdType, UuidType } from '../../../../ddd/domain';
import type { OrderReference } from './OrderReference';

export class PaymentId extends IdType<'PaymentId'> {
  static forOrder(order: OrderReference): PaymentId {
    return new PaymentId(UuidType.fromValue(`payment-of-order:${order.value}`));
  }
}
```

#### Enums

One file named after the `Required` class (`OrderStatusType.ts`, `PaymentMethodType.ts`,
`MoneyCurrency.ts`) holds the TypeScript `enum`, its `<Enum>Option extends EnumType<Enum>` (with
`getEnum()`) and `<Enum>Type extends Required(<Enum>Option)`. An optional enum has no `Required`
class and its file is named after the `EnumType` (`RejectionCodeType.ts`).

```ts
import { EnumType, Required } from '../../../../ddd/domain';

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export class OrderStatusOption extends EnumType<OrderStatus> {
  protected getEnum(): typeof OrderStatus {
    return OrderStatus;
  }
}

export class OrderStatusType extends Required(OrderStatusOption) {}
```

#### Lists

A list is an `ArrayType<Item>` with `createItem` and its list rules (`custom` validations over the
whole list), plus its `Required` class in another file:

```ts
import { Validations } from '@archi-code/validation';
import { ArrayType } from '../../../../ddd/domain';
import { CouponCode } from './CouponCode';

@Validations([
  {
    custom: 'atMostThreeCoupons',
    fn: (codes) => (codes as string[]).length <= 3,
    message: 'An order takes at most 3 coupons',
  },
  {
    custom: 'noRepeatedCoupons',
    fn: (codes) => new Set(codes as string[]).size === (codes as string[]).length,
    message: 'A coupon is applied only once',
  },
])
export class CouponCodeList extends ArrayType<CouponCode> {
  protected createItem(value: unknown): CouponCode {
    return new CouponCode(value as string);
  }
}
```

```ts
import { Required } from '../../../../ddd/domain';
import { CouponCodeList } from './CouponCodeList';

export class CouponCodes extends Required(CouponCodeList) {}
```

#### Composites

A value object of several fields is a composite, and it is a value object: it lives in
`value-object/`. It extends `Composite({ field: ValueObjectClass })`; a field may be another
composite (`recipient: Recipient`) or a list (`items: [ShipmentItem]`). Rules over several fields
are `custom` validations that receive the built composite (`ShipmentContents` needs one item at
least). It may have behavior that returns new instances (`Money.add`, `Money.lessPercent`).

```ts
import { Composite } from '../../../../ddd/domain';
import { City } from './City';
import { CountryCode } from './CountryCode';
import { PostalCode } from './PostalCode';
import { Recipient } from './Recipient';
import { Street } from './Street';

export class ShippingAddress extends Composite({
  recipient: Recipient,
  street: Street,
  city: City,
  postalCode: PostalCode,
  country: CountryCode,
}) {}
```

A composite with behavior adds methods that return a new instance and never change its fields.
Its business errors live with it (`CurrencyMismatch`):

```ts
export class Money extends Composite({ amount: Cents, currency: MoneyCurrency }) {
  static zero(currency: Currency): Money {
    return new Money({ amount: new Cents(0), currency: new MoneyCurrency(currency) });
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return this.withAmount(this.amount.value + other.amount.value);
  }

  private assertSameCurrency(other: Money): void {
    if (!this.currency.equals(other.currency)) {
      throw new CurrencyMismatch(this.currency.value, other.currency.value);
    }
  }

  private withAmount(cents: number): Money {
    return new Money({ amount: new Cents(cents), currency: this.currency });
  }
}
```

A composite is built with `new X({ field: valueObject })` when the value objects are already
built, and with `X.fromPrimitives(data)` from plain data (it reports every field with its path).

#### JSON values

A free-form object that the domain stores as it is is a `JsonType`. A JSON value is never a
composite: a composite is a value object made of value objects, a JSON value a plain object. Three
files in `value-object/`: the shape (an interface that extends `JsonTypeValue`), the `JsonType` and
its `Required` class:

```ts
import type { JsonTypeValue } from '../../../../ddd/domain';

export interface CarrierLabelData extends JsonTypeValue {
  carrier: string;
  service: 'standard' | 'gift';
  country: string;
  units: number;
}
```

```ts
import { JsonType } from '../../../../ddd/domain';
import type { CarrierLabelData } from './CarrierLabelData';

export class CarrierLabelJson extends JsonType<CarrierLabelData> {}
```

```ts
import { Required } from '../../../../ddd/domain';
import { CarrierLabelJson } from './CarrierLabelJson';

export class CarrierLabel extends Required(CarrierLabelJson) {}
```

The aggregate builds it from its own value objects (`Shipment.create`):

```ts
      new CarrierLabel({
        carrier: carrier.value,
        service: giftWrap.value ? 'gift' : 'standard',
        country: address.country.value,
        units: contents.units(),
      }),
```

### Domain events

- **Folder and name**: `event/<Aggregate><PastAction>DomainEvent.ts`
  (`event/ShipmentDeliveredDomainEvent.ts`). The creation event is
  `<Aggregate>CreatedDomainEvent`.
- **Extends**: `EventBase`.
- **`eventName`**: `static readonly eventName = '<aggregate>.<past_action>'`, in snake_case
  (`'order.created'`, `'order.line_quantity_changed'`, `'payment.awaiting_transfer'`).
- **Contains only primitive data**: `string`, `number`, `boolean`, and objects or lists of them.
  The id of the aggregate is a field of its own (`orderId`, `paymentId`, `shipmentId`).
- **No types**: the event declares no interface or type of its own and imports none. Its fields are
  declared on the class, and the constructor receives one object typed inline (the field types
  written in place) joined with `EventMetadata`. It passes `eventId`, `occurredOn` and `clock` to
  `super` and assigns the rest one by one.
- **Created by**: its aggregate, with `this.record(new …DomainEvent({ ..., clock }))`, taking the
  primitives from the value objects (`.value`, `.toPrimitives()`).
- `event/<Aggregate>Event.ts` holds the union of every event of the aggregate, which types
  `AggregateRoot<Id, Event>` and the `EventBus` of its use cases.

```ts
import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class ShipmentDeliveredDomainEvent extends EventBase {
  static readonly eventName = 'shipment.delivered';

  readonly shipmentId: string;
  readonly orderId: string;

  constructor({
    shipmentId,
    orderId,
    eventId,
    occurredOn,
    clock,
  }: { shipmentId: string; orderId: string } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.shipmentId = shipmentId;
    this.orderId = orderId;
  }
}
```

```ts
import type { PaymentAmountAdjustedDomainEvent } from './PaymentAmountAdjustedDomainEvent';
import type { PaymentAwaitingTransferDomainEvent } from './PaymentAwaitingTransferDomainEvent';
import type { PaymentCapturedDomainEvent } from './PaymentCapturedDomainEvent';
import type { PaymentCreatedDomainEvent } from './PaymentCreatedDomainEvent';
import type { PaymentRefundedDomainEvent } from './PaymentRefundedDomainEvent';
import type { PaymentRejectedDomainEvent } from './PaymentRejectedDomainEvent';
import type { PaymentVoidedDomainEvent } from './PaymentVoidedDomainEvent';

export type PaymentEvent =
  | PaymentCreatedDomainEvent
  | PaymentCapturedDomainEvent
  | PaymentRejectedDomainEvent
  | PaymentAwaitingTransferDomainEvent
  | PaymentAmountAdjustedDomainEvent
  | PaymentRefundedDomainEvent
  | PaymentVoidedDomainEvent;
```

### Business errors

- **Folder and name**: `exception/<WhatWentWrong>.ts`, without an `Exception` suffix
  (`OrderNotModifiable`, `DuplicateSku`, `TrackingNumberMissing`, `CurrencyMismatch`).
- **Extends**: `DomainException`.
- **Contains**: only a constructor that receives the data of the message and passes an English
  message and its code: `SAL###` (Sales), `PAY###` (Payments), `SHP###` (Shipping), `MNY###`
  (money).
- **Thrown by**: the aggregate, a domain service or a value object of the same context.

```ts
import { DomainException } from '../../../../ddd/domain';

export class OrderNotModifiable extends DomainException {
  constructor(orderId: string, status: string) {
    super(`Order ${orderId} is ${status} and can no longer change`, ['SAL004']);
  }
}
```

### Specifications

- **Folder and name**: `specification/<Rule>.ts` (`SubtotalAtLeast`, `ContainsSku`,
  `FreeShippingEligible`).
- **Extends**: `Specification<Aggregate>` and implements `isSatisfiedBy`. Specifications combine
  with `and`, `or` and `not`.
- **Receives** data that is already loaded (the aggregate), never a repository. It answers a
  question; it never guards an invariant of the aggregate.

```ts
import { Specification } from '../../../../ddd/domain';
import type { Order } from '../aggregate/Order';

export class SubtotalAtLeast extends Specification<Order> {
  constructor(private readonly cents: number) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.subtotal().isAtLeast(this.cents);
  }
}
```

A rule made of other specifications keeps the combination in a private field and delegates to it:

```ts
export class FreeShippingEligible extends Specification<Order> {
  private readonly rule = new SubtotalAtLeast(5000)
    .or(new ContainsSku(new Sku('PREMIUM-PASS')))
    .and(new ContainsSku(new Sku('GIFT-CARD')).not());

  isSatisfiedBy(order: Order): boolean {
    return this.rule.isSatisfiedBy(order);
  }
}
```

The aggregate uses it to answer a question, never to refuse a change (`Order.create` stores the
answer in its event: `freeShipping: new FreeShippingEligible().isSatisfiedBy(order)`).

### Domain services and ports

- **Folder**: `service/`, for the service and for the port it uses.
- **Service**: a class with a business rule that does not belong to one aggregate
  (`OrderPricing` adds the discounts of the coupons and caps them at 50%). It receives its ports
  by constructor, works with value objects and throws business errors (`UnknownCoupon`).
- **Port**: an `interface` the domain declares and infrastructure implements
  (`CouponCatalog` → `InMemoryCouponCatalog`). It speaks in value objects.
- **Created by**: `composition.ts`, which gives the service the infrastructure that implements the
  port.

```ts
import type { CouponCode } from '../value-object/CouponCode';
import type { DiscountPercent } from '../value-object/DiscountPercent';

export interface CouponCatalog {
  discountOf(code: CouponCode): Promise<DiscountPercent | null>;
}
```

```ts
import type { CouponCodes } from '../value-object/CouponCodes';
import { DiscountPercent } from '../value-object/DiscountPercent';
import type { CouponCatalog } from './CouponCatalog';
import { UnknownCoupon } from '../exception/UnknownCoupon';

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

### What the domain never contains

- No `aggregateId` in events: each event declares the id of its aggregate as a field of its own
  (`orderId`).
- No interfaces or types inside events, and no event data types in `domain/`.
- No `toPrimitives` / `fromPrimitives` in events: an event is its own JSON and `composition.ts`
  rebuilds it.
- No repository interface per aggregate (`OrderRepository`): use cases ask for the roles they use
  (`AggregateFinder<Order>`, `AggregateSaver<Order>`), declared by the package.
- No commands: they belong to the use case (`toCommand`).
- No `ensureX` methods in value objects: rules are `@Validations`.
- No ids computed inside `create`, no repositories, event bus, loggers nor HTTP.

## How the application, infrastructure and interfaces are written

These rules apply to everything of a context outside `domain/`. Every example is copied from a file
of this example.

### Folders and files

| Folder                        | What goes in it                                                                                          | In the example                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `application/<use-case>/`     | one folder per use case a user calls: the use case and its data types                                    | `application/confirm-transfer-received/`       |
| `application/<reaction>/`     | one folder per reaction use case: its one listener class, the copy of the event it hears, its data types | `application/request-payment/`                 |
| `application/<read-model>/`   | a read model: its row type, its ports, its projection and one folder per reaction use case               | `application/order-summaries/`                 |
| `infrastructure/persistence/` | the repository of the aggregate                                                                          | `InMemoryPaymentRepository`                    |
| `infrastructure/<port>/`      | the adapter of a domain or application port                                                              | `coupon/InMemoryCouponCatalog`, `read-model/…` |
| `interfaces/http/`            | the controller of the context                                                                            | `OrdersController`, `PaymentsController`       |
| `composition.ts`              | the wiring of the context: `<Context>Context.start` / `stop`                                             | `SalesContext`, `PaymentsContext`              |

- Files are kebab-case and named after their main export: `confirm-transfer-received.ts`
  (`ConfirmTransferReceived`), `request-payment-on-order-created.ts` (`RequestPaymentOnOrderCreated`),
  `order-created-domain-event.ts`, `money-data.ts`, `in-memory-payment-repository.ts`,
  `payments-controller.ts`.
- One class per file.
- The folder of a use case is named after its business action: `application/confirm-transfer-received/`
  holds `confirm-transfer-received.ts`; `application/request-payment/` holds
  `request-payment-on-order-created.ts`, `order-created-domain-event.ts` and `money-data.ts`.
- Imports follow the layers: `application/` imports `domain/` and `ddd/application`;
  `infrastructure/` imports `domain/`, `application/` and `ddd/infrastructure`; `interfaces/`
  imports `application/` and `platform/`; only `composition.ts` imports everything. Code of another
  context is never imported.

### Use cases

A use case is one business action. Its input comes from one of two places, and that is the only
difference between the two kinds:

| Kind                                     | Input     | Written as                                              | In the example                                                   |
| ---------------------------------------- | --------- | ------------------------------------------------------- | ---------------------------------------------------------------- |
| use case a user calls                    | a request | a `UseCase` class, run by a controller                  | `PlaceOrder`, `ConfirmTransferReceived`, `DispatchShipment`      |
| [reaction use case](#reaction-use-cases) | an event  | one `EventListener` class: the listener is the use case | `RequestPaymentOnOrderCreated`, `MarkOrderPaidOnPaymentCaptured` |

This section describes the use cases a user calls; reaction use cases have their own section.

- **File and name**: `application/<use-case>/<use-case>.ts`, named after the business action
  (`PlaceOrder`, `ConfirmTransferReceived`, `DiscardCancelledOrder`), never CRUD names.
- **Extends**: `UseCase<Input, Command, Output>`. `Output` is `void`, or the id it creates
  (`PlaceOrder` returns the new order id).
- **Declares in the same file**: `interface <UseCase>Input` (primitives: `string`, `number`,
  `boolean`, data types) and `interface <UseCase>Command` (value objects, composites, lists of
  `NewX` shapes).
- **Constructor**: receives by constructor only what `handle` uses, in this order: the repository
  typed with the roles it uses (`AggregateFinder<X> & AggregateSaver<X>`, or only
  `AggregateSaver<X>` when it only creates, `AggregateRemover<X>` when it removes), domain services,
  `EventBus<XEvent>`, `Clock`, `Logger`. Never a concrete repository nor another use case.
- **`toCommand(input)`**: one `ValueObjectBuilder.build({ field: () => … })` with one factory per
  field, so every invalid field is reported at once. Enums are cast to their enum type
  (`input.method as PaymentMethod`); money and other composites use `X.fromPrimitives`; a list of
  shapes uses `ValueObjectBuilder.buildList`, nested in the `build` (errors come as
  `lines.1.quantity`).
- **`handle(command)`**, in this order:
  1. authorization (see below);
  2. generates the id of a new aggregate (`OrderId.generate()`);
  3. calls `<Aggregate>.create(...)`, or loads the aggregate with `findById` and throws
     `AggregateNotFoundException('<Aggregate>', id)` when it is missing;
  4. calls the business methods it needs, with `this.clock`;
  5. saves the aggregate once and publishes `pullDomainEvents()` (or removes it);
  6. returns the output.
- **Does not contain**: business rules (they are in the aggregate or a domain service), checks of
  the shape of the input (the controller does it), transactions, HTTP, another use case.

```ts
import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import {
  AggregateNotFoundException,
  NotAllowedException,
  UseCase,
  ValueObjectBuilder,
} from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import type { Payment } from '../../domain/aggregate/Payment';
import type { MoneyData } from '../request-payment/money-data';
import type { PaymentEvent } from '../../domain/event/PaymentEvent';
import { PaymentId } from '../../domain/value-object/PaymentId';
import { StaffRole } from '../../domain/value-object/StaffRoleType';
import { StaffRoleType } from '../../domain/value-object/StaffRoleType';

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
    private readonly payments: AggregateFinder<Payment> & AggregateSaver<Payment>,
    private readonly events: EventBus<PaymentEvent>,
    private readonly clock: Clock,
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
    payment.confirmTransfer(command.received, this.clock);
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
```

A list of shapes inside `toCommand` (`PlaceOrder`):

```ts
      lines: () =>
        ValueObjectBuilder.buildList(input.lines, (line) =>
          ValueObjectBuilder.build({
            sku: () => new Sku(line.sku),
            quantity: () => new Quantity(line.quantity),
            unitPrice: () =>
              Money.fromPrimitives(line.unitPrice as { amount: number; currency: Currency }),
          }),
        ),
```

#### Authorization

Who may run a use case is decided in `handle`, before loading anything. The input carries the
actor (`actorId` for a customer, `actorRole` for staff), `toCommand` turns it into a value object
(`CustomerId`, `StaffRoleType`) and `handle` throws `NotAllowedException` (403) with an English
message. A rule that depends on the state of the aggregate (only the buyer cancels their order) is
a business error of the aggregate (`OrderOwnedByAnotherCustomer`, 422), not an authorization.

```ts
  protected async handle(command: DiscardCancelledOrderCommand): Promise<void> {
    if (command.actorRole.value !== StaffRole.ADMIN) {
      throw new NotAllowedException(`The role ${command.actorRole.value} may not discard orders`);
    }
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      throw new AggregateNotFoundException('Order', command.orderId.value);
    }
    order.assertDiscardable();
    await this.orders.remove(order);
  }
```

#### Conflicts

A save of a stale aggregate throws `ConcurrencyException`. By default it reaches the controller as
a 409 (`ChangeOrderLineQuantity`). A use case whose change is safe to repeat retries the whole
load–change–save a fixed number of times, declared as a `private static readonly` constant
(`ChangeShippingAddress`):

```ts
  protected async handle(command: ChangeShippingAddressCommand): Promise<void> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const order = await this.orders.findById(command.orderId);
        if (order === null) {
          throw new AggregateNotFoundException('Order', command.orderId.value);
        }
        order.changeShippingAddress(command.shippingAddress, this.clock);
        await this.orders.save(order);
        return await this.events.publish(order.pullDomainEvents());
      } catch (error) {
        if (
          !(error instanceof ConcurrencyException) ||
          attempt === ChangeShippingAddress.ATTEMPTS
        ) {
          throw error;
        }
      }
    }
  }
```

#### Logging

A use case (of either kind) logs only when the business wants a trace of something, through the
`Logger` port it receives last in its constructor, after saving and publishing. The message is a
snake_case key and the context holds only primitives (`CancelUnpaidOrderOnPaymentRejected`):

```ts
this.logger.info('order_cancelled_for_rejected_payment', {
  orderId: orderId.value,
  reason: reason.value,
});
```

### Reaction use cases

A reaction use case is a use case whose input is an event instead of a request. It is **one
class**: the listener is the use case. There is no separate `UseCase` class behind it and it never
calls another use case; everything a use case does (build the value objects, load, call the
domain, save, publish) is written in its `handle(event)`.

- **File and name**: `application/<reaction>/<reaction>-on-<event>.ts`, class `<Action>On<Event>`.
  `<Action>` is the business action, named like any use case (`RequestPayment`, `MarkOrderPaid`,
  `PrepareShipment`), and `<Event>` the event without `DomainEvent` (`OrderCreated`). The folder
  `application/<reaction>/` is named after the action (`request-payment/`) and holds the listener,
  the copy of the event when it comes from another context (`order-created-domain-event.ts`) and
  the data types it shares. A read model keeps its reactions in `application/<read-model>/<reaction>/`.
- **Extends**: `EventListener<Event>`, decorated with
  `@ListensTo(Event, { consumer: '<context>.<reaction>-on-<event>' })`: the file name with the
  context in front, unique in the whole shop (it names the listener in the channel).
- **Constructor**: like a use case, only what `handle` uses, in this order: the repository typed
  with the roles it uses (`AggregateFinder<X> & AggregateSaver<X>`), domain services,
  `EventBus<XEvent>`, `Clock`, `Logger` (a read model reaction receives its projection instead).
- **`handle(event)`**, in this order:
  1. builds the value objects from the fields of the event with one `ValueObjectBuilder.build`
     and destructures them, with the same rules as `toCommand` (enum casts, `X.fromPrimitives`,
     `buildList`);
  2. computes the id when it depends on other data (`PaymentId.forOrder`, `ShipmentId.forOrder`);
  3. to create: returns quietly when the aggregate already exists, then calls
     `<Aggregate>.create(...)`. To change: loads it with `findById` and returns quietly when it is
     missing. An event is a fact that may arrive twice or about something this context does not
     have;
  4. calls the business method that reacts (`markPaid`, `settleForCancelledOrder`), which itself
     does nothing when it does not apply;
  5. saves the aggregate once and publishes `pullDomainEvents()`, then logs if the business wants
     a trace.
- **Does not contain**: authorization (an event is not an actor), `AggregateNotFoundException`,
  business errors of its own, HTTP, another use case or listener.
- **Errors**: there is no `UseCase` around it, so nothing wraps unknown errors in
  `UnexpectedErrorException`. Any error reaches `DomainEventBus`, which logs it (`warn` for a
  `DomainException` or `ApplicationException`, `error` otherwise) and rethrows it to the channel.

```ts
import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import { Payment } from '../../domain/aggregate/Payment';
import type { PaymentEvent } from '../../domain/event/PaymentEvent';
import { OrderReference } from '../../domain/value-object/OrderReference';
import { PaymentId } from '../../domain/value-object/PaymentId';
import { PaymentMethodType } from '../../domain/value-object/PaymentMethodType';
import type { PaymentMethod } from '../../domain/value-object/PaymentMethodType';
import { OrderCreatedDomainEvent } from './order-created-domain-event';

@ListensTo(OrderCreatedDomainEvent, { consumer: 'payments.request-payment-on-order-created' })
export class RequestPaymentOnOrderCreated extends EventListener<OrderCreatedDomainEvent> {
  constructor(
    private readonly payments: AggregateFinder<Payment> & AggregateSaver<Payment>,
    private readonly events: EventBus<PaymentEvent>,
    private readonly clock: Clock,
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
    const payment = Payment.create(paymentId, orderReference, amount, method, this.clock);
    payment.process(this.clock);
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
```

A reaction that changes an existing aggregate (`MarkOrderShippedOnShipmentDispatched`):

```ts
  async handle(event: ShipmentDispatchedDomainEvent): Promise<void> {
    const { orderId, trackingNumber } = ValueObjectBuilder.build({
      orderId: () => new OrderId(event.orderId),
      trackingNumber: () => new CarrierTrackingNumber(event.trackingNumber),
    });
    const order = await this.orders.findById(orderId);
    if (order === null) {
      return;
    }
    order.markShipped(trackingNumber, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
```

Every reaction use case of the shop:

| Context  | Event heard                   | Reaction use case                               | What it does                                            |
| -------- | ----------------------------- | ----------------------------------------------- | ------------------------------------------------------- |
| Payments | `order.created`               | `RequestPaymentOnOrderCreated`                  | creates the payment and processes it                    |
| Payments | `order.line_quantity_changed` | `AdjustPaymentAmountOnOrderLineQuantityChanged` | adjusts a waiting transfer                              |
| Payments | `order.cancelled`             | `SettleCancelledOrderPaymentOnOrderCancelled`   | refunds a captured payment or voids a waiting one       |
| Sales    | `payment.captured`            | `MarkOrderPaidOnPaymentCaptured`                | marks the order paid                                    |
| Sales    | `payment.rejected`            | `CancelUnpaidOrderOnPaymentRejected`            | cancels the order and logs it                           |
| Sales    | `shipment.dispatched`         | `MarkOrderShippedOnShipmentDispatched`          | marks the order shipped                                 |
| Sales    | `shipment.delivered`          | `MarkOrderDeliveredOnShipmentDelivered`         | marks the order delivered                               |
| Sales    | `order.*` (its own events)    | six reactions of `order-summaries/`             | update the read model (see [Read models](#read-models)) |
| Shipping | `order.paid`                  | `PrepareShipmentOnOrderPaid`                    | creates the shipment                                    |
| Shipping | `order.cancelled`             | `CancelShipmentOnOrderCancelled`                | cancels a shipment still being prepared                 |

### Data types of the application

The plain shapes the application receives (inputs of use cases, bodies of controllers) are
interfaces in the folder of the use case that uses them, in kebab-case files, and the rest of the
context imports them from there:

| Type                                | File                                                    |
| ----------------------------------- | ------------------------------------------------------- |
| `MoneyData` (Sales)                 | `sales/application/place-order/money-data.ts`           |
| `AddressData`                       | `sales/application/place-order/address-data.ts`         |
| `MoneyData` (Payments)              | `payments/application/request-payment/money-data.ts`    |
| `PaidOrderAddress`, `PaidOrderItem` | `shipping/application/prepare-shipment/paid-order-*.ts` |

```ts
export interface MoneyData {
  amount: number;
  currency: string;
}
```

### Events a context consumes

A context never imports another one. For each event it reads, the consumer declares its own copy
in the folder of the use case that reacts (`<event>-domain-event.ts`, kebab-case) with the same
class name, the same `eventName` and only the fields it reads, written like a domain event (no
types, inline object in the constructor):

```ts
import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

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
    clock,
  }: {
    orderId: string;
    total: { amount: number; currency: string };
    paymentMethod: string;
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.total = total;
    this.paymentMethod = paymentMethod;
  }
}
```

### Read models

A read model answers queries without loading aggregates. It lives in its own folder of
`application/` (`order-summaries/`) and is fed only by events, each through its own
[reaction use case](#reaction-use-cases):

| File or folder                                   | What it is                                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `order-summary.ts`                               | the row (`OrderSummary`, plain primitives) and the partial change it receives          |
| `order-summary-store.ts`                         | the write port of the projection: `find`, `hasApplied(eventId)`, `save(row, eventId)`  |
| `order-summaries.ts`                             | the query port the controller reads: `byId`, `ofCustomer`                              |
| `order-summary-projection.ts`                    | `OrderSummaryProjection.apply(change)`: applies one change, skipping a known `eventId` |
| `<reaction>/<reaction>-on-<event>.ts` (one file) | a reaction use case: one listener class                                                |

The reactions of `order-summaries/`:

| Event                         | Reaction use case                                   | Change it decides                         |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------- |
| `order.created`               | `OpenOrderSummaryOnOrderCreated`                    | customer, `pending_payment`, total, items |
| `order.line_quantity_changed` | `UpdateOrderSummaryTotalOnOrderLineQuantityChanged` | total                                     |
| `order.paid`                  | `MarkOrderSummaryPaidOnOrderPaid`                   | `paid`, items                             |
| `order.cancelled`             | `MarkOrderSummaryCancelledOnOrderCancelled`         | `cancelled`                               |
| `order.shipped`               | `MarkOrderSummaryShippedOnOrderShipped`             | `shipped`, tracking number                |
| `order.delivered`             | `MarkOrderSummaryDeliveredOnOrderDelivered`         | `delivered`                               |

- Each one is written like any reaction use case; its constructor receives only
  `OrderSummaryProjection`.
- **`handle(event)`**: builds the value objects from the event with one `ValueObjectBuilder.build`
  (`UuidType`, `OrderId`, `CreatedAt`, `Quantity`…), decides the change (the status, the sum of the
  quantities) and hands it to the projection.
- `OrderSummaryProjection` is the shared, idempotent write of the read model over the store port
  (not a reaction: it hears no event).
- Queries do not go through a use case: the controller reads the query port directly.
- One class implements both ports in infrastructure (`InMemoryOrderSummaryStore`) and returns
  copies (`structuredClone`), never its own objects.

```ts
import { CreatedAt, UuidType } from '../../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../../ddd/application';
import { OrderPaidDomainEvent } from '../../../domain/event/OrderPaidDomainEvent';
import { OrderId } from '../../../domain/value-object/OrderId';
import { OrderStatus } from '../../../domain/value-object/OrderStatusType';
import { Quantity } from '../../../domain/value-object/Quantity';
import type { OrderSummaryProjection } from '../order-summary-projection';

@ListensTo(OrderPaidDomainEvent, { consumer: 'sales.mark-order-summary-paid-on-order-paid' })
export class MarkOrderSummaryPaidOnOrderPaid extends EventListener<OrderPaidDomainEvent> {
  constructor(private readonly projection: OrderSummaryProjection) {
    super();
  }

  async handle(event: OrderPaidDomainEvent): Promise<void> {
    const { eventId, orderId, occurredOn, quantities } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      orderId: () => new OrderId(event.orderId),
      occurredOn: () => new CreatedAt(event.occurredOn),
      quantities: () =>
        ValueObjectBuilder.buildList(event.items, (item) => new Quantity(item.quantity)),
    });
    await this.projection.apply({
      eventId,
      orderId,
      occurredOn,
      changes: {
        status: OrderStatus.PAID,
        items: quantities.reduce((items, quantity) => items + quantity.value, 0),
      },
    });
  }
}
```

```ts
export class OrderSummaryProjection {
  constructor(private readonly store: OrderSummaryStore) {}

  async apply({ eventId, orderId, occurredOn, changes }: OrderSummaryChange): Promise<void> {
    const appliedEventId = eventId.toString();
    if (await this.store.hasApplied(appliedEventId)) {
      return;
    }
    const lastEventAt = occurredOn.toString();
    const current = (await this.store.find(orderId.value)) ?? {
      orderId: orderId.value,
      customerId: null,
      status: 'unknown',
      total: null,
      items: 0,
      trackingNumber: null,
      lastEventAt,
    };
    await this.store.save({ ...current, ...changes, lastEventAt }, appliedEventId);
  }
}
```

### Repositories

- **File and name**: `infrastructure/persistence/<technology>-<aggregate>-repository.ts`, class
  `<Technology><Aggregate>Repository` (`InMemoryPaymentRepository`).
- **Implements** the roles the use cases of the context need (`AggregateFinder<X>`,
  `AggregateSaver<X>`, `AggregateRemover<X>`); there is no `XRepository` interface.
- **Constructor**: only its technology (here nothing; a collection or a pool in a real one), never
  the aggregate class or a mapper.
- **Stores** `{ version, primitives: PrimitiveTypes<X> }` per id, built with
  `X.toPrimitives()` and read with `X.fromPrimitives()`, copied with `structuredClone` both ways.
- **Optimistic concurrency**: a private `WeakMap<X, number>` remembers the version of each object
  it loaded or saved (unknown object = new = 0). `save` and `remove` compare it with the stored
  version and throw `ConcurrencyException('<Aggregate>', id, version)` when they differ, then store
  `version + 1`.
- **Does not contain**: business queries or rules, `nextId()`, events.

```ts
import type { AggregateFinder, AggregateSaver, PrimitiveTypes } from '../../../../ddd/domain';
import { ConcurrencyException } from '../../../../ddd/application';
import { Payment } from '../../domain/aggregate/Payment';
import type { PaymentId } from '../../domain/value-object/PaymentId';

interface PaymentRow {
  version: number;
  primitives: PrimitiveTypes<Payment>;
}

export class InMemoryPaymentRepository
  implements AggregateFinder<Payment>, AggregateSaver<Payment>
{
  private readonly rows = new Map<string, PaymentRow>();
  private readonly versions = new WeakMap<Payment, number>();

  async findById(id: PaymentId): Promise<Payment | null> {
    const row = this.rows.get(id.value);
    if (row === undefined) {
      return null;
    }
    const payment = Payment.fromPrimitives(structuredClone(row.primitives));
    this.versions.set(payment, row.version);
    return payment;
  }

  async save(payment: Payment): Promise<void> {
    const key = payment.id.value;
    const version = this.versions.get(payment) ?? 0;
    if ((this.rows.get(key)?.version ?? 0) !== version) {
      throw new ConcurrencyException('Payment', key, version);
    }
    this.rows.set(key, {
      version: version + 1,
      primitives: structuredClone(payment.toPrimitives()),
    });
    this.versions.set(payment, version + 1);
  }
}
```

`remove` runs the same version check and deletes the row (`InMemoryOrderRepository`, which moves
the check to a private `checkedVersion`).

### Adapters of ports

- **File and name**: `infrastructure/<port-area>/<technology>-<port>.ts`
  (`coupon/in-memory-coupon-catalog.ts`, `InMemoryCouponCatalog implements CouponCatalog`).
- Receives its technology or its raw data by constructor (`MarketingCampaign[]`, declared in the
  same file) and answers in the value objects of the port.
- Bad data from outside is not a business error: it is wrapped in `InternalErrorException` with
  `{ cause }` (500).

```ts
  async discountOf(code: CouponCode): Promise<DiscountPercent | null> {
    const campaign = this.campaigns.get(code.value);
    if (campaign === undefined || !campaign.active) {
      return null;
    }
    try {
      return new DiscountPercent(campaign.percentOff);
    } catch (error) {
      throw new InternalErrorException(`the campaign ${campaign.code} has an invalid discount`, {
        cause: error,
      });
    }
  }
```

### Controllers

- **File and name**: `interfaces/http/<context-plural>-controller.ts`, class
  `<Plural>Controller` (`OrdersController`, `PaymentsController`).
- **Constructor**: the use cases it calls (one argument, or an `<Plural>UseCases` interface in the
  same file when there are several), the query ports of read models and the `Logger`, from which
  it builds its `Http` helper.
- **Each endpoint** is a method `(request: HttpRequest): Promise<HttpResponse>` wrapped in
  `this.http.respond(async () => …)`, and in this order:
  1. authentication: no `request.auth` → `this.http.unauthenticated()` (401);
  2. shape of the body: `this.http.jsonBody(request)` is `null`, or a list is not a list →
     `this.http.badRequest('<English hint>')` (400). Only the shape: values are checked by the
     value objects;
  3. `execute` of the use case with the actor (`actorId: auth.userId`, `actorRole: auth.role`), the
     route params and the body;
  4. the response: `201` with `{ id }` when it creates, `204` when it returns nothing, `200` with
     the body of a query.
- **Never** catches errors itself: `Http.respond` translates them.

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

### `platform/http/http.ts`

The only technical helper shared by the contexts. It declares `HttpRequest`
(`auth`, `params`, `body`), `HttpResponse` (`status`, `body`) and the class `Http`:

- `respond(action)` runs the endpoint and turns any error into a response with
  `ExceptionClassifier.classify(error)`:

  | `ExceptionKind` | Status | Comes from                                                            |
  | --------------- | ------ | --------------------------------------------------------------------- |
  | `Malformed`     | 400    | a value that cannot be converted (`TypePrimitiveException`, required) |
  | `Rejected`      | 400    | any other `ApplicationException`                                      |
  | `NotAllowed`    | 403    | `NotAllowedException`                                                 |
  | `NotFound`      | 404    | `AggregateNotFoundException`                                          |
  | `Conflict`      | 409    | `ConcurrencyException`                                                |
  | `Invalid`       | 422    | any other `DomainException` (`ValidationException`, business errors)  |
  | `Internal`      | 500    | anything else; logged as `error`, the message is hidden               |

  The body is `{ code, message, errors }` (`errors` only for a `ValidationException`).

- `jsonBody`, `badRequest(message)` and `unauthenticated()` for the checks of the controllers.

### `composition.ts`

Each context exposes one class, `<Context>Context`, the only place that creates objects:

- `interface <Context>Settings` with what it receives from outside: `channel`, `clock`, `logger`
  and its own data (`campaigns`).
- A private constructor with what tests and `shop.ts` need (repositories, read models, the
  controller) and the subscriptions.
- `static async start(settings)`:
  1. creates the `DomainEventBus<EventBase>(channel, <Context>Context.registry(), logger)`;
  2. creates the repositories, read model stores and adapters, and the domain services with them;
  3. creates each reaction use case with what it uses (`new RequestPaymentOnOrderCreated(payments, bus, clock)`)
     and subscribes them all with `await bus.subscribe(listener)`;
  4. creates the controller with the use cases users call;
  5. returns the context.
- `async stop()` unsubscribes every subscription.
- `private static registry()` registers every event the context receives (see below).

```ts
  static async start({ channel, clock, logger }: PaymentsSettings): Promise<PaymentsContext> {
    const bus = new DomainEventBus<EventBase>(channel, PaymentsContext.registry(), logger);
    const payments = new InMemoryPaymentRepository();
    const listeners = [
      new RequestPaymentOnOrderCreated(payments, bus, clock),
      new AdjustPaymentAmountOnOrderLineQuantityChanged(payments, bus, clock),
      new SettleCancelledOrderPaymentOnOrderCancelled(payments, bus, clock),
    ];
    const subscriptions: Subscription[] = [];
    for (const listener of listeners) {
      subscriptions.push(await bus.subscribe(listener));
    }
    const controller = new PaymentsController(
      new ConfirmTransferReceived(payments, bus, clock),
      logger,
    );
    return new PaymentsContext(payments, controller, subscriptions);
  }

  async stop(): Promise<void> {
    for (const subscription of this.subscriptions.splice(0)) {
      await subscription.unsubscribe();
    }
  }
```

#### Registering events

`registry()` registers every event the context receives in its `EventRegistry` (the copies of
other contexts and, for a read model, its own domain events), with a factory that maps each field
of the JSON and passes `eventId` and `occurredOn`:

```ts
      .register(
        OrderCreatedDomainEvent,
        (json) =>
          new OrderCreatedDomainEvent({
            orderId: json.orderId as string,
            total: json.total as MoneyData,
            paymentMethod: json.paymentMethod as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
```

### `shop.ts`

Opens the whole shop: one `InMemoryEventChannel({ delivery: 'serial' })`, then `start` of each
context with the same channel, clock and logger, and `close()` stops them in reverse order.

```ts
  static async open({ clock, logger, campaigns = [] }: ShopSettings): Promise<Shop> {
    const channel = new InMemoryEventChannel({ delivery: 'serial' });
    const sales = await SalesContext.start({ channel, clock, logger, campaigns });
    const payments = await PaymentsContext.start({ channel, clock, logger });
    const shipping = await ShippingContext.start({ channel, clock, logger });
    return new Shop(channel, sales, payments, shipping);
  }

  async close(): Promise<void> {
    await this.shipping.stop();
    await this.payments.stop();
    await this.sales.stop();
  }
```

### Adding a feature, step by step

1. Domain: value objects, the event (`<Aggregate><PastAction>DomainEvent`, added to the union
   `<Aggregate>Event`), the business error and the business method of the aggregate.
2. Application: when a user calls it, `application/<use-case>/` with the `UseCase` class and its
   input data types; when it reacts to an event, `application/<reaction>/` with the
   `<Action>On<Event>` reaction use case and, if the event comes from another context, its copy.
3. Infrastructure: a new role in the repository, or a new adapter, only when the use case needs it.
4. Interfaces: the endpoint in the controller, for a use case a user calls.
5. `composition.ts`: pass a use case a user calls to the controller; create a reaction use case,
   subscribe it and register the event it hears.

## The flows

| Story                           | What happens                                                                                                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card order                      | `order.created` → `payment.created` → `payment.captured` → `order.paid` → `shipment.created`, all before `placeOrder` answers 201                                                         |
| Shipment                        | warehouse dispatches (`shipment.dispatched` → `order.shipped`) and delivers (`shipment.delivered` → `order.delivered`)                                                                    |
| Card over 500.00 (compensation) | `payment.rejected` (`limit_exceeded`) → `order.cancelled`; no shipment is prepared                                                                                                        |
| Bank transfer                   | `payment.awaiting_transfer`; quantity changes adjust the payment; treasury confirms the exact amount → paid, or a wrong amount → cancelled                                                |
| Cancellation                    | a paid order is refunded and its shipment cancelled; a waiting transfer is voided                                                                                                         |
| Read model                      | one reaction listener per event (`OpenOrderSummaryOnOrderCreated`, `MarkOrderSummaryPaidOnOrderPaid`…) decides the change; `OrderSummaryProjection` skips an `eventId` it already applied |

## Business rules

| Context  | Rule                                                                                                                                    | Where                                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Money    | whole cents ≥ 0; never mixes currencies (`MNY001`); discounts round down                                                                | `Money`, `Cents` (custom `AbstractType`) |
| Sales    | 1 to 20 lines (`SAL001`), no repeated SKU (`SAL002`), one currency, total from 0.01 to 10000.00 (`SAL003`)                              | `Order.create`                           |
| Sales    | quantities and address change only while `pending_payment` (`SAL004`); a quantity that breaks the total is undone                       | `Order`, `OrderLine` (child entity)      |
| Sales    | only the buyer cancels (`SAL006`, business rule → 422), only before shipping (`SAL005`); only an admin discards a cancelled order (403) | `Order.cancel`, `DiscardCancelledOrder`  |
| Sales    | coupons: up to 3, no repeats (list rules), known active campaigns (`SAL009`), discount capped at 50%                                    | `CouponCodes`, `OrderPricing`            |
| Sales    | free shipping: subtotal ≥ 50.00 or a premium pass, and no gift card                                                                     | `FreeShippingEligible` (specification)   |
| Sales    | only the signed-in customer places their own orders (`NotAllowedException`, 403)                                                        | `PlaceOrder`                             |
| Payments | card up to 500.00, transfer up to 5000.00, else rejected; a transfer must arrive with the exact amount                                  | `Payment.process`, `confirmTransfer`     |
| Payments | only treasury confirms transfers (403); one payment per order (id derived from the order)                                               | `ConfirmTransferReceived`, `PaymentId`   |
| Shipping | carrier and delivery date by country; dispatch needs a tracking number (`SHP002`) and a preparing shipment (`SHP001`)                   | `Shipment`                               |
| Shipping | only the warehouse dispatches and delivers (403)                                                                                        | `DispatchShipment`, `DeliverShipment`    |

Reactions to events (`markPaid`, `cancelForRejectedPayment`, `settleForCancelledOrder`,
`cancelForCancelledOrder`…) are facts: they are idempotent and never throw a business error. Reaction
use cases return quietly when their aggregate does not exist.

## Where each piece of the package is used

| Piece                                                     | In the example                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `StringType`, `NumberType`, `BooleanType`, `Required`     | `Sku`, `Quantity`, `GiftWrap`, address fields                                              |
| `DateType`, `CreatedAt`, `UpdatedAt`                      | `ExpectedDelivery`, every aggregate                                                        |
| `UuidType`, `IdType` (with brand)                         | `PaymentReference` (optional), `OrderReference`, `OrderId`, `PaymentId.forOrder` (v5)      |
| `EnumType`                                                | statuses, `Currency`, `PaymentMethod`, `Carrier`, `RejectionCodeType` (optional)           |
| `JsonType`, `ArrayType`, custom `AbstractType`            | `CarrierLabel`, `CouponCodes` (with list rules), `CentsAmount`                             |
| `Composite` (nested and with a list)                      | `Money`, `ShippingAddress` → `Recipient`, `ShipmentContents` → `[ShipmentItem]`            |
| `Entity`, `AggregateRoot`, `PrimitiveTypes`               | `OrderLine`; `Order`, `Payment`, `Shipment` with `toPrimitives` / `fromPrimitives`         |
| `Specification` (`and`, `or`, `not`)                      | `FreeShippingEligible`, `SubtotalAtLeast`, `ContainsSku`                                   |
| Domain service and domain port                            | `OrderPricing` over `CouponCatalog`                                                        |
| `AggregateFinder` / `Saver` / `Remover`                   | use cases ask only for the roles they use; in-memory repositories with optimistic versions |
| `UseCase`, `ValueObjectBuilder.build` / `buildList`       | every use case; `PlaceOrder` reports `lines.1.quantity`                                    |
| `EventBase`, `EventListener`, `@ListensTo`, `EventBus`    | `OrderCreatedDomainEvent`…, `<Action>On<Event>` reaction use cases                         |
| `DomainEventBus`, `EventRegistry`, `InMemoryEventChannel` | each `composition.ts` and `shop.ts`                                                        |
| `Clock`, `Logger`, loggers and clocks                     | `CancelUnpaidOrderOnPaymentRejected` logs; controllers log internal failures               |
| `ConcurrencyException` (retry and 409)                    | `ChangeShippingAddress` retries; `ChangeOrderLineQuantity` answers 409                     |
| `AggregateNotFoundException`, `NotAllowedException`       | 404 and 403 of the controllers                                                             |
| `InternalErrorException`                                  | the coupon catalog wraps bad campaign data (500)                                           |
| `ExceptionClassifier`, `ExceptionKind`                    | `platform/http/http.ts`                                                                    |

Not shown, because they only matter in tests, in production wiring or for mistakes in the wiring:
`ConsoleLogger`, `SystemClock`, `FixedClock`,
`InMemoryLogger`, `SilentLogger`, `UnexpectedErrorException`, `RequiredValueException`,
`InvalidEventDefinitionException`, `UnknownEventException`, `EventDeliveryException` and the
exception code enums.

## Layout

```
src/
  ddd/                       re-exports src/<layer>/index of the package, as @archi-code/ddd/<layer>
  platform/http/             error translation shared by the controllers
  contexts/
    shared-kernel/money/
    sales/      domain/ application/ infrastructure/ interfaces/ composition.ts
                domain/ → aggregate/ entity/ value-object/ event/ service/ exception/ specification/
    payments/   domain/ application/ infrastructure/ interfaces/ composition.ts
    shipping/   domain/ application/ infrastructure/ interfaces/ composition.ts
  shop.ts                    opens the three contexts on one channel
```
