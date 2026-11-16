import { Validations } from '@archi-code/validation';
import { Composite } from '@archi-code/ddd/domain';
import { DeclineReason } from './DeclineReason';
import { GatewayChargeId } from './GatewayChargeId';

@Validations([
  {
    custom: 'chargedOrDeclined',
    fn: (outcome) =>
      (outcome as ChargeOutcome).chargeId.isNull !==
      (outcome as ChargeOutcome).declineReason.isNull,
    message: 'A charge either succeeds with an id or is declined with a reason',
  },
])
export class ChargeOutcome extends Composite({
  chargeId: GatewayChargeId,
  declineReason: DeclineReason,
}) {
  succeeded(): boolean {
    return !this.chargeId.isNull;
  }
}
