import type { ShipmentCancelledDomainEvent } from './ShipmentCancelledDomainEvent';
import type { ShipmentDeliveredDomainEvent } from './ShipmentDeliveredDomainEvent';
import type { ShipmentDispatchedDomainEvent } from './ShipmentDispatchedDomainEvent';
import type { ShipmentCreatedDomainEvent } from './ShipmentCreatedDomainEvent';

export type ShipmentEvent =
  | ShipmentCreatedDomainEvent
  | ShipmentDispatchedDomainEvent
  | ShipmentDeliveredDomainEvent
  | ShipmentCancelledDomainEvent;
