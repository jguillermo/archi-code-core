import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { UseCase, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { CarrierTrackingNumber } from '../../domain/order/carrier-tracking-number';
import type { Order } from '../../domain/order/order';
import type { OrderEvent } from '../../domain/order/order-events';
import { OrderId } from '../../domain/order/order-id';

export interface MarkOrderShippedInput {
  orderId: string;
  trackingNumber: string;
}

export interface MarkOrderShippedCommand {
  orderId: OrderId;
  trackingNumber: CarrierTrackingNumber;
}

export class MarkOrderShipped extends UseCase<
  MarkOrderShippedInput,
  MarkOrderShippedCommand,
  void
> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: MarkOrderShippedInput): MarkOrderShippedCommand {
    return ValueObjectBuilder.build({
      orderId: () => new OrderId(input.orderId),
      trackingNumber: () => new CarrierTrackingNumber(input.trackingNumber),
    });
  }

  protected async handle(command: MarkOrderShippedCommand): Promise<void> {
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      return;
    }
    order.markShipped(command.trackingNumber, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
