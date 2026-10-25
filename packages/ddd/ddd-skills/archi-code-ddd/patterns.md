# Recommended patterns

Part of the `archi-code-ddd` skill: read it only when that skill routes here. Each block is a
file of a context (`src/contexts/<context>/…`, see `where-each-class-goes.md`); replace the names
and keep the shape.

## Value objects

Optional by default, required with `Required(XType)`:

```ts
class Nickname extends StringType {} // value: string | null; constructor accepts string | null | nothing
class Name extends Required(StringType) {} // value: string; constructor demands string
class FullName extends Name {} // still required
```

Always valid: the `@Validations` rules run in the constructor, and `ValueObjectBuilder.build`
reports every field at once:

```ts
@Validations([
  {
    validator: 'matches',
    properties: { pattern: /^[A-Z0-9-]{3,20}$/ },
    message: 'A SKU has 3 to 20 capital letters, digits or dashes',
  },
])
export class Sku extends Required(StringType) {}

@Validations([
  { validator: 'isInt', properties: { min: 1, max: 99 }, message: 'From 1 to 99 units' },
])
export class Quantity extends Required(NumberType) {}

new Sku('x');
// ValidationException: Validation failed, Sku: A SKU has 3 to 20 capital letters, digits or dashes

ValueObjectBuilder.build({
  sku: () => new Sku(input.sku),
  quantity: () => new Quantity(input.quantity),
});
// input { sku: 'x', quantity: 0 } → one ValidationException with every field:
// errors: [
//   { field: 'sku', code: 'matches', message: 'Sku: A SKU has 3 to 20 capital letters, digits or dashes' },
//   { field: 'quantity', code: 'isInt', message: 'Quantity: From 1 to 99 units' },
// ]
```

Ids: a random one, and one derived from another aggregate (one payment per order, found again
by the same id):

```ts
export class OrderId extends IdType<'OrderId'> {}

export class OrderReference extends Required(UuidType) {}

export class PaymentId extends IdType<'PaymentId'> {
  static forOrder(order: OrderReference): PaymentId {
    return new PaymentId(UuidType.fromValue(`payment-of-order:${order.value}`));
  }
}
```

An enum, `value-object/PaymentStatusType.ts` (the primitive is the enum option, so the round trip
needs no cast; an optional enum is only `class RejectionCodeType extends EnumType<RejectionCode>`):

```ts
import { EnumType, Required } from '@archi-code/ddd/domain';

export enum PaymentStatus {
  PENDING = 'pending',
  CAPTURED = 'captured',
  REJECTED = 'rejected',
  AWAITING_TRANSFER = 'awaiting_transfer',
  REFUNDED = 'refunded',
  VOIDED = 'voided',
}

export class PaymentStatusOption extends EnumType<PaymentStatus> {
  protected getEnum(): typeof PaymentStatus {
    return PaymentStatus;
  }
}

export class PaymentStatusType extends Required(PaymentStatusOption) {}
```

A list of simple values (`CouponCodeList.ts` + `CouponCodes.ts`):

```ts
@Validations([
  {
    custom: 'atMostThreeCoupons',
    fn: (codes) => (codes as string[]).length <= 3,
    message: 'An order takes at most 3 coupons',
  },
])
export class CouponCodeList extends ArrayType<CouponCode> {
  protected createItem(value: unknown): CouponCode {
    return new CouponCode(value as string);
  }
}

export class CouponCodes extends Required(CouponCodeList) {}
```

A custom conversion (`CentsAmount.ts` + `Cents.ts`) and money as a composite with behavior, in
`shared-kernel/money/`:

```ts
export class CentsAmount extends AbstractType<number> {
  protected filter(value: unknown): number {
    const cents = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (typeof cents !== 'number' || !Number.isSafeInteger(cents) || cents < 0) {
      throw new TypePrimitiveException('amount in cents', value);
    }
    return cents;
  }
}

export class Cents extends Required(CentsAmount) {}

export class CurrencyMismatch extends DomainException {
  constructor(expected: string, received: string) {
    super(`Cannot combine ${received} with ${expected}`, ['MNY001']);
  }
}

export class Money extends Composite({ amount: Cents, currency: MoneyCurrency }) {
  static zero(currency: Currency): Money {
    return new Money({ amount: new Cents(0), currency: new MoneyCurrency(currency) });
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return this.withAmount(this.amount.value + other.amount.value);
  }

  lessPercent(percent: number): Money {
    return this.withAmount(this.amount.value - Math.floor((this.amount.value * percent) / 100));
  }

  isAtLeast(cents: number): boolean {
    return this.amount.value >= cents;
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

const price = Money.fromPrimitives({ amount: 1250, currency: 'EUR' });
price.toPrimitives(); // { amount: 1250, currency: 'EUR' }
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
export class ShipmentContents extends Composite({ items: [ShipmentItem] }) {
  units(): number {
    return this.items.reduce((units, item) => units + item.quantity.value, 0);
  }
}
```

Free-form JSON stored as it is (three files; never a composite):

```ts
export interface CarrierLabelData extends JsonTypeValue {
  carrier: string;
  service: 'standard' | 'gift';
  country: string;
  units: number;
}

export class CarrierLabelJson extends JsonType<CarrierLabelData> {}

export class CarrierLabel extends Required(CarrierLabelJson) {}
```

## Events and business errors

`event/PaymentCapturedDomainEvent.ts`, the event union `event/PaymentEvent.ts` and
`exception/PaymentNotAwaitingTransfer.ts`:

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
    clock,
  }: {
    paymentId: string;
    orderId: string;
    amount: { amount: number; currency: string };
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.paymentId = paymentId;
    this.orderId = orderId;
    this.amount = amount;
  }
}
```

```ts
import type { PaymentCapturedDomainEvent } from './PaymentCapturedDomainEvent';
import type { PaymentCreatedDomainEvent } from './PaymentCreatedDomainEvent';
import type { PaymentRejectedDomainEvent } from './PaymentRejectedDomainEvent';

export type PaymentEvent =
  | PaymentCreatedDomainEvent
  | PaymentCapturedDomainEvent
  | PaymentRejectedDomainEvent;
```

```ts
import { DomainException } from '@archi-code/ddd/domain';

export class PaymentNotAwaitingTransfer extends DomainException {
  constructor(paymentId: string, status: string) {
    super(`Payment ${paymentId} is ${status} and is not waiting for a transfer`, ['PAY001']);
  }
}
```

## Aggregate

`aggregate/Payment.ts`: public constructor that only assigns, `create` with the initial state and
the creation event, `fromPrimitives`/`toPrimitives`, a method a user asks for (throws) and
reaction methods (return silently):

```ts
import { AggregateRoot, CreatedAt, UpdatedAt } from '@archi-code/ddd/domain';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';

interface Clock {
  now(): Date;
}

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

  process(clock: Clock): void {
    if (this._status.value !== PaymentStatus.PENDING) {
      return;
    }
    if (this.exceedsLimit()) {
      this.reject(RejectionCode.LIMIT_EXCEEDED, clock);
    } else if (this.method.value === PaymentMethod.CARD) {
      this.capture(clock);
    } else {
      this.moveTo(PaymentStatus.AWAITING_TRANSFER, clock);
    }
  }

  confirmTransfer(received: Money, clock: Clock): void {
    if (this._status.value !== PaymentStatus.AWAITING_TRANSFER) {
      throw new PaymentNotAwaitingTransfer(this.id.value, this._status.value);
    }
    if (received.equals(this._amount)) {
      this.capture(clock);
    } else {
      this.reject(RejectionCode.AMOUNT_MISMATCH, clock);
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

  private capture(clock: Clock): void {
    this.moveTo(PaymentStatus.CAPTURED, clock);
    this.record(
      new PaymentCapturedDomainEvent({
        paymentId: this.id.value,
        orderId: this.orderReference.value,
        amount: this._amount.toPrimitives(),
        clock,
      }),
    );
  }

  private reject(code: RejectionCode, clock: Clock): void {
    this._rejection = new RejectionCodeType(code);
    this.moveTo(PaymentStatus.REJECTED, clock);
    this.record(
      new PaymentRejectedDomainEvent({
        paymentId: this.id.value,
        orderId: this.orderReference.value,
        amount: this._amount.toPrimitives(),
        reason: code,
        clock,
      }),
    );
  }

  private moveTo(status: PaymentStatus, clock: Clock): void {
    this._status = new PaymentStatusType(status);
    this._updatedAt = UpdatedAt.now(clock);
  }
}
```

Child entities: `create` receives `New<Child>` shapes of value objects (`aggregate/NewOrderLine.ts`)
and assigns the local ids; `toPrimitives` writes each child as an object literal; a change that
breaks an invariant is undone before rethrowing:

```ts
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
  static create(id: OrderId, customerId: CustomerId, lines: NewOrderLine[], clock: Clock): Order {
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
      CreatedAt.now(clock),
      UpdatedAt.now(clock),
    );
    order.assertDistinctSkus();
    order.assertTotal();
    order.record(new OrderCreatedDomainEvent({ orderId: order.id.value, /* … */ clock }));
    return order;
  }

  changeLineQuantity(lineNumber: LineNumber, quantity: Quantity, clock: Clock): void {
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
    this.touch(clock);
    this.record(/* OrderLineQuantityChangedDomainEvent */);
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
      createdAt: this.createdAt.value,
      updatedAt: this._updatedAt.value,
    };
  }
```

A specification, and a domain service with its port:

```ts
export class SubtotalAtLeast extends Specification<Order> {
  constructor(private readonly cents: number) {
    super();
  }

  isSatisfiedBy(order: Order): boolean {
    return order.subtotal().isAtLeast(this.cents);
  }
}

export class FreeShippingEligible extends Specification<Order> {
  private readonly rule = new SubtotalAtLeast(5000)
    .or(new ContainsSku(new Sku('PREMIUM-PASS')))
    .and(new ContainsSku(new Sku('GIFT-CARD')).not());

  isSatisfiedBy(order: Order): boolean {
    return this.rule.isSatisfiedBy(order);
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

`application/confirm-transfer-received/confirm-transfer-received.ts`: `Input` and `Command` in the
same file, `toCommand` with one `ValueObjectBuilder.build`, `handle` with authorization → load →
business method → save → publish:

```ts
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import {
  AggregateNotFoundException,
  NotAllowedException,
  UseCase,
  ValueObjectBuilder,
} from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';

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

The data type, `application/request-payment/money-data.ts` (the rest of the context imports it
from there):

```ts
export interface MoneyData {
  amount: number;
  currency: string;
}
```

Creating: the use case generates the id and passes a domain service's answer; lists of shapes use
`buildList`; it returns the new id:

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
    const discount = await this.pricing.discountFor(command.couponCodes);
    const order = Order.create(OrderId.generate(), command.customerId, command.lines, /* … */ discount, this.clock);
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
        order.changeShippingAddress(command.shippingAddress, this.clock);
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
```

## Reaction use case

The listener is the use case. The copy of the other context's event,
`application/request-payment/order-created-domain-event.ts` (same class name and `eventName` as
the producer, only the fields this reaction reads):

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

Creating, `application/request-payment/request-payment-on-order-created.ts`: the derived id makes
a redelivery a no-op:

```ts
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
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

Changing, `application/cancel-unpaid-order/cancel-unpaid-order-on-payment-rejected.ts`: a
missing aggregate returns, the reaction method returns when the fact does not apply, and the
business trace is logged after publishing:

```ts
@ListensTo(PaymentRejectedDomainEvent, {
  consumer: 'sales.cancel-unpaid-order-on-payment-rejected',
})
export class CancelUnpaidOrderOnPaymentRejected extends EventListener<PaymentRejectedDomainEvent> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
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
    order.cancelForRejectedPayment(reason, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
    this.logger.info('order_cancelled_for_rejected_payment', {
      orderId: orderId.value,
      reason: reason.value,
    });
  }
}
```

## Read model

`application/order-summaries/`: the row, the store (write port), the query port, the projection
and one reaction per event that changes the row:

```ts
export interface OrderSummary {
  orderId: string;
  customerId: string | null;
  status: string;
  total: MoneyData | null;
  items: number;
  trackingNumber: string | null;
  lastEventAt: string;
}

export type OrderSummaryChanges = Partial<
  Pick<OrderSummary, 'customerId' | 'status' | 'total' | 'items' | 'trackingNumber'>
>;

export interface OrderSummaryStore {
  find(orderId: string): Promise<OrderSummary | null>;
  hasApplied(eventId: string): Promise<boolean>;
  save(summary: OrderSummary, eventId: string): Promise<void>;
}

export interface OrderSummaries {
  byId(orderId: string): Promise<OrderSummary | null>;
  ofCustomer(customerId: string): Promise<OrderSummary[]>;
}

export interface OrderSummaryChange {
  eventId: UuidType;
  orderId: OrderId;
  occurredOn: CreatedAt;
  changes: OrderSummaryChanges;
}

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

## Repositories and adapters

In memory, `infrastructure/persistence/in-memory-payment-repository.ts` (also the test double of
`test/support/`): copies both ways and the version check:

```ts
import type { AggregateFinder, AggregateSaver, PrimitiveTypes } from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/application';

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

A repository that also removes shares the check (`AggregateRemover<Order>`):

```ts
  async remove(order: Order): Promise<void> {
    this.checkedVersion(order);
    this.rows.delete(order.id.value);
  }

  private checkedVersion(order: Order): number {
    const key = order.id.value;
    const version = this.versions.get(order) ?? 0;
    if ((this.rows.get(key)?.version ?? 0) !== version) {
      throw new ConcurrencyException('Order', key, version);
    }
    return version;
  }
```

A real repository implements only the roles it supports, checks the version (also on `remove`)
and wraps driver errors with their cause:

```ts
class MongoOrderRepository
  implements AggregateFinder<Order>, AggregateSaver<Order>, AggregateRemover<Order>
{
  private readonly versions = new WeakMap<Order, number>();

  constructor(private readonly collection: Collection<OrderDocument>) {}

  async findById(id: OrderId): Promise<Order | null> {
    const document = await this.collection.findOne({ _id: id.value });
    if (document === null) {
      return null;
    }
    const { _id, version, ...primitives } = document;
    const order = Order.fromPrimitives(primitives);
    this.versions.set(order, version);
    return order;
  }

  async save(order: Order): Promise<void> {
    const version = this.versions.get(order) ?? 0;
    const data = { ...order.toPrimitives(), version: version + 1 };
    let written: boolean;
    try {
      written =
        version === 0
          ? await this.insertUnlessTaken(data)
          : (await this.collection.replaceOne({ _id: data.id, version }, data)).matchedCount === 1;
    } catch (error) {
      throw new InternalErrorException('saving order', { cause: error });
    }
    if (!written) {
      throw new ConcurrencyException('Order', order.id.value, version);
    }
    this.versions.set(order, version + 1);
  }

  async remove(order: Order): Promise<void> {
    const version = this.versions.get(order) ?? 0;
    const { deletedCount } = await this.collection.deleteOne({ _id: order.id.value, version });
    if (deletedCount === 0 && version > 0) {
      throw new ConcurrencyException('Order', order.id.value, version);
    }
  }
}
```

A port adapter, `infrastructure/coupon/in-memory-coupon-catalog.ts`: raw data in, value objects
out, bad external data as an internal error:

```ts
export interface MarketingCampaign {
  code: string;
  percentOff: number;
  active: boolean;
}

export class InMemoryCouponCatalog implements CouponCatalog {
  private readonly campaigns: ReadonlyMap<string, MarketingCampaign>;

  constructor(campaigns: readonly MarketingCampaign[]) {
    this.campaigns = new Map(campaigns.map((campaign) => [campaign.code, campaign]));
  }

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
}
```

## Composition root

`composition.ts`: the only place that builds the context; one bus per context over the shared
channel, every reaction subscribed, every heard event registered once with a factory that keeps
`eventId` and `occurredOn`:

```ts
import type { EventBase } from '@archi-code/ddd/domain';
import type { Clock, Logger } from '@archi-code/ddd/application';
import { DomainEventBus, EventRegistry } from '@archi-code/ddd/infrastructure';
import type { EventChannel, Subscription } from '@archi-code/ddd/infrastructure';

export interface PaymentsSettings {
  channel: EventChannel;
  clock: Clock;
  logger: Logger;
}

export class PaymentsContext {
  private constructor(
    readonly payments: InMemoryPaymentRepository,
    readonly controller: PaymentsController,
    private readonly subscriptions: Subscription[],
  ) {}

  static async start({ channel, clock, logger }: PaymentsSettings): Promise<PaymentsContext> {
    const bus = new DomainEventBus<EventBase>(channel, PaymentsContext.registry(), logger);
    const payments = new InMemoryPaymentRepository();
    const listeners = [
      new RequestPaymentOnOrderCreated(payments, bus, clock),
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

  private static registry(): EventRegistry<EventBase> {
    return new EventRegistry<EventBase>()
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
      .register(
        OrderCancelledDomainEvent,
        (json) =>
          new OrderCancelledDomainEvent({
            orderId: json.orderId as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      );
  }
}
```

The top level opens one channel and starts every context on it:

```ts
const channel = new InMemoryEventChannel({ delivery: 'serial' });
const sales = await SalesContext.start({ channel, clock, logger, campaigns });
const payments = await PaymentsContext.start({ channel, clock, logger });
const shipping = await ShippingContext.start({ channel, clock, logger });
// close: shipping.stop(), payments.stop(), sales.stop()
```

## Entry points

The protocol helper, `platform/http/http.ts`, the only place that turns errors into statuses:

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

  // jsonBody(request), badRequest(message) → 400 BAD_REQUEST, unauthenticated() → 401
}
```

A controller checks only the actor and the shape, calls the use case and answers:

```ts
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

Tests with Vitest describe real situations, use plain fixture factories in the project's
`test/support/` and the native matchers. Dates held by VOs are immutable `Date` subclasses:
compare them with `toEqual` or `.toISOString()`; an event's `occurredOn` is already ISO text.

```ts
import { describe, expect, it } from 'vitest';

describe('Payment', () => {
  it('a card payment within the limit is captured at once', () => {
    const clock = new FixedClock('2026-03-01T09:30:00Z');
    const order = new OrderReference(orderId);
    const payment = Payment.create(
      PaymentId.forOrder(order),
      order,
      Money.fromPrimitives({ amount: 4_990, currency: 'EUR' }),
      new PaymentMethodType(PaymentMethod.CARD),
      clock,
    );
    payment.process(clock);
    expect(payment.pullDomainEvents().map((event) => ({ ...event }))).toMatchObject([
      { eventName: 'payment.created', orderId },
      { eventName: 'payment.captured', amount: { amount: 4_990, currency: 'EUR' } },
    ]);
    expect(Payment.fromPrimitives(payment.toPrimitives()).toPrimitives()).toEqual(
      payment.toPrimitives(),
    );
  });
});
```

A test of the event flow asserts on what the reaction caused and on what the channel carried,
never on the reaction being called, and delivers the same event twice:

```ts
describe('Requesting the payment of a new order', () => {
  it('creates one payment per order even when the event arrives twice', async () => {
    const channel = new InMemoryEventChannel();
    const context = await PaymentsContext.start({ channel, clock, logger: new SilentLogger() });
    const bus = new DomainEventBus(channel, new EventRegistry());
    const orderCreated = new OrderCreatedDomainEvent({
      orderId,
      total: { amount: 4_990, currency: 'EUR' },
      paymentMethod: 'card',
      clock,
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

One repository contract, run against the in-memory reference and the real adapter:

```ts
export function orderRepositoryContract(
  make: () => Promise<AggregateFinder<Order> & AggregateSaver<Order> & AggregateRemover<Order>>,
): void {
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
}

describe('InMemoryOrderRepository', () =>
  orderRepositoryContract(async () => new InMemoryOrderRepository()));
describe('MongoOrderRepository', () => orderRepositoryContract(async () => mongoOrders()));
```

## Another event channel

Another messaging technology is one `EventChannel` class in `infrastructure/messaging/`; the use
cases, the reactions and `DomainEventBus` stay the same, and the composition root changes one
line. A RabbitMQ channel over the methods of an amqplib channel it uses, declared structurally:
one durable topic exchange, the event name as routing key, one durable queue per consumer (the
`consumer` of `@ListensTo`) and event, `ack` when the reaction finished and `nack` without requeue
when it failed (a dead-letter exchange on the queue keeps those messages):

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
    private readonly exchange = 'shop.events',
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

With a broker, `publish` resolves when RabbitMQ took the messages, not when the reaction ran: an
integration test waits for the effect (polling the repository) instead of reading it right after
`execute`.
