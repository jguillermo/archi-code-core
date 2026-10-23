import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { UseCase } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { OrderReference } from '../../domain/payment/order-reference';
import type { Payment } from '../../domain/payment/payment';
import type { PaymentEvent } from '../../domain/payment/payment-events';
import { PaymentId } from '../../domain/payment/payment-id';

export class SettleCancelledOrderPayment extends UseCase<
  { orderId: string },
  OrderReference,
  void
> {
  constructor(
    private readonly payments: AggregateFinder<Payment> & AggregateSaver<Payment>,
    private readonly events: EventBus<PaymentEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: { orderId: string }): OrderReference {
    return new OrderReference(input.orderId);
  }

  protected async handle(orderReference: OrderReference): Promise<void> {
    const payment = await this.payments.findById(PaymentId.forOrder(orderReference));
    if (payment === null) {
      return;
    }
    payment.settleForCancelledOrder(this.clock);
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
