import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class OrderShippingAddressChangedDomainEvent extends EventBase {
  static readonly eventName = 'order.shipping_address_changed';

  readonly orderId: string;
  readonly address: { street: string; city: string; postalCode: string; country: string };

  constructor({
    orderId,
    address,
    eventId,
    occurredOn,
  }: {
    orderId: string;
    address: { street: string; city: string; postalCode: string; country: string };
  } & EventMetadata) {
    super({ eventId, occurredOn });
    this.orderId = orderId;
    this.address = address;
  }
}
