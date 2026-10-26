import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import type { PaymentRepository } from '../../domain/repository/PaymentRepository';
import { OrderReference } from '../../domain/value-object/OrderReference';
import { PaymentId } from '../../domain/value-object/PaymentId';
import { OrderLineQuantityChangedDomainEvent } from './order-line-quantity-changed-domain-event';

@ListensTo(OrderLineQuantityChangedDomainEvent, {
  consumer: 'payments.adjust-payment-amount-on-order-line-quantity-changed',
})
export class AdjustPaymentAmountOnOrderLineQuantityChanged extends EventListener<OrderLineQuantityChangedDomainEvent> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    super();
  }

  async handle(event: OrderLineQuantityChangedDomainEvent): Promise<void> {
    const { orderReference, amount } = ValueObjectBuilder.build({
      orderReference: () => new OrderReference(event.orderId),
      amount: () => Money.fromPrimitives(event.total as { amount: number; currency: Currency }),
    });
    const payment = await this.payments.findById(PaymentId.forOrder(orderReference));
    if (payment === null) {
      return;
    }
    payment.adjustAmount(amount, this.clock);
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
