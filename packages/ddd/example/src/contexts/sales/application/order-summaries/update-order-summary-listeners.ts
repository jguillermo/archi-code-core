import { EventListener, ListensTo } from '../../../../ddd/application';
import {
  OrderCancelled,
  OrderDelivered,
  OrderLineQuantityChanged,
  OrderPaid,
  OrderPlaced,
  OrderShipped,
} from '../../domain/order/order-events';
import { OrderStatus } from '../../domain/order/order-status';
import type { ProjectOrderSummary } from './project-order-summary';

@ListensTo(OrderPlaced, { consumer: 'sales.update-order-summary-on-order-placed' })
export class UpdateOrderSummaryOnOrderPlaced extends EventListener<OrderPlaced> {
  constructor(private readonly projectOrderSummary: ProjectOrderSummary) {
    super();
  }

  async handle(event: OrderPlaced): Promise<void> {
    await this.projectOrderSummary.execute({
      eventId: event.eventId,
      orderId: event.orderId,
      occurredOn: event.occurredOn,
      changes: {
        customerId: event.customerId,
        status: OrderStatus.PENDING_PAYMENT,
        total: event.total,
        items: event.lines.reduce((items, line) => items + line.quantity, 0),
      },
    });
  }
}

@ListensTo(OrderLineQuantityChanged, {
  consumer: 'sales.update-order-summary-on-order-line-quantity-changed',
})
export class UpdateOrderSummaryOnOrderLineQuantityChanged extends EventListener<OrderLineQuantityChanged> {
  constructor(private readonly projectOrderSummary: ProjectOrderSummary) {
    super();
  }

  async handle(event: OrderLineQuantityChanged): Promise<void> {
    await this.projectOrderSummary.execute({
      eventId: event.eventId,
      orderId: event.orderId,
      occurredOn: event.occurredOn,
      changes: { total: event.total },
    });
  }
}

@ListensTo(OrderPaid, { consumer: 'sales.update-order-summary-on-order-paid' })
export class UpdateOrderSummaryOnOrderPaid extends EventListener<OrderPaid> {
  constructor(private readonly projectOrderSummary: ProjectOrderSummary) {
    super();
  }

  async handle(event: OrderPaid): Promise<void> {
    await this.projectOrderSummary.execute({
      eventId: event.eventId,
      orderId: event.orderId,
      occurredOn: event.occurredOn,
      changes: {
        status: OrderStatus.PAID,
        items: event.items.reduce((items, item) => items + item.quantity, 0),
      },
    });
  }
}

@ListensTo(OrderCancelled, { consumer: 'sales.update-order-summary-on-order-cancelled' })
export class UpdateOrderSummaryOnOrderCancelled extends EventListener<OrderCancelled> {
  constructor(private readonly projectOrderSummary: ProjectOrderSummary) {
    super();
  }

  async handle(event: OrderCancelled): Promise<void> {
    await this.projectOrderSummary.execute({
      eventId: event.eventId,
      orderId: event.orderId,
      occurredOn: event.occurredOn,
      changes: { status: OrderStatus.CANCELLED },
    });
  }
}

@ListensTo(OrderShipped, { consumer: 'sales.update-order-summary-on-order-shipped' })
export class UpdateOrderSummaryOnOrderShipped extends EventListener<OrderShipped> {
  constructor(private readonly projectOrderSummary: ProjectOrderSummary) {
    super();
  }

  async handle(event: OrderShipped): Promise<void> {
    await this.projectOrderSummary.execute({
      eventId: event.eventId,
      orderId: event.orderId,
      occurredOn: event.occurredOn,
      changes: { status: OrderStatus.SHIPPED, trackingNumber: event.trackingNumber },
    });
  }
}

@ListensTo(OrderDelivered, { consumer: 'sales.update-order-summary-on-order-delivered' })
export class UpdateOrderSummaryOnOrderDelivered extends EventListener<OrderDelivered> {
  constructor(private readonly projectOrderSummary: ProjectOrderSummary) {
    super();
  }

  async handle(event: OrderDelivered): Promise<void> {
    await this.projectOrderSummary.execute({
      eventId: event.eventId,
      orderId: event.orderId,
      occurredOn: event.occurredOn,
      changes: { status: OrderStatus.DELIVERED },
    });
  }
}
