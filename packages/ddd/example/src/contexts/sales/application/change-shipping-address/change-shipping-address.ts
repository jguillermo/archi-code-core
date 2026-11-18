import {
  AggregateNotFoundException,
  ConcurrencyException,
  UseCase,
  ValueObjectBuilder,
} from '../../../../ddd/application';
import type { EventBus } from '../../../../ddd/application';
import { CustomerId } from '../../domain/order/value-object/CustomerId';
import type { OrderRepository } from '../../domain/order/repository/OrderRepository';
import type { AddressData } from '../place-order/address-data';
import { OrderId } from '../../domain/order/value-object/OrderId';
import { ShippingAddress } from '../../domain/order/value-object/ShippingAddress';

export interface ChangeShippingAddressInput {
  actorId: string;
  orderId: string;
  shippingAddress: AddressData;
}

export interface ChangeShippingAddressCommand {
  requester: CustomerId;
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
    private readonly orders: OrderRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: ChangeShippingAddressInput): ChangeShippingAddressCommand {
    return ValueObjectBuilder.build({
      requester: () => new CustomerId(input.actorId),
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
        order.changeShippingAddress(command.requester, command.shippingAddress);
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
