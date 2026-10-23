import type { EventBase } from '../../ddd/domain';
import type { Clock, Logger } from '../../ddd/application';
import { DomainEventBus, EventRegistry } from '../../ddd/infrastructure';
import type { EventChannel, Subscription } from '../../ddd/infrastructure';
import { CancelShipment } from './application/cancel-shipment/cancel-shipment';
import { CancelShipmentOnOrderCancelled } from './application/cancel-shipment/cancel-shipment-on-order-cancelled';
import { OrderCancelled } from './application/cancel-shipment/order-cancelled';
import { DeliverShipment } from './application/deliver-shipment/deliver-shipment';
import { DispatchShipment } from './application/dispatch-shipment/dispatch-shipment';
import { OrderPaid } from './application/prepare-shipment/order-paid';
import type { PaidOrderAddress, PaidOrderItem } from './application/prepare-shipment/order-paid';
import { PrepareShipment } from './application/prepare-shipment/prepare-shipment';
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
    const bus = new DomainEventBus<EventBase>(channel, ShippingContext.registry(), logger);
    const shipments = new InMemoryShipmentRepository();
    const subscriptions = [
      await bus.subscribe(
        new PrepareShipmentOnOrderPaid(new PrepareShipment(shipments, bus, clock)),
      ),
      await bus.subscribe(
        new CancelShipmentOnOrderCancelled(new CancelShipment(shipments, bus, clock)),
      ),
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

  private static registry(): EventRegistry<EventBase> {
    return new EventRegistry<EventBase>()
      .register(
        OrderPaid,
        (json) =>
          new OrderPaid(
            json.orderId as string,
            json.address as PaidOrderAddress,
            json.items as PaidOrderItem[],
            json.giftWrap as boolean,
            json,
          ),
      )
      .register(OrderCancelled, (json) => new OrderCancelled(json.orderId as string, json));
  }
}
