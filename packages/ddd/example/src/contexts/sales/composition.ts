import type { Clock, Logger } from '../../ddd/application';
import { DomainEventBus, EventRegistry } from '../../ddd/infrastructure';
import type { EventChannel, Subscription } from '../../ddd/infrastructure';
import { CancelOrder } from './application/cancel-order/cancel-order';
import { CancelUnpaidOrderOnPaymentRejected } from './application/cancel-unpaid-order/cancel-unpaid-order-on-payment-rejected';
import { PaymentRejectedDomainEvent } from './application/cancel-unpaid-order/payment-rejected-domain-event';
import { ChangeOrderLineQuantity } from './application/change-order-line-quantity/change-order-line-quantity';
import { ChangeShippingAddress } from './application/change-shipping-address/change-shipping-address';
import { DiscardCancelledOrder } from './application/discard-cancelled-order/discard-cancelled-order';
import { MarkOrderDeliveredOnShipmentDelivered } from './application/mark-order-delivered/mark-order-delivered-on-shipment-delivered';
import { ShipmentDeliveredDomainEvent } from './application/mark-order-delivered/shipment-delivered-domain-event';
import { MarkOrderPaidOnPaymentCaptured } from './application/mark-order-paid/mark-order-paid-on-payment-captured';
import { PaymentCapturedDomainEvent } from './application/mark-order-paid/payment-captured-domain-event';
import { MarkOrderShippedOnShipmentDispatched } from './application/mark-order-shipped/mark-order-shipped-on-shipment-dispatched';
import { ShipmentDispatchedDomainEvent } from './application/mark-order-shipped/shipment-dispatched-domain-event';
import { MarkOrderSummaryCancelledOnOrderCancelled } from './application/order-summaries/mark-order-summary-cancelled/mark-order-summary-cancelled-on-order-cancelled';
import { MarkOrderSummaryDeliveredOnOrderDelivered } from './application/order-summaries/mark-order-summary-delivered/mark-order-summary-delivered-on-order-delivered';
import { MarkOrderSummaryPaidOnOrderPaid } from './application/order-summaries/mark-order-summary-paid/mark-order-summary-paid-on-order-paid';
import { MarkOrderSummaryShippedOnOrderShipped } from './application/order-summaries/mark-order-summary-shipped/mark-order-summary-shipped-on-order-shipped';
import { OpenOrderSummaryOnOrderCreated } from './application/order-summaries/open-order-summary/open-order-summary-on-order-created';
import { OrderSummaryProjection } from './application/order-summaries/order-summary-projection';
import { UpdateOrderSummaryTotalOnOrderLineQuantityChanged } from './application/order-summaries/update-order-summary-total/update-order-summary-total-on-order-line-quantity-changed';
import { PlaceOrder } from './application/place-order/place-order';
import { OrderPricing } from './domain/service/OrderPricing';
import { OrderCancelledDomainEvent } from './domain/event/OrderCancelledDomainEvent';
import { OrderDeliveredDomainEvent } from './domain/event/OrderDeliveredDomainEvent';
import { OrderLineQuantityChangedDomainEvent } from './domain/event/OrderLineQuantityChangedDomainEvent';
import { OrderPaidDomainEvent } from './domain/event/OrderPaidDomainEvent';
import { OrderCreatedDomainEvent } from './domain/event/OrderCreatedDomainEvent';
import { OrderShippedDomainEvent } from './domain/event/OrderShippedDomainEvent';
import { OrderShippingAddressChangedDomainEvent } from './domain/event/OrderShippingAddressChangedDomainEvent';
import type { AddressData } from './application/place-order/address-data';
import type { MoneyData } from './application/place-order/money-data';
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
    const bus = new DomainEventBus(channel, SalesContext.registry(), logger);
    const orders = new InMemoryOrderRepository();
    const summaries = new InMemoryOrderSummaryStore();
    const pricing = new OrderPricing(new InMemoryCouponCatalog(campaigns));
    const projection = new OrderSummaryProjection(summaries);

    const listeners = [
      new OpenOrderSummaryOnOrderCreated(projection),
      new UpdateOrderSummaryTotalOnOrderLineQuantityChanged(projection),
      new MarkOrderSummaryPaidOnOrderPaid(projection),
      new MarkOrderSummaryCancelledOnOrderCancelled(projection),
      new MarkOrderSummaryShippedOnOrderShipped(projection),
      new MarkOrderSummaryDeliveredOnOrderDelivered(projection),
      new MarkOrderPaidOnPaymentCaptured(orders, bus, clock),
      new CancelUnpaidOrderOnPaymentRejected(orders, bus, clock, logger),
      new MarkOrderShippedOnShipmentDispatched(orders, bus, clock),
      new MarkOrderDeliveredOnShipmentDelivered(orders, bus, clock),
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

  private static registry(): EventRegistry {
    return new EventRegistry()
      .register(
        OrderCreatedDomainEvent,
        (json) =>
          new OrderCreatedDomainEvent({
            orderId: json.orderId as string,
            customerId: json.customerId as string,
            lines: json.lines as {
              sku: string;
              quantity: number;
              unitPrice: { amount: number; currency: string };
            }[],
            total: json.total as MoneyData,
            paymentMethod: json.paymentMethod as string,
            freeShipping: json.freeShipping as boolean,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        OrderLineQuantityChangedDomainEvent,
        (json) =>
          new OrderLineQuantityChangedDomainEvent({
            orderId: json.orderId as string,
            lineNumber: json.lineNumber as number,
            quantity: json.quantity as number,
            total: json.total as MoneyData,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        OrderShippingAddressChangedDomainEvent,
        (json) =>
          new OrderShippingAddressChangedDomainEvent({
            orderId: json.orderId as string,
            address: json.address as AddressData,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        OrderPaidDomainEvent,
        (json) =>
          new OrderPaidDomainEvent({
            orderId: json.orderId as string,
            paymentId: json.paymentId as string,
            address: json.address as AddressData,
            items: json.items as { sku: string; quantity: number }[],
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
            reason: json.reason as string,
            wasPaid: json.wasPaid as boolean,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        OrderShippedDomainEvent,
        (json) =>
          new OrderShippedDomainEvent({
            orderId: json.orderId as string,
            trackingNumber: json.trackingNumber as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        OrderDeliveredDomainEvent,
        (json) =>
          new OrderDeliveredDomainEvent({
            orderId: json.orderId as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        PaymentCapturedDomainEvent,
        (json) =>
          new PaymentCapturedDomainEvent({
            paymentId: json.paymentId as string,
            orderId: json.orderId as string,
            amount: json.amount as MoneyData,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        PaymentRejectedDomainEvent,
        (json) =>
          new PaymentRejectedDomainEvent({
            paymentId: json.paymentId as string,
            orderId: json.orderId as string,
            amount: json.amount as MoneyData,
            reason: json.reason as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        ShipmentDispatchedDomainEvent,
        (json) =>
          new ShipmentDispatchedDomainEvent({
            shipmentId: json.shipmentId as string,
            orderId: json.orderId as string,
            trackingNumber: json.trackingNumber as string,
            carrier: json.carrier as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        ShipmentDeliveredDomainEvent,
        (json) =>
          new ShipmentDeliveredDomainEvent({
            shipmentId: json.shipmentId as string,
            orderId: json.orderId as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      );
  }
}
