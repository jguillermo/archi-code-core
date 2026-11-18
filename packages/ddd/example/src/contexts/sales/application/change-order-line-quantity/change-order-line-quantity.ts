import {
  AggregateNotFoundException,
  UseCase,
  ValueObjectBuilder,
} from '../../../../ddd/application';
import type { EventBus } from '../../../../ddd/application';
import { CustomerId } from '../../domain/order/value-object/CustomerId';
import type { OrderRepository } from '../../domain/order/repository/OrderRepository';
import { OrderId } from '../../domain/order/value-object/OrderId';
import { LineNumber } from '../../domain/order/value-object/LineNumber';
import { Quantity } from '../../domain/order/value-object/Quantity';

export interface ChangeOrderLineQuantityInput {
  actorId: string;
  orderId: string;
  lineNumber: number;
  quantity: number;
}

export interface ChangeOrderLineQuantityCommand {
  requester: CustomerId;
  orderId: OrderId;
  lineNumber: LineNumber;
  quantity: Quantity;
}

export class ChangeOrderLineQuantity extends UseCase<
  ChangeOrderLineQuantityInput,
  ChangeOrderLineQuantityCommand,
  void
> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  protected toCommand(input: ChangeOrderLineQuantityInput): ChangeOrderLineQuantityCommand {
    return ValueObjectBuilder.build({
      requester: () => new CustomerId(input.actorId),
      orderId: () => new OrderId(input.orderId),
      lineNumber: () => new LineNumber(input.lineNumber),
      quantity: () => new Quantity(input.quantity),
    });
  }

  protected async handle(command: ChangeOrderLineQuantityCommand): Promise<void> {
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      throw new AggregateNotFoundException('Order', command.orderId.value);
    }
    order.changeLineQuantity(command.requester, command.lineNumber, command.quantity);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
