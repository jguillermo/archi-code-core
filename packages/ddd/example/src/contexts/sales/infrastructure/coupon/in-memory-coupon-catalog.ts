import { InternalErrorException } from '../../../../ddd/infrastructure';
import type { CouponCatalog } from '../../domain/service/CouponCatalog';
import type { CouponCode } from '../../domain/value-object/CouponCode';
import { DiscountPercent } from '../../domain/value-object/DiscountPercent';

export interface MarketingCampaign {
  code: string;
  percentOff: number;
  active: boolean;
}

export class InMemoryCouponCatalog implements CouponCatalog {
  private readonly campaigns: ReadonlyMap<string, MarketingCampaign>;

  constructor(campaigns: readonly MarketingCampaign[]) {
    this.campaigns = new Map(campaigns.map((campaign) => [campaign.code, campaign]));
  }

  async discountOf(code: CouponCode): Promise<DiscountPercent | null> {
    const campaign = this.campaigns.get(code.value);
    if (campaign === undefined || !campaign.active) {
      return null;
    }
    try {
      return new DiscountPercent(campaign.percentOff);
    } catch (error) {
      throw new InternalErrorException(`the campaign ${campaign.code} has an invalid discount`, {
        cause: error,
      });
    }
  }
}
