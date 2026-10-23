import { EventListener, ListensTo } from '../../../../ddd/application';
import type { MarkOrderShipped } from './mark-order-shipped';
import { ShipmentDispatched } from './shipment-dispatched';

@ListensTo(ShipmentDispatched, { consumer: 'sales.mark-order-shipped-on-shipment-dispatched' })
export class MarkOrderShippedOnShipmentDispatched extends EventListener<ShipmentDispatched> {
  constructor(private readonly markOrderShipped: MarkOrderShipped) {
    super();
  }

  async handle(event: ShipmentDispatched): Promise<void> {
    await this.markOrderShipped.execute({
      orderId: event.orderId,
      trackingNumber: event.trackingNumber,
    });
  }
}
