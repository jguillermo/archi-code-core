import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../ddd/application';
import type { EventBus } from '../../../../ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import { Payment } from '../../domain/aggregate/Payment';
import type { PaymentRepository } from '../../domain/repository/PaymentRepository';
import { OrderReference } from '../../domain/value-object/OrderReference';
import { PaymentId } from '../../domain/value-object/PaymentId';
import { PaymentMethodType } from '../../domain/value-object/PaymentMethodType';
import type { PaymentMethod } from '../../domain/value-object/PaymentMethodType';
import { OrderCancelledDomainEvent } from './order-cancelled-domain-event';

@ListensTo(OrderCancelledDomainEvent, {
  consumer: 'payments.settle-cancelled-order-payment-on-order-cancelled',
})
export class SettleCancelledOrderPaymentOnOrderCancelled extends EventListener<OrderCancelledDomainEvent> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly events: EventBus,
  ) {
    super();
  }

  async handle(event: OrderCancelledDomainEvent): Promise<void> {
    const { orderReference, amount, method } = ValueObjectBuilder.build({
      orderReference: () => new OrderReference(event.orderId),
      amount: () => Money.fromPrimitives(event.total as { amount: number; currency: Currency }),
      method: () => new PaymentMethodType(event.paymentMethod as PaymentMethod),
    });
    const paymentId = PaymentId.forOrder(orderReference);
    const found = await this.payments.findById(paymentId);
    const payment = found ?? Payment.createVoided(paymentId, orderReference, amount, method);
    payment.settleForCancelledOrder();
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
