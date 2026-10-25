import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class OrderShippingAddressChangedDomainEvent extends EventBase {
  static readonly eventName = 'order.shipping_address_changed';

  readonly orderId: string;
  readonly address: {
    recipient: { name: string; phone: string };
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };

  constructor({
    orderId,
    address,
    eventId,
    occurredOn,
    clock,
  }: {
    orderId: string;
    address: {
      recipient: { name: string; phone: string };
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.address = address;
  }
}
