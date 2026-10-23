import { EventListener, ListensTo } from '../../../../ddd/application';
import type { CancelShipment } from './cancel-shipment';
import { OrderCancelled } from './order-cancelled';

@ListensTo(OrderCancelled, { consumer: 'shipping.cancel-shipment-on-order-cancelled' })
export class CancelShipmentOnOrderCancelled extends EventListener<OrderCancelled> {
  constructor(private readonly cancelShipment: CancelShipment) {
    super();
  }

  async handle(event: OrderCancelled): Promise<void> {
    await this.cancelShipment.execute({ orderId: event.orderId });
  }
}
