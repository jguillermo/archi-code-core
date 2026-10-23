import type { EventBase } from '../../ddd/domain';
import type { Clock, Logger } from '../../ddd/application';
import { DomainEventBus, EventRegistry } from '../../ddd/infrastructure';
import type { EventChannel, Subscription } from '../../ddd/infrastructure';
import { AdjustPaymentAmount } from './application/adjust-payment-amount/adjust-payment-amount';
import { AdjustPaymentAmountOnOrderLineQuantityChanged } from './application/adjust-payment-amount/adjust-payment-amount-on-order-line-quantity-changed';
import { OrderLineQuantityChanged } from './application/adjust-payment-amount/order-line-quantity-changed';
import { ConfirmTransferReceived } from './application/confirm-transfer-received/confirm-transfer-received';
import { OrderPlaced } from './application/request-payment/order-placed';
import { RequestPayment } from './application/request-payment/request-payment';
import { RequestPaymentOnOrderPlaced } from './application/request-payment/request-payment-on-order-placed';
import { OrderCancelled } from './application/settle-cancelled-order-payment/order-cancelled';
import { SettleCancelledOrderPayment } from './application/settle-cancelled-order-payment/settle-cancelled-order-payment';
import { SettleCancelledOrderPaymentOnOrderCancelled } from './application/settle-cancelled-order-payment/settle-cancelled-order-payment-on-order-cancelled';
import type { MoneyData } from './domain/payment/payment-events';
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
      new RequestPaymentOnOrderPlaced(new RequestPayment(payments, bus, clock)),
      new AdjustPaymentAmountOnOrderLineQuantityChanged(
        new AdjustPaymentAmount(payments, bus, clock),
      ),
      new SettleCancelledOrderPaymentOnOrderCancelled(
        new SettleCancelledOrderPayment(payments, bus, clock),
      ),
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
        OrderPlaced,
        (json) =>
          new OrderPlaced(
            json.orderId as string,
            json.total as MoneyData,
            json.paymentMethod as string,
            json,
          ),
      )
      .register(
        OrderLineQuantityChanged,
        (json) =>
          new OrderLineQuantityChanged(json.orderId as string, json.total as MoneyData, json),
      )
      .register(OrderCancelled, (json) => new OrderCancelled(json.orderId as string, json));
  }
}
