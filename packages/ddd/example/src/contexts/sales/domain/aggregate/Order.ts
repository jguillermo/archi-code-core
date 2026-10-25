import { AggregateRoot, CreatedAt, UpdatedAt } from '../../../../ddd/domain';
import type { PrimitiveTypes } from '../../../../ddd/domain';
import { Money } from '../../../shared-kernel/money/Money';
import { CustomerId } from '../value-object/CustomerId';
import type { CarrierTrackingNumber } from '../value-object/CarrierTrackingNumber';
import { CouponCodes } from '../value-object/CouponCodes';
import { DiscountPercent } from '../value-object/DiscountPercent';
import { DuplicateSku } from '../exception/DuplicateSku';
import { FreeShippingEligible } from '../specification/FreeShippingEligible';
import { GiftWrap } from '../value-object/GiftWrap';
import { LineNumber } from '../value-object/LineNumber';
import type { NewOrderLine } from './NewOrderLine';
import { OrderCancelledDomainEvent } from '../event/OrderCancelledDomainEvent';
import { OrderDeliveredDomainEvent } from '../event/OrderDeliveredDomainEvent';
import type { OrderEvent } from '../event/OrderEvent';
import { OrderId } from '../value-object/OrderId';
import { OrderLine } from '../entity/OrderLine';
import { OrderLineCountOutOfRange } from '../exception/OrderLineCountOutOfRange';
import { OrderLineNotFound } from '../exception/OrderLineNotFound';
import { OrderLineQuantityChangedDomainEvent } from '../event/OrderLineQuantityChangedDomainEvent';
import { OrderNotCancellable } from '../exception/OrderNotCancellable';
import { OrderNotDiscardable } from '../exception/OrderNotDiscardable';
import { OrderNotModifiable } from '../exception/OrderNotModifiable';
import { OrderOwnedByAnotherCustomer } from '../exception/OrderOwnedByAnotherCustomer';
import { OrderPaidDomainEvent } from '../event/OrderPaidDomainEvent';
import { OrderCreatedDomainEvent } from '../event/OrderCreatedDomainEvent';
import { OrderShippedDomainEvent } from '../event/OrderShippedDomainEvent';
import { OrderShippingAddressChangedDomainEvent } from '../event/OrderShippingAddressChangedDomainEvent';
import { OrderStatus } from '../value-object/OrderStatusType';
import { OrderStatusType } from '../value-object/OrderStatusType';
import { OrderTotalOutOfRange } from '../exception/OrderTotalOutOfRange';
import { PaymentMethodType } from '../value-object/PaymentMethodType';
import { PaymentReference } from '../value-object/PaymentReference';
import { Quantity } from '../value-object/Quantity';
import type { RejectionReason } from '../value-object/RejectionReason';
import { ShippingAddress } from '../value-object/ShippingAddress';
import { Sku } from '../value-object/Sku';

interface Clock {
  now(): Date;
}

export class Order extends AggregateRoot<OrderId, OrderEvent> {
  private static readonly MAX_LINES = 20;
  private static readonly MAX_TOTAL_CENTS = 1_000_000;

  readonly customerId: CustomerId;
  private _lines: OrderLine[];
  private _status: OrderStatusType;
  private _shippingAddress: ShippingAddress;
  readonly couponCodes: CouponCodes;
  readonly giftWrap: GiftWrap;
  readonly paymentMethod: PaymentMethodType;
  readonly discount: DiscountPercent;
  private _paymentReference: PaymentReference;
  readonly createdAt: CreatedAt;
  private _updatedAt: UpdatedAt;

  constructor(
    id: OrderId,
    customerId: CustomerId,
    lines: OrderLine[],
    status: OrderStatusType,
    shippingAddress: ShippingAddress,
    couponCodes: CouponCodes,
    giftWrap: GiftWrap,
    paymentMethod: PaymentMethodType,
    discount: DiscountPercent,
    paymentReference: PaymentReference,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
  ) {
    super(id);
    this.customerId = customerId;
    this._lines = lines;
    this._status = status;
    this._shippingAddress = shippingAddress;
    this.couponCodes = couponCodes;
    this.giftWrap = giftWrap;
    this.paymentMethod = paymentMethod;
    this.discount = discount;
    this._paymentReference = paymentReference;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(
    id: OrderId,
    customerId: CustomerId,
    lines: NewOrderLine[],
    shippingAddress: ShippingAddress,
    couponCodes: CouponCodes,
    giftWrap: GiftWrap,
    paymentMethod: PaymentMethodType,
    discount: DiscountPercent,
    clock: Clock,
  ): Order {
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
      shippingAddress,
      couponCodes,
      giftWrap,
      paymentMethod,
      discount,
      new PaymentReference(null),
      CreatedAt.now(clock),
      UpdatedAt.now(clock),
    );
    order.assertDistinctSkus();
    order.assertTotal();

    order.record(
      new OrderCreatedDomainEvent({
        orderId: order.id.value,
        customerId: order.customerId.value,
        lines: order._lines.map((line) => ({
          sku: line.sku.value,
          quantity: line.quantity.value,
          unitPrice: line.unitPrice.toPrimitives(),
        })),
        total: order.total().toPrimitives(),
        paymentMethod: order.paymentMethod.value,
        freeShipping: new FreeShippingEligible().isSatisfiedBy(order),
        clock,
      }),
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
    this.record(
      new OrderLineQuantityChangedDomainEvent({
        orderId: this.id.value,
        lineNumber: lineNumber.value,
        quantity: quantity.value,
        total: this.total().toPrimitives(),
        clock,
      }),
    );
  }

  changeShippingAddress(address: ShippingAddress, clock: Clock): void {
    this.assertPendingPayment();
    if (address.equals(this._shippingAddress)) {
      return;
    }
    this._shippingAddress = address;
    this.touch(clock);
    this.record(
      new OrderShippingAddressChangedDomainEvent({
        orderId: this.id.value,
        address: address.toPrimitives(),
        clock,
      }),
    );
  }

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

  markPaid(payment: PaymentReference, clock: Clock): void {
    if (!this.isIn(OrderStatus.PENDING_PAYMENT)) {
      return;
    }
    this._paymentReference = payment;
    this.moveTo(OrderStatus.PAID, clock);
    this.record(
      new OrderPaidDomainEvent({
        orderId: this.id.value,
        paymentId: payment.toString(),
        address: this._shippingAddress.toPrimitives(),
        items: this._lines.map((line) => ({ sku: line.sku.value, quantity: line.quantity.value })),
        giftWrap: this.giftWrap.value,
        clock,
      }),
    );
  }

  cancelForRejectedPayment(reason: RejectionReason, clock: Clock): void {
    if (!this.isIn(OrderStatus.PENDING_PAYMENT)) {
      return;
    }
    this.moveTo(OrderStatus.CANCELLED, clock);
    this.record(
      new OrderCancelledDomainEvent({
        orderId: this.id.value,
        reason: `payment_rejected:${reason.value}`,
        wasPaid: false,
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

  markDelivered(clock: Clock): void {
    if (!this.isIn(OrderStatus.SHIPPED)) {
      return;
    }
    this.moveTo(OrderStatus.DELIVERED, clock);
    this.record(new OrderDeliveredDomainEvent({ orderId: this.id.value, clock }));
  }

  assertDiscardable(): void {
    if (!this.isIn(OrderStatus.CANCELLED)) {
      throw new OrderNotDiscardable(this.id.value);
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
        throw new DuplicateSku(line.sku.value);
      }
      seen.add(line.sku.value);
    }
  }

  private assertTotal(): void {
    const total = this.total();
    if (total.isZero() || total.isAtLeast(Order.MAX_TOTAL_CENTS + 1)) {
      throw new OrderTotalOutOfRange(total.amount.value);
    }
  }

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
}
