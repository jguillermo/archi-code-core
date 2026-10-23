import { EventListener, ListensTo } from '../../../../ddd/application';
import type { AdjustPaymentAmount } from './adjust-payment-amount';
import { OrderLineQuantityChanged } from './order-line-quantity-changed';

@ListensTo(OrderLineQuantityChanged, {
  consumer: 'payments.adjust-payment-amount-on-order-line-quantity-changed',
})
export class AdjustPaymentAmountOnOrderLineQuantityChanged extends EventListener<OrderLineQuantityChanged> {
  constructor(private readonly adjustPaymentAmount: AdjustPaymentAmount) {
    super();
  }

  async handle(event: OrderLineQuantityChanged): Promise<void> {
    await this.adjustPaymentAmount.execute({ orderId: event.orderId, amount: event.total });
  }
}
