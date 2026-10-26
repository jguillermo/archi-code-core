import { AggregateRepository } from '../../../../ddd/domain';
import type { AggregateFinder, AggregateSaver } from '../../../../ddd/domain';
import type { Payment } from '../aggregate/Payment';
import type { PaymentId } from '../value-object/PaymentId';

export abstract class PaymentRepository
  extends AggregateRepository<Payment>
  implements AggregateFinder<Payment>, AggregateSaver<Payment>
{
  abstract findById(id: PaymentId): Promise<Payment | null>;
  abstract save(payment: Payment): Promise<void>;
}
