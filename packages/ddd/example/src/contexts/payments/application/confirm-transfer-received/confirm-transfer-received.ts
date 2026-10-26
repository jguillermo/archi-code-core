import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import {
  AggregateNotFoundException,
  NotAllowedException,
  UseCase,
  ValueObjectBuilder,
} from '../../../../ddd/application';
import type { Clock, EventBus } from '../../../../ddd/application';
import { Money } from '../../../shared-kernel/money/Money';
import type { Currency } from '../../../shared-kernel/money/MoneyCurrency';
import type { Payment } from '../../domain/aggregate/Payment';
import type { MoneyData } from '../request-payment/money-data';
import { PaymentId } from '../../domain/value-object/PaymentId';
import { StaffRole } from '../../domain/value-object/StaffRoleType';
import { StaffRoleType } from '../../domain/value-object/StaffRoleType';

export interface ConfirmTransferReceivedInput {
  actorRole: string;
  paymentId: string;
  received: MoneyData;
}

export interface ConfirmTransferReceivedCommand {
  actorRole: StaffRoleType;
  paymentId: PaymentId;
  received: Money;
}

export class ConfirmTransferReceived extends UseCase<
  ConfirmTransferReceivedInput,
  ConfirmTransferReceivedCommand,
  void
> {
  constructor(
    private readonly payments: AggregateFinder<Payment> & AggregateSaver<Payment>,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: ConfirmTransferReceivedInput): ConfirmTransferReceivedCommand {
    return ValueObjectBuilder.build({
      actorRole: () => new StaffRoleType(input.actorRole as StaffRole),
      paymentId: () => new PaymentId(input.paymentId),
      received: () =>
        Money.fromPrimitives(input.received as { amount: number; currency: Currency }),
    });
  }

  protected async handle(command: ConfirmTransferReceivedCommand): Promise<void> {
    if (command.actorRole.value !== StaffRole.TREASURY) {
      throw new NotAllowedException(
        `The role ${command.actorRole.value} may not confirm transfers`,
      );
    }
    const payment = await this.payments.findById(command.paymentId);
    if (payment === null) {
      throw new AggregateNotFoundException('Payment', command.paymentId.value);
    }
    payment.confirmTransfer(command.received, this.clock);
    await this.payments.save(payment);
    await this.events.publish(payment.pullDomainEvents());
  }
}
