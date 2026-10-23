import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { UseCase, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import type { Order } from '../../domain/order/order';
import type { OrderEvent } from '../../domain/order/order-events';
import { OrderId } from '../../domain/order/order-id';
import { PaymentReference } from '../../domain/order/payment-reference';

export interface MarkOrderPaidInput {
  orderId: string;
  paymentId: string;
}

export interface MarkOrderPaidCommand {
  orderId: OrderId;
  payment: PaymentReference;
}

export class MarkOrderPaid extends UseCase<MarkOrderPaidInput, MarkOrderPaidCommand, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: MarkOrderPaidInput): MarkOrderPaidCommand {
    return ValueObjectBuilder.build({
      orderId: () => new OrderId(input.orderId),
      payment: () => new PaymentReference(input.paymentId),
    });
  }

  protected async handle(command: MarkOrderPaidCommand): Promise<void> {
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      return;
    }
    order.markPaid(command.payment, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
