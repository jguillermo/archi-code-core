import type { OrderCancelledDomainEvent } from './OrderCancelledDomainEvent';
import type { OrderDeliveredDomainEvent } from './OrderDeliveredDomainEvent';
import type { OrderLineQuantityChangedDomainEvent } from './OrderLineQuantityChangedDomainEvent';
import type { OrderPaidDomainEvent } from './OrderPaidDomainEvent';
import type { OrderCreatedDomainEvent } from './OrderCreatedDomainEvent';
import type { OrderShippedDomainEvent } from './OrderShippedDomainEvent';
import type { OrderShippingAddressChangedDomainEvent } from './OrderShippingAddressChangedDomainEvent';

export type OrderEvent =
  | OrderCreatedDomainEvent
  | OrderLineQuantityChangedDomainEvent
  | OrderShippingAddressChangedDomainEvent
  | OrderPaidDomainEvent
  | OrderCancelledDomainEvent
  | OrderShippedDomainEvent
  | OrderDeliveredDomainEvent;
