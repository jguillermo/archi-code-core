import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus, Logger } from '../../../../ddd/application';
import type { Order } from '../../domain/aggregate/Order';
import { OrderId } from '../../domain/value-object/OrderId';
import { RejectionReason } from '../../domain/value-object/RejectionReason';
import { PaymentRejectedDomainEvent } from './payment-rejected-domain-event';

@ListensTo(PaymentRejectedDomainEvent, {
  consumer: 'sales.cancel-unpaid-order-on-payment-rejected',
})
export class CancelUnpaidOrderOnPaymentRejected extends EventListener<PaymentRejectedDomainEvent> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {
    super();
  }

  async handle(event: PaymentRejectedDomainEvent): Promise<void> {
    const { orderId, reason } = ValueObjectBuilder.build({
      orderId: () => new OrderId(event.orderId),
      reason: () => new RejectionReason(event.reason),
    });
    const order = await this.orders.findById(orderId);
    if (order === null) {
      return;
    }
    order.cancelForRejectedPayment(reason, this.clock);
    await this.orders.save(order);
    const events = order.pullDomainEvents();
    await this.events.publish(events);
    if (events.length > 0) {
      this.logger.info('order_cancelled_for_rejected_payment', {
        orderId: orderId.value,
        reason: reason.value,
      });
    }
  }
}
