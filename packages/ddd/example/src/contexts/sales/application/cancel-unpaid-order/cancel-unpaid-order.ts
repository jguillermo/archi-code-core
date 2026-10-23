import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { UseCase, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus, Logger } from '../../../../ddd/application';
import type { Order } from '../../domain/order/order';
import type { OrderEvent } from '../../domain/order/order-events';
import { OrderId } from '../../domain/order/order-id';
import { RejectionReason } from '../../domain/order/rejection-reason';

export interface CancelUnpaidOrderInput {
  orderId: string;
  reason: string;
}

export interface CancelUnpaidOrderCommand {
  orderId: OrderId;
  reason: RejectionReason;
}

export class CancelUnpaidOrder extends UseCase<
  CancelUnpaidOrderInput,
  CancelUnpaidOrderCommand,
  void
> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {
    super();
  }

  protected toCommand(input: CancelUnpaidOrderInput): CancelUnpaidOrderCommand {
    return ValueObjectBuilder.build({
      orderId: () => new OrderId(input.orderId),
      reason: () => new RejectionReason(input.reason),
    });
  }

  protected async handle(command: CancelUnpaidOrderCommand): Promise<void> {
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      return;
    }
    order.cancelForRejectedPayment(command.reason, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
    this.logger.info('order_cancelled_for_rejected_payment', {
      orderId: command.orderId.value,
      reason: command.reason.value,
    });
  }
}
