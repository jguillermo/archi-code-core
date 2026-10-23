import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { UseCase, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { Money } from '../../../shared-kernel/money/money';
import type { Currency } from '../../../shared-kernel/money/currency';
import { OrderReference } from '../../domain/payment/order-reference';
import { Payment } from '../../domain/payment/payment';
import type { MoneyData, PaymentEvent } from '../../domain/payment/payment-events';
import { PaymentId } from '../../domain/payment/payment-id';
import { PaymentMethodType } from '../../domain/payment/payment-method';
import type { PaymentMethod } from '../../domain/payment/payment-method';

export interface RequestPaymentInput {
  orderId: string;
  amount: MoneyData;
  method: string;
}

export interface RequestPaymentCommand {
  orderReference: OrderReference;
  amount: Money;
  method: PaymentMethodType;
}

export class RequestPayment extends UseCase<RequestPaymentInput, RequestPaymentCommand, void> {
  constructor(
    private readonly payments: AggregateFinder<Payment> & AggregateSaver<Payment>,
    private readonly events: EventBus<PaymentEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: RequestPaymentInput): RequestPaymentCommand {
    return ValueObjectBuilder.build({
      orderReference: () => new OrderReference(input.orderId),
      amount: () => Money.fromPrimitives(input.amount as { amount: number; currency: Currency }),
      method: () => new PaymentMethodType(input.method as PaymentMethod),
    });
  }

  protected async handle(command: RequestPaymentCommand): Promise<void> {
    if ((await this.payments.findById(PaymentId.forOrder(command.orderReference))) !== null) {
      return;
    }
    const payment = Payment.request(command, this.clock);
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
