import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import {
  AggregateNotFoundException,
  ConcurrencyException,
  UseCase,
  ValueObjectBuilder,
} from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import type { Order } from '../../domain/order/order';
import type { AddressData, OrderEvent } from '../../domain/order/order-events';
import { OrderId } from '../../domain/order/order-id';
import { ShippingAddress } from '../../domain/order/shipping-address';

export interface ChangeShippingAddressInput {
  orderId: string;
  shippingAddress: AddressData;
}

export interface ChangeShippingAddressCommand {
  orderId: OrderId;
  shippingAddress: ShippingAddress;
}

export class ChangeShippingAddress extends UseCase<
  ChangeShippingAddressInput,
  ChangeShippingAddressCommand,
  void
> {
  private static readonly ATTEMPTS = 3;

  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: ChangeShippingAddressInput): ChangeShippingAddressCommand {
    return ValueObjectBuilder.build({
      orderId: () => new OrderId(input.orderId),
      shippingAddress: () => ShippingAddress.fromPrimitives(input.shippingAddress),
    });
  }

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
}
