import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import type { Payment } from '../../domain/aggregate/Payment';
import type { PaymentEvent } from '../../domain/event/PaymentEvent';
import { OrderReference } from '../../domain/value-object/OrderReference';
import { PaymentId } from '../../domain/value-object/PaymentId';
import { OrderLineQuantityChangedDomainEvent } from './order-line-quantity-changed-domain-event';

@ListensTo(OrderLineQuantityChangedDomainEvent, {
  consumer: 'payments.adjust-payment-amount-on-order-line-quantity-changed',
})
export class AdjustPaymentAmountOnOrderLineQuantityChanged extends EventListener<OrderLineQuantityChangedDomainEvent> {
  constructor(
    private readonly payments: AggregateFinder<Payment> & AggregateSaver<Payment>,
    private readonly events: EventBus<PaymentEvent>,
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
