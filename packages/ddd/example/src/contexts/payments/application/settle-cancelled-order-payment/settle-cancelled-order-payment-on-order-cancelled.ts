import { EventListener, ListensTo } from '../../../../ddd/application';
import { OrderCancelled } from './order-cancelled';
import type { SettleCancelledOrderPayment } from './settle-cancelled-order-payment';

@ListensTo(OrderCancelled, {
  consumer: 'payments.settle-cancelled-order-payment-on-order-cancelled',
})
export class SettleCancelledOrderPaymentOnOrderCancelled extends EventListener<OrderCancelled> {
  constructor(private readonly settleCancelledOrderPayment: SettleCancelledOrderPayment) {
    super();
  }

  async handle(event: OrderCancelled): Promise<void> {
    await this.settleCancelledOrderPayment.execute({ orderId: event.orderId });
  }
}
