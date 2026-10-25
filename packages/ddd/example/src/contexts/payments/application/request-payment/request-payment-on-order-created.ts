import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import { Payment } from '../../domain/aggregate/Payment';
import type { PaymentEvent } from '../../domain/event/PaymentEvent';
import { OrderReference } from '../../domain/value-object/OrderReference';
import { PaymentId } from '../../domain/value-object/PaymentId';
import { PaymentMethodType } from '../../domain/value-object/PaymentMethodType';
import type { PaymentMethod } from '../../domain/value-object/PaymentMethodType';
import { OrderCreatedDomainEvent } from './order-created-domain-event';

@ListensTo(OrderCreatedDomainEvent, { consumer: 'payments.request-payment-on-order-created' })
export class RequestPaymentOnOrderCreated extends EventListener<OrderCreatedDomainEvent> {
  constructor(
    private readonly payments: AggregateFinder<Payment> & AggregateSaver<Payment>,
    private readonly events: EventBus<PaymentEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  async handle(event: OrderCreatedDomainEvent): Promise<void> {
    const { orderReference, amount, method } = ValueObjectBuilder.build({
      orderReference: () => new OrderReference(event.orderId),
      amount: () => Money.fromPrimitives(event.total as { amount: number; currency: Currency }),
      method: () => new PaymentMethodType(event.paymentMethod as PaymentMethod),
    });
    const paymentId = PaymentId.forOrder(orderReference);
    if ((await this.payments.findById(paymentId)) !== null) {
      return;
    }
    const payment = Payment.create(paymentId, orderReference, amount, method, this.clock);
    payment.process(this.clock);
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
