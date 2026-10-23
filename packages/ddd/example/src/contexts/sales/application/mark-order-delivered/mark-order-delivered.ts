import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { UseCase } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import type { Order } from '../../domain/order/order';
import type { OrderEvent } from '../../domain/order/order-events';
import { OrderId } from '../../domain/order/order-id';

export class MarkOrderDelivered extends UseCase<{ orderId: string }, OrderId, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: { orderId: string }): OrderId {
    return new OrderId(input.orderId);
  }

  protected async handle(orderId: OrderId): Promise<void> {
    const order = await this.orders.findById(orderId);
    if (order === null) {
      return;
    }
    order.markDelivered(this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
