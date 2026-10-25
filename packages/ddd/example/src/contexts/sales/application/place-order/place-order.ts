import type { AggregateSaver } from '../../../../ddd/domain';
import { NotAllowedException, UseCase, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import { CustomerId } from '../../domain/value-object/CustomerId';
import type { OrderPricing } from '../../domain/service/OrderPricing';
import { CouponCodes } from '../../domain/value-object/CouponCodes';
import { GiftWrap } from '../../domain/value-object/GiftWrap';
import { Order } from '../../domain/aggregate/Order';
import type { NewOrderLine } from '../../domain/aggregate/NewOrderLine';
import type { AddressData } from './address-data';
import type { MoneyData } from './money-data';
import type { OrderEvent } from '../../domain/event/OrderEvent';
import { OrderId } from '../../domain/value-object/OrderId';
import { Quantity } from '../../domain/value-object/Quantity';
import { Sku } from '../../domain/value-object/Sku';
import { PaymentMethodType } from '../../domain/value-object/PaymentMethodType';
import type { PaymentMethod } from '../../domain/value-object/PaymentMethodType';
import { ShippingAddress } from '../../domain/value-object/ShippingAddress';

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
    const order = Order.create(
      OrderId.generate(),
      command.customerId,
      command.lines,
      command.shippingAddress,
      command.couponCodes,
      command.giftWrap,
      command.paymentMethod,
      discount,
      this.clock,
    );
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
    return order.id.value;
  }
}
