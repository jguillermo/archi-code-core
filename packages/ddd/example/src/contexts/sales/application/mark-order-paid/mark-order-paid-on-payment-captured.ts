import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import type { OrderRepository } from '../../domain/repository/OrderRepository';
import { OrderId } from '../../domain/value-object/OrderId';
import { PaymentReference } from '../../domain/value-object/PaymentReference';
import { PaymentCapturedDomainEvent } from './payment-captured-domain-event';

@ListensTo(PaymentCapturedDomainEvent, { consumer: 'sales.mark-order-paid-on-payment-captured' })
export class MarkOrderPaidOnPaymentCaptured extends EventListener<PaymentCapturedDomainEvent> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    super();
  }

  async handle(event: PaymentCapturedDomainEvent): Promise<void> {
    const { orderId, payment } = ValueObjectBuilder.build({
      orderId: () => new OrderId(event.orderId),
      payment: () => new PaymentReference(event.paymentId),
    });
    const order = await this.orders.findById(orderId);
    if (order === null) {
      return;
    }
    order.markPaid(payment, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
