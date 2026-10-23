import { EventListener, ListensTo } from '../../../../ddd/application';
import type { MarkOrderDelivered } from './mark-order-delivered';
import { ShipmentDelivered } from './shipment-delivered';

@ListensTo(ShipmentDelivered, { consumer: 'sales.mark-order-delivered-on-shipment-delivered' })
export class MarkOrderDeliveredOnShipmentDelivered extends EventListener<ShipmentDelivered> {
  constructor(private readonly markOrderDelivered: MarkOrderDelivered) {
    super();
  }

  async handle(event: ShipmentDelivered): Promise<void> {
    await this.markOrderDelivered.execute({ orderId: event.orderId });
  }
}
