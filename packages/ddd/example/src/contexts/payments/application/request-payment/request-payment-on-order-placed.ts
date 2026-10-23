import { EventListener, ListensTo } from '../../../../ddd/application';
import { OrderPlaced } from './order-placed';
import type { RequestPayment } from './request-payment';

@ListensTo(OrderPlaced, { consumer: 'payments.request-payment-on-order-placed' })
export class RequestPaymentOnOrderPlaced extends EventListener<OrderPlaced> {
  constructor(private readonly requestPayment: RequestPayment) {
    super();
  }

  async handle(event: OrderPlaced): Promise<void> {
    await this.requestPayment.execute({
      orderId: event.orderId,
      amount: event.total,
      method: event.paymentMethod,
    });
  }
}
