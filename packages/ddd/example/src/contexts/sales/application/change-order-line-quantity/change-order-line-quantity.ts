import {
  AggregateNotFoundException,
  UseCase,
  ValueObjectBuilder,
} from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import type { OrderRepository } from '../../domain/repository/OrderRepository';
import { OrderId } from '../../domain/value-object/OrderId';
import { LineNumber } from '../../domain/value-object/LineNumber';
import { Quantity } from '../../domain/value-object/Quantity';

export interface ChangeOrderLineQuantityInput {
  orderId: string;
  lineNumber: number;
  quantity: number;
}

export interface ChangeOrderLineQuantityCommand {
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
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: ChangeOrderLineQuantityInput): ChangeOrderLineQuantityCommand {
    return ValueObjectBuilder.build({
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
    order.changeLineQuantity(command.lineNumber, command.quantity, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
