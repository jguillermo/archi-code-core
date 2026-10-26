import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import type { Payment } from '../../domain/aggregate/Payment';
import { OrderReference } from '../../domain/value-object/OrderReference';
import { PaymentId } from '../../domain/value-object/PaymentId';
import { OrderCancelledDomainEvent } from './order-cancelled-domain-event';

@ListensTo(OrderCancelledDomainEvent, {
  consumer: 'payments.settle-cancelled-order-payment-on-order-cancelled',
})
export class SettleCancelledOrderPaymentOnOrderCancelled extends EventListener<OrderCancelledDomainEvent> {
  constructor(
    private readonly payments: AggregateFinder<Payment> & AggregateSaver<Payment>,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    super();
  }

  async handle(event: OrderCancelledDomainEvent): Promise<void> {
    const { orderReference } = ValueObjectBuilder.build({
      orderReference: () => new OrderReference(event.orderId),
    });
    const payment = await this.payments.findById(PaymentId.forOrder(orderReference));
    if (payment === null) {
      return;
    }
    payment.settleForCancelledOrder(this.clock);
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
