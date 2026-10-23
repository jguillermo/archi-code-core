import { EventListener, ListensTo } from '../../../../ddd/application';
import { OrderPaid } from './order-paid';
import type { PrepareShipment } from './prepare-shipment';

@ListensTo(OrderPaid, { consumer: 'shipping.prepare-shipment-on-order-paid' })
export class PrepareShipmentOnOrderPaid extends EventListener<OrderPaid> {
  constructor(private readonly prepareShipment: PrepareShipment) {
    super();
  }

  async handle(event: OrderPaid): Promise<void> {
    await this.prepareShipment.execute({
      orderId: event.orderId,
      address: event.address,
      items: event.items,
      giftWrap: event.giftWrap,
    });
  }
}
