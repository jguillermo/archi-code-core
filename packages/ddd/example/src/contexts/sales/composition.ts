import type { EventBase } from '../../ddd/domain';
import type { Clock, Logger } from '../../ddd/application';
import { DomainEventBus, EventRegistry } from '../../ddd/infrastructure';
import type { EventChannel, Subscription } from '../../ddd/infrastructure';
import { CancelOrder } from './application/cancel-order/cancel-order';
import { CancelUnpaidOrder } from './application/cancel-unpaid-order/cancel-unpaid-order';
import { CancelUnpaidOrderOnPaymentRejected } from './application/cancel-unpaid-order/cancel-unpaid-order-on-payment-rejected';
import { PaymentRejected } from './application/cancel-unpaid-order/payment-rejected';
import { ChangeOrderLineQuantity } from './application/change-order-line-quantity/change-order-line-quantity';
import { ChangeShippingAddress } from './application/change-shipping-address/change-shipping-address';
import { DiscardCancelledOrder } from './application/discard-cancelled-order/discard-cancelled-order';
import { MarkOrderDelivered } from './application/mark-order-delivered/mark-order-delivered';
import { MarkOrderDeliveredOnShipmentDelivered } from './application/mark-order-delivered/mark-order-delivered-on-shipment-delivered';
import { ShipmentDelivered } from './application/mark-order-delivered/shipment-delivered';
import { MarkOrderPaid } from './application/mark-order-paid/mark-order-paid';
import { MarkOrderPaidOnPaymentCaptured } from './application/mark-order-paid/mark-order-paid-on-payment-captured';
import { PaymentCaptured } from './application/mark-order-paid/payment-captured';
import { MarkOrderShipped } from './application/mark-order-shipped/mark-order-shipped';
import { MarkOrderShippedOnShipmentDispatched } from './application/mark-order-shipped/mark-order-shipped-on-shipment-dispatched';
import { ShipmentDispatched } from './application/mark-order-shipped/shipment-dispatched';
import { ProjectOrderSummary } from './application/order-summaries/project-order-summary';
import {
  UpdateOrderSummaryOnOrderCancelled,
  UpdateOrderSummaryOnOrderDelivered,
  UpdateOrderSummaryOnOrderLineQuantityChanged,
  UpdateOrderSummaryOnOrderPaid,
  UpdateOrderSummaryOnOrderPlaced,
  UpdateOrderSummaryOnOrderShipped,
} from './application/order-summaries/update-order-summary-listeners';
import { PlaceOrder } from './application/place-order/place-order';
import { OrderPricing } from './domain/coupon/order-pricing';
import {
  OrderCancelled,
  OrderDelivered,
  OrderLineQuantityChanged,
  OrderPaid,
  OrderPlaced,
  OrderShipped,
  ShippingAddressChanged,
} from './domain/order/order-events';
import type { AddressData, ItemData, MoneyData, PlacedLineData } from './domain/order/order-events';
import { InMemoryCouponCatalog } from './infrastructure/coupon/in-memory-coupon-catalog';
import type { MarketingCampaign } from './infrastructure/coupon/in-memory-coupon-catalog';
import { InMemoryOrderRepository } from './infrastructure/persistence/in-memory-order-repository';
import { InMemoryOrderSummaryStore } from './infrastructure/read-model/in-memory-order-summary-store';
import { OrdersController } from './interfaces/http/orders-controller';

export interface SalesSettings {
  channel: EventChannel;
  clock: Clock;
  logger: Logger;
  campaigns: readonly MarketingCampaign[];
}

export class SalesContext {
  private constructor(
    readonly orders: InMemoryOrderRepository,
    readonly summaries: InMemoryOrderSummaryStore,
    readonly controller: OrdersController,
    private readonly subscriptions: Subscription[],
  ) {}

  static async start({ channel, clock, logger, campaigns }: SalesSettings): Promise<SalesContext> {
    const bus = new DomainEventBus<EventBase>(channel, SalesContext.registry(), logger);
    const orders = new InMemoryOrderRepository();
    const summaries = new InMemoryOrderSummaryStore();
    const pricing = new OrderPricing(new InMemoryCouponCatalog(campaigns));
    const projectOrderSummary = new ProjectOrderSummary(summaries);

    const listeners = [
      new UpdateOrderSummaryOnOrderPlaced(projectOrderSummary),
      new UpdateOrderSummaryOnOrderLineQuantityChanged(projectOrderSummary),
      new UpdateOrderSummaryOnOrderPaid(projectOrderSummary),
      new UpdateOrderSummaryOnOrderCancelled(projectOrderSummary),
      new UpdateOrderSummaryOnOrderShipped(projectOrderSummary),
      new UpdateOrderSummaryOnOrderDelivered(projectOrderSummary),
      new MarkOrderPaidOnPaymentCaptured(new MarkOrderPaid(orders, bus, clock)),
      new CancelUnpaidOrderOnPaymentRejected(new CancelUnpaidOrder(orders, bus, clock, logger)),
      new MarkOrderShippedOnShipmentDispatched(new MarkOrderShipped(orders, bus, clock)),
      new MarkOrderDeliveredOnShipmentDelivered(new MarkOrderDelivered(orders, bus, clock)),
    ];
    const subscriptions: Subscription[] = [];
    for (const listener of listeners) {
      subscriptions.push(await bus.subscribe(listener));
    }

    const controller = new OrdersController(
      {
        placeOrder: new PlaceOrder(orders, pricing, bus, clock),
        changeOrderLineQuantity: new ChangeOrderLineQuantity(orders, bus, clock),
        changeShippingAddress: new ChangeShippingAddress(orders, bus, clock),
        cancelOrder: new CancelOrder(orders, bus, clock),
        discardCancelledOrder: new DiscardCancelledOrder(orders),
      },
      summaries,
      logger,
    );
    return new SalesContext(orders, summaries, controller, subscriptions);
  }

  async stop(): Promise<void> {
    for (const subscription of this.subscriptions.splice(0)) {
      await subscription.unsubscribe();
    }
  }

  private static registry(): EventRegistry<EventBase> {
    return new EventRegistry<EventBase>()
      .register(
        OrderPlaced,
        (json) =>
          new OrderPlaced(
            json.orderId as string,
            json.customerId as string,
            json.lines as PlacedLineData[],
            json.total as MoneyData,
            json.paymentMethod as string,
            json.freeShipping as boolean,
            json,
          ),
      )
      .register(
        OrderLineQuantityChanged,
        (json) =>
          new OrderLineQuantityChanged(
            json.orderId as string,
            json.lineNumber as number,
            json.quantity as number,
            json.total as MoneyData,
            json,
          ),
      )
      .register(
        ShippingAddressChanged,
        (json) =>
          new ShippingAddressChanged(json.orderId as string, json.address as AddressData, json),
      )
      .register(
        OrderPaid,
        (json) =>
          new OrderPaid(
            json.orderId as string,
            json.paymentId as string,
            json.address as AddressData,
            json.items as ItemData[],
            json.giftWrap as boolean,
            json,
          ),
      )
      .register(
        OrderCancelled,
        (json) =>
          new OrderCancelled(
            json.orderId as string,
            json.reason as string,
            json.wasPaid as boolean,
            json,
          ),
      )
      .register(
        OrderShipped,
        (json) => new OrderShipped(json.orderId as string, json.trackingNumber as string, json),
      )
      .register(OrderDelivered, (json) => new OrderDelivered(json.orderId as string, json))
      .register(
        PaymentCaptured,
        (json) =>
          new PaymentCaptured(
            json.paymentId as string,
            json.orderId as string,
            json.amount as MoneyData,
            json,
          ),
      )
      .register(
        PaymentRejected,
        (json) =>
          new PaymentRejected(
            json.paymentId as string,
            json.orderId as string,
            json.amount as MoneyData,
            json.reason as string,
            json,
          ),
      )
      .register(
        ShipmentDispatched,
        (json) =>
          new ShipmentDispatched(
            json.shipmentId as string,
            json.orderId as string,
            json.trackingNumber as string,
            json.carrier as string,
            json,
          ),
      )
      .register(
        ShipmentDelivered,
        (json) => new ShipmentDelivered(json.shipmentId as string, json.orderId as string, json),
      );
  }
}
