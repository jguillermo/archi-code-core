import { AggregateRoot, CreatedAt, UpdatedAt } from '../../../../ddd/domain';
import type { PrimitiveTypes } from '../../../../ddd/domain';
import { Money } from '../../../shared-kernel/money/money';
import type { CarrierTrackingNumber } from './carrier-tracking-number';
import { CustomerId } from '../customer/customer-id';
import { CouponCodes } from './coupon-codes';
import { DiscountPercent } from './discount-percent';
import { FreeShippingEligible } from './free-shipping-eligible';
import { GiftWrap } from './gift-wrap';
import { OrderId } from './order-id';
import { LineNumber, OrderLine, Quantity, Sku } from './order-line';
import {
  DuplicateSkuException,
  OrderCannotBeCancelledException,
  OrderLineCountException,
  OrderLineNotFoundException,
  OrderNotDiscardableException,
  OrderNotModifiableException,
  OrderOwnershipException,
  OrderTotalOutOfRangeException,
} from './order-exceptions';
import {
  OrderCancelled,
  OrderDelivered,
  OrderLineQuantityChanged,
  OrderPaid,
  OrderPlaced,
  OrderShipped,
  ShippingAddressChanged,
} from './order-events';
import type { OrderEvent } from './order-events';
import { OrderStatus, OrderStatusType } from './order-status';
import { PaymentMethodType } from './payment-method';
import { PaymentReference } from './payment-reference';
import type { RejectionReason } from './rejection-reason';
import { ShippingAddress } from './shipping-address';

export interface NewOrderLine {
  sku: Sku;
  quantity: Quantity;
  unitPrice: Money;
}

export interface NewOrder {
  id: OrderId;
  customerId: CustomerId;
  lines: NewOrderLine[];
  shippingAddress: ShippingAddress;
  couponCodes: CouponCodes;
  giftWrap: GiftWrap;
  paymentMethod: PaymentMethodType;
  discount: DiscountPercent;
}

interface Clock {
  now(): Date;
}

export class Order extends AggregateRoot<OrderId, OrderEvent> {
  private static readonly MAX_LINES = 20;
  private static readonly MAX_TOTAL_CENTS = 1_000_000;

  private constructor(
    id: OrderId,
    readonly customerId: CustomerId,
    private _lines: OrderLine[],
    private _status: OrderStatusType,
    private _shippingAddress: ShippingAddress,
    readonly couponCodes: CouponCodes,
    readonly giftWrap: GiftWrap,
    readonly paymentMethod: PaymentMethodType,
    readonly discount: DiscountPercent,
    private _paymentReference: PaymentReference,
    readonly createdAt: CreatedAt,
    private _updatedAt: UpdatedAt,
  ) {
    super(id);
  }

  static place(data: NewOrder, clock: Clock): Order {
    if (data.lines.length < 1 || data.lines.length > Order.MAX_LINES) {
      throw new OrderLineCountException(data.lines.length);
    }
    const lines = data.lines.map(
      (line, index) =>
        new OrderLine(new LineNumber(index + 1), line.sku, line.quantity, line.unitPrice),
    );
    const order = new Order(
      data.id,
      data.customerId,
      lines,
      new OrderStatusType(OrderStatus.PENDING_PAYMENT),
      data.shippingAddress,
      data.couponCodes,
      data.giftWrap,
      data.paymentMethod,
      data.discount,
      new PaymentReference(null),
      CreatedAt.now(clock),
      UpdatedAt.now(clock),
    );
    order.assertDistinctSkus();
    order.assertTotal();
    order.record(
      new OrderPlaced(
        order.id.value,
        order.customerId.value,
        order._lines.map((line) => ({
          sku: line.sku.value,
          quantity: line.quantity.value,
          unitPrice: line.unitPrice.toPrimitives(),
        })),
        order.total().toPrimitives(),
        order.paymentMethod.value,
        new FreeShippingEligible().isSatisfiedBy(order),
        { clock },
      ),
    );
    return order;
  }

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

  get lines(): OrderLine[] {
    return [...this._lines];
  }

  get status(): OrderStatusType {
    return this._status;
  }

  get shippingAddress(): ShippingAddress {
    return this._shippingAddress;
  }

  get paymentReference(): PaymentReference {
    return this._paymentReference;
  }

  get updatedAt(): UpdatedAt {
    return this._updatedAt;
  }

  subtotal(): Money {
    return this._lines.map((line) => line.subtotal()).reduce((sum, subtotal) => sum.add(subtotal));
  }

  total(): Money {
    return this.subtotal().lessPercent(this.discount.value);
  }

  isIn(status: OrderStatus): boolean {
    return this._status.value === status;
  }

  changeLineQuantity(lineNumber: LineNumber, quantity: Quantity, clock: Clock): void {
    this.assertPendingPayment();
    const line = this._lines.find((candidate) => candidate.id.equals(lineNumber));
    if (line === undefined) {
      throw new OrderLineNotFoundException(this.id.value, lineNumber.value);
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
    this.record(
      new OrderLineQuantityChanged(
        this.id.value,
        lineNumber.value,
        quantity.value,
        this.total().toPrimitives(),
        { clock },
      ),
    );
  }

  changeShippingAddress(address: ShippingAddress, clock: Clock): void {
    this.assertPendingPayment();
    if (address.equals(this._shippingAddress)) {
      return;
    }
    this._shippingAddress = address;
    this.touch(clock);
    this.record(new ShippingAddressChanged(this.id.value, address.toPrimitives(), { clock }));
  }

  cancel(requester: CustomerId, clock: Clock): void {
    if (!requester.equals(this.customerId)) {
      throw new OrderOwnershipException(this.id.value);
    }
    if (!this.isIn(OrderStatus.PENDING_PAYMENT) && !this.isIn(OrderStatus.PAID)) {
      throw new OrderCannotBeCancelledException(this.id.value, this._status.value);
    }
    const wasPaid = this.isIn(OrderStatus.PAID);
    this.moveTo(OrderStatus.CANCELLED, clock);
    this.record(new OrderCancelled(this.id.value, 'cancelled_by_customer', wasPaid, { clock }));
  }

  markPaid(payment: PaymentReference, clock: Clock): void {
    if (!this.isIn(OrderStatus.PENDING_PAYMENT)) {
      return;
    }
    this._paymentReference = payment;
    this.moveTo(OrderStatus.PAID, clock);
    this.record(
      new OrderPaid(
        this.id.value,
        payment.toString(),
        this._shippingAddress.toPrimitives(),
        this._lines.map((line) => ({ sku: line.sku.value, quantity: line.quantity.value })),
        this.giftWrap.value,
        { clock },
      ),
    );
  }

  cancelForRejectedPayment(reason: RejectionReason, clock: Clock): void {
    if (!this.isIn(OrderStatus.PENDING_PAYMENT)) {
      return;
    }
    this.moveTo(OrderStatus.CANCELLED, clock);
    this.record(
      new OrderCancelled(this.id.value, `payment_rejected:${reason.value}`, false, { clock }),
    );
  }

  markShipped(trackingNumber: CarrierTrackingNumber, clock: Clock): void {
    if (!this.isIn(OrderStatus.PAID)) {
      return;
    }
    this.moveTo(OrderStatus.SHIPPED, clock);
    this.record(new OrderShipped(this.id.value, trackingNumber.value, { clock }));
  }

  markDelivered(clock: Clock): void {
    if (!this.isIn(OrderStatus.SHIPPED)) {
      return;
    }
    this.moveTo(OrderStatus.DELIVERED, clock);
    this.record(new OrderDelivered(this.id.value, { clock }));
  }

  assertDiscardable(): void {
    if (!this.isIn(OrderStatus.CANCELLED)) {
      throw new OrderNotDiscardableException(this.id.value);
    }
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

  private assertDistinctSkus(): void {
    const seen = new Set<string>();
    for (const line of this._lines) {
      if (seen.has(line.sku.value)) {
        throw new DuplicateSkuException(line.sku.value);
      }
      seen.add(line.sku.value);
    }
  }

  private assertTotal(): void {
    const total = this.total();
    if (total.isZero() || total.isAtLeast(Order.MAX_TOTAL_CENTS + 1)) {
      throw new OrderTotalOutOfRangeException(total.amount.value);
    }
  }

  private assertPendingPayment(): void {
    if (!this.isIn(OrderStatus.PENDING_PAYMENT)) {
      throw new OrderNotModifiableException(this.id.value, this._status.value);
    }
  }

  private moveTo(status: OrderStatus, clock: Clock): void {
    this._status = new OrderStatusType(status);
    this.touch(clock);
  }

  private touch(clock: Clock): void {
    this._updatedAt = UpdatedAt.now(clock);
  }
}
