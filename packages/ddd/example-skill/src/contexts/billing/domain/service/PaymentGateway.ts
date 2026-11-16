import type { Money } from '../../../shared-kernel/money/Money';
import type { ChargeOutcome } from '../value-object/ChargeOutcome';
import type { GatewayChargeId } from '../value-object/GatewayChargeId';
import type { InvoiceId } from '../value-object/InvoiceId';

export interface PaymentGateway {
  charge(invoice: InvoiceId, amount: Money): Promise<ChargeOutcome>;
  refund(invoice: InvoiceId, charge: GatewayChargeId, amount: Money): Promise<void>;
}
