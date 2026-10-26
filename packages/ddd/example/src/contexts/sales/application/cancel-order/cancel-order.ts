import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import {
  AggregateNotFoundException,
  UseCase,
  ValueObjectBuilder,
} from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { CustomerId } from '../../domain/value-object/CustomerId';
import type { Order } from '../../domain/aggregate/Order';
import { OrderId } from '../../domain/value-object/OrderId';

export interface CancelOrderInput {
  actorId: string;
  orderId: string;
}

export interface CancelOrderCommand {
  requester: CustomerId;
  orderId: OrderId;
}

export class CancelOrder extends UseCase<CancelOrderInput, CancelOrderCommand, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: CancelOrderInput): CancelOrderCommand {
    return ValueObjectBuilder.build({
      requester: () => new CustomerId(input.actorId),
      orderId: () => new OrderId(input.orderId),
    });
  }

  protected async handle(command: CancelOrderCommand): Promise<void> {
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      throw new AggregateNotFoundException('Order', command.orderId.value);
    }
    order.cancel(command.requester, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
