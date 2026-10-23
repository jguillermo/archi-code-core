import { EventListener, ListensTo } from '../../../../ddd/application';
import type { CancelUnpaidOrder } from './cancel-unpaid-order';
import { PaymentRejected } from './payment-rejected';

@ListensTo(PaymentRejected, { consumer: 'sales.cancel-unpaid-order-on-payment-rejected' })
export class CancelUnpaidOrderOnPaymentRejected extends EventListener<PaymentRejected> {
  constructor(private readonly cancelUnpaidOrder: CancelUnpaidOrder) {
    super();
  }

  async handle(event: PaymentRejected): Promise<void> {
    await this.cancelUnpaidOrder.execute({ orderId: event.orderId, reason: event.reason });
  }
}
