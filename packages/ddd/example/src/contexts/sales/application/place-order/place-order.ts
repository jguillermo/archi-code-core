import { NotAllowedException, UseCase, ValueObjectBuilder } from '../../../../ddd/application';
import type { EventBus } from '../../../../ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import { CustomerId } from '../../domain/order/value-object/CustomerId';
import { OrderPricing } from '../../domain/order/service/OrderPricing';
import type { CouponRepository } from '../../domain/coupon/repository/CouponRepository';
import { CouponCodes } from '../../domain/order/value-object/CouponCodes';
import { GiftWrap } from '../../domain/order/value-object/GiftWrap';
import { Order } from '../../domain/order/aggregate/Order';
import type { OrderRepository } from '../../domain/order/repository/OrderRepository';
import type { NewOrderLine } from '../../domain/order/aggregate/NewOrderLine';
import type { AddressData } from './address-data';
import type { MoneyData } from './money-data';
import { OrderId } from '../../domain/order/value-object/OrderId';
import { Quantity } from '../../domain/order/value-object/Quantity';
import { Sku } from '../../domain/order/value-object/Sku';
import { PaymentMethodType } from '../../domain/order/value-object/PaymentMethodType';
import type { PaymentMethod } from '../../domain/order/value-object/PaymentMethodType';
import { ShippingAddress } from '../../domain/order/value-object/ShippingAddress';

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
    private readonly orders: OrderRepository,
    private readonly coupons: CouponRepository,
    private readonly events: EventBus,
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
    const discount = await new OrderPricing(this.coupons).discountFor(command.couponCodes);
    const order = Order.create(
      OrderId.generate(),
      command.customerId,
      command.lines,
      command.shippingAddress,
      command.couponCodes,
      command.giftWrap,
      command.paymentMethod,
      discount,
    );
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
    return order.id.value;
  }
}
