import type { AggregateFinder, AggregateSaver, PrimitiveTypes } from '../../../../ddd/domain';
import { ConcurrencyException } from '../../../../ddd/application';
import { Payment } from '../../domain/payment/payment';
import type { PaymentId } from '../../domain/payment/payment-id';

interface PaymentRow {
  version: number;
  primitives: PrimitiveTypes<Payment>;
}

export class InMemoryPaymentRepository
  implements AggregateFinder<Payment>, AggregateSaver<Payment>
{
  private readonly rows = new Map<string, PaymentRow>();
  private readonly versions = new WeakMap<Payment, number>();

  async findById(id: PaymentId): Promise<Payment | null> {
    const row = this.rows.get(id.value);
    if (row === undefined) {
      return null;
    }
    const payment = Payment.fromPrimitives(structuredClone(row.primitives));
    this.versions.set(payment, row.version);
    return payment;
  }

  async save(payment: Payment): Promise<void> {
    const key = payment.id.value;
    const version = this.versions.get(payment) ?? 0;
    if ((this.rows.get(key)?.version ?? 0) !== version) {
      throw new ConcurrencyException('Payment', key, version);
    }
    this.rows.set(key, {
      version: version + 1,
      primitives: structuredClone(payment.toPrimitives()),
    });
    this.versions.set(payment, version + 1);
  }
}
