import type { Logger } from './ddd/application';
import { InMemoryEventChannel } from './ddd/infrastructure';
import { PaymentsContext } from './contexts/payments/composition';
import { SalesContext } from './contexts/sales/composition';
import { ShippingContext } from './contexts/shipping/composition';

export interface ShopSettings {
  logger: Logger;
}

export class Shop {
  private constructor(
    readonly channel: InMemoryEventChannel,
    readonly sales: SalesContext,
    readonly payments: PaymentsContext,
    readonly shipping: ShippingContext,
  ) {}

  static async open({ logger }: ShopSettings): Promise<Shop> {
    const channel = new InMemoryEventChannel({ delivery: 'serial' });
    const sales = await SalesContext.start({ channel, logger });
    const payments = await PaymentsContext.start({ channel, logger });
    const shipping = await ShippingContext.start({ channel, logger });
    return new Shop(channel, sales, payments, shipping);
  }

  async close(): Promise<void> {
    await this.shipping.stop();
    await this.payments.stop();
    await this.sales.stop();
  }
}
