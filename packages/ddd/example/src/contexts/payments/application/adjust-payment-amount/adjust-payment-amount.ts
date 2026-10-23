import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import { UseCase, ValueObjectBuilder } from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { Money } from '../../../shared-kernel/money/money';
import type { Currency } from '../../../shared-kernel/money/currency';
import { OrderReference } from '../../domain/payment/order-reference';
import type { Payment } from '../../domain/payment/payment';
import type { MoneyData, PaymentEvent } from '../../domain/payment/payment-events';
import { PaymentId } from '../../domain/payment/payment-id';

export interface AdjustPaymentAmountInput {
  orderId: string;
  amount: MoneyData;
}

export interface AdjustPaymentAmountCommand {
  orderReference: OrderReference;
  amount: Money;
}

export class AdjustPaymentAmount extends UseCase<
  AdjustPaymentAmountInput,
  AdjustPaymentAmountCommand,
  void
> {
  constructor(
    private readonly payments: AggregateFinder<Payment> & AggregateSaver<Payment>,
    private readonly events: EventBus<PaymentEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: AdjustPaymentAmountInput): AdjustPaymentAmountCommand {
    return ValueObjectBuilder.build({
      orderReference: () => new OrderReference(input.orderId),
      amount: () => Money.fromPrimitives(input.amount as { amount: number; currency: Currency }),
    });
  }

  protected async handle(command: AdjustPaymentAmountCommand): Promise<void> {
    const payment = await this.payments.findById(PaymentId.forOrder(command.orderReference));
    if (payment === null) {
      return;
    }
    payment.adjustAmount(command.amount, this.clock);
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
