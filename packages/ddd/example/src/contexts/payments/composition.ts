import type { EventBase } from '../../ddd/domain';
import type { Clock, Logger } from '../../ddd/application';
import { DomainEventBus, EventRegistry } from '../../ddd/infrastructure';
import type { EventChannel, Subscription } from '../../ddd/infrastructure';
import { AdjustPaymentAmountOnOrderLineQuantityChanged } from './application/adjust-payment-amount/adjust-payment-amount-on-order-line-quantity-changed';
import { OrderLineQuantityChangedDomainEvent } from './application/adjust-payment-amount/order-line-quantity-changed-domain-event';
import { ConfirmTransferReceived } from './application/confirm-transfer-received/confirm-transfer-received';
import { OrderCreatedDomainEvent } from './application/request-payment/order-created-domain-event';
import { RequestPaymentOnOrderCreated } from './application/request-payment/request-payment-on-order-created';
import { OrderCancelledDomainEvent } from './application/settle-cancelled-order-payment/order-cancelled-domain-event';
import { SettleCancelledOrderPaymentOnOrderCancelled } from './application/settle-cancelled-order-payment/settle-cancelled-order-payment-on-order-cancelled';
import type { MoneyData } from './application/request-payment/money-data';
import { InMemoryPaymentRepository } from './infrastructure/persistence/in-memory-payment-repository';
import { PaymentsController } from './interfaces/http/payments-controller';

export interface PaymentsSettings {
  channel: EventChannel;
  clock: Clock;
  logger: Logger;
}

export class PaymentsContext {
  private constructor(
    readonly payments: InMemoryPaymentRepository,
    readonly controller: PaymentsController,
    private readonly subscriptions: Subscription[],
  ) {}

  static async start({ channel, clock, logger }: PaymentsSettings): Promise<PaymentsContext> {
    const bus = new DomainEventBus<EventBase>(channel, PaymentsContext.registry(), logger);
    const payments = new InMemoryPaymentRepository();
    const listeners = [
      new RequestPaymentOnOrderCreated(payments, bus, clock),
      new AdjustPaymentAmountOnOrderLineQuantityChanged(payments, bus, clock),
      new SettleCancelledOrderPaymentOnOrderCancelled(payments, bus, clock),
    ];
    const subscriptions: Subscription[] = [];
    for (const listener of listeners) {
      subscriptions.push(await bus.subscribe(listener));
    }
    const controller = new PaymentsController(
      new ConfirmTransferReceived(payments, bus, clock),
      logger,
    );
    return new PaymentsContext(payments, controller, subscriptions);
  }

  async stop(): Promise<void> {
    for (const subscription of this.subscriptions.splice(0)) {
      await subscription.unsubscribe();
    }
  }

  private static registry(): EventRegistry<EventBase> {
    return new EventRegistry<EventBase>()
      .register(
        OrderCreatedDomainEvent,
        (json) =>
          new OrderCreatedDomainEvent({
            orderId: json.orderId as string,
            total: json.total as MoneyData,
            paymentMethod: json.paymentMethod as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        OrderLineQuantityChangedDomainEvent,
        (json) =>
          new OrderLineQuantityChangedDomainEvent({
            orderId: json.orderId as string,
            total: json.total as MoneyData,
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
