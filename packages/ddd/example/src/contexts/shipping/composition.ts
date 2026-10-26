import type { Clock, Logger } from '../../ddd/application';
import { DomainEventBus, EventRegistry } from '../../ddd/infrastructure';
import type { EventChannel, Subscription } from '../../ddd/infrastructure';
import { CancelShipmentOnOrderCancelled } from './application/cancel-shipment/cancel-shipment-on-order-cancelled';
import { OrderCancelledDomainEvent } from './application/cancel-shipment/order-cancelled-domain-event';
import { DeliverShipment } from './application/deliver-shipment/deliver-shipment';
import { DispatchShipment } from './application/dispatch-shipment/dispatch-shipment';
import { OrderPaidDomainEvent } from './application/prepare-shipment/order-paid-domain-event';
import type { PaidOrderAddress } from './application/prepare-shipment/paid-order-address';
import type { PaidOrderItem } from './application/prepare-shipment/paid-order-item';
import { PrepareShipmentOnOrderPaid } from './application/prepare-shipment/prepare-shipment-on-order-paid';
import { InMemoryShipmentRepository } from './infrastructure/persistence/in-memory-shipment-repository';
import { ShipmentsController } from './interfaces/http/shipments-controller';

export interface ShippingSettings {
  channel: EventChannel;
  clock: Clock;
  logger: Logger;
}

export class ShippingContext {
  private constructor(
    readonly shipments: InMemoryShipmentRepository,
    readonly controller: ShipmentsController,
    private readonly subscriptions: Subscription[],
  ) {}

  static async start({ channel, clock, logger }: ShippingSettings): Promise<ShippingContext> {
    const bus = new DomainEventBus(channel, ShippingContext.registry(), logger);
    const shipments = new InMemoryShipmentRepository();
    const subscriptions = [
      await bus.subscribe(new PrepareShipmentOnOrderPaid(shipments, bus, clock)),
      await bus.subscribe(new CancelShipmentOnOrderCancelled(shipments, bus, clock)),
    ];
    const controller = new ShipmentsController(
      new DispatchShipment(shipments, bus, clock),
      new DeliverShipment(shipments, bus, clock),
      logger,
    );
    return new ShippingContext(shipments, controller, subscriptions);
  }

  async stop(): Promise<void> {
    for (const subscription of this.subscriptions.splice(0)) {
      await subscription.unsubscribe();
    }
  }

  private static registry(): EventRegistry {
    return new EventRegistry()
      .register(
        OrderPaidDomainEvent,
        (json) =>
          new OrderPaidDomainEvent({
            orderId: json.orderId as string,
            address: json.address as PaidOrderAddress,
            items: json.items as PaidOrderItem[],
            giftWrap: json.giftWrap as boolean,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        OrderCancelledDomainEvent,
        (json) =>
          new OrderCancelledDomainEvent({
            orderId: json.orderId as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      );
  }
}
