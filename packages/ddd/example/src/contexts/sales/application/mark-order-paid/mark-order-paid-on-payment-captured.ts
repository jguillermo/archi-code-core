import { EventListener, ListensTo } from '../../../../ddd/application';
import type { MarkOrderPaid } from './mark-order-paid';
import { PaymentCaptured } from './payment-captured';

@ListensTo(PaymentCaptured, { consumer: 'sales.mark-order-paid-on-payment-captured' })
export class MarkOrderPaidOnPaymentCaptured extends EventListener<PaymentCaptured> {
  constructor(private readonly markOrderPaid: MarkOrderPaid) {
    super();
  }

  async handle(event: PaymentCaptured): Promise<void> {
    await this.markOrderPaid.execute({ orderId: event.orderId, paymentId: event.paymentId });
  }
}
