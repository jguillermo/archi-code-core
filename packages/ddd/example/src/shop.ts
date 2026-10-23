import type { Clock, Logger } from './ddd/application';
import { InMemoryEventChannel } from './ddd/infrastructure';
import { PaymentsContext } from './contexts/payments/composition';
import { SalesContext } from './contexts/sales/composition';
import type { MarketingCampaign } from './contexts/sales/infrastructure/coupon/in-memory-coupon-catalog';
import { ShippingContext } from './contexts/shipping/composition';

export interface ShopSettings {
  clock: Clock;
  logger: Logger;
  campaigns?: readonly MarketingCampaign[];
}

export class Shop {
  private constructor(
    readonly channel: InMemoryEventChannel,
    readonly sales: SalesContext,
    readonly payments: PaymentsContext,
    readonly shipping: ShippingContext,
  ) {}

  static async open({ clock, logger, campaigns = [] }: ShopSettings): Promise<Shop> {
    const channel = new InMemoryEventChannel({ delivery: 'serial' });
    const sales = await SalesContext.start({ channel, clock, logger, campaigns });
    const payments = await PaymentsContext.start({ channel, clock, logger });
    const shipping = await ShippingContext.start({ channel, clock, logger });
    return new Shop(channel, sales, payments, shipping);
  }

  async close(): Promise<void> {
    await this.shipping.stop();
    await this.payments.stop();
    await this.sales.stop();
  }
}
