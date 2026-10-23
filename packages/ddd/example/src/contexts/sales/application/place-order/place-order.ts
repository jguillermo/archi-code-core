import type { AggregateSaver } from '../../../../ddd/domain';
import { NotAllowedException, UseCase, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { Money } from '../../../shared-kernel/money/money';
import type { Currency } from '../../../shared-kernel/money/currency';
import { CustomerId } from '../../domain/customer/customer-id';
import type { OrderPricing } from '../../domain/coupon/order-pricing';
import { CouponCodes } from '../../domain/order/coupon-codes';
import { GiftWrap } from '../../domain/order/gift-wrap';
import { Order } from '../../domain/order/order';
import type { NewOrderLine } from '../../domain/order/order';
import type { AddressData, MoneyData, OrderEvent } from '../../domain/order/order-events';
import { OrderId } from '../../domain/order/order-id';
import { Quantity, Sku } from '../../domain/order/order-line';
import { PaymentMethodType } from '../../domain/order/payment-method';
import type { PaymentMethod } from '../../domain/order/payment-method';
import { ShippingAddress } from '../../domain/order/shipping-address';

export interface PlaceOrderInput {
  actorId: string;
  customerId: string;
  lines: { sku: string; quantity: number; unitPrice: MoneyData }[];
  shippingAddress: AddressData;
  couponCodes: string[];
  giftWrap: boolean;
  paymentMethod: string;
}

export interface PlaceOrderCommand {
  actorId: CustomerId;
  customerId: CustomerId;
  lines: NewOrderLine[];
  shippingAddress: ShippingAddress;
  couponCodes: CouponCodes;
  giftWrap: GiftWrap;
  paymentMethod: PaymentMethodType;
}

export class PlaceOrder extends UseCase<PlaceOrderInput, PlaceOrderCommand, string> {
  constructor(
    private readonly orders: AggregateSaver<Order>,
    private readonly pricing: OrderPricing,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

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
      giftWrap: () => new GiftWrap(input.giftWrap),
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
    const order = Order.place(
      {
        id: OrderId.generate(),
        customerId: command.customerId,
        lines: command.lines,
        shippingAddress: command.shippingAddress,
        couponCodes: command.couponCodes,
        giftWrap: command.giftWrap,
        paymentMethod: command.paymentMethod,
        discount,
      },
      this.clock,
    );
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
    return order.id.value;
  }
}
