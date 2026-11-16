import { InternalErrorException } from '@archi-code/ddd/infrastructure';
import type { Money } from '../../../shared-kernel/money/Money';
import type { PaymentGateway } from '../../domain/service/PaymentGateway';
import { ChargeOutcome } from '../../domain/value-object/ChargeOutcome';
import type { GatewayChargeId } from '../../domain/value-object/GatewayChargeId';
import type { InvoiceId } from '../../domain/value-object/InvoiceId';

export interface InMemoryPaymentGatewaySettings {
  declineAboveCents: number | null;
}

interface GatewayCharge {
  chargeId: string | null;
  declineReason: string | null;
  refunded: boolean;
}

export class InMemoryPaymentGateway implements PaymentGateway {
  private readonly charges = new Map<string, GatewayCharge>();

  constructor(private readonly settings: InMemoryPaymentGatewaySettings) {}

  async charge(invoice: InvoiceId, amount: Money): Promise<ChargeOutcome> {
    const charge = this.charges.get(invoice.value) ?? this.decide(amount);
    this.charges.set(invoice.value, charge);
    try {
      return ChargeOutcome.fromPrimitives({
        chargeId: charge.chargeId,
        declineReason: charge.declineReason,
      });
    } catch (error) {
      throw new InternalErrorException(`reading the charge of invoice ${invoice.value}`, {
        cause: error,
      });
    }
  }

  async refund(invoice: InvoiceId, charge: GatewayChargeId, amount: Money): Promise<void> {
    const recorded = this.charges.get(invoice.value);
    if (recorded === undefined || recorded.chargeId !== charge.value) {
      throw new InternalErrorException(
        `refunding ${amount.amount.value} of an unknown charge of invoice ${invoice.value}`,
      );
    }
    recorded.refunded = true;
  }

  private decide(amount: Money): GatewayCharge {
    const limit = this.settings.declineAboveCents;
    if (limit !== null && amount.amount.value > limit) {
      return { chargeId: null, declineReason: 'insufficient_funds', refunded: false };
    }
    return { chargeId: `ch_${crypto.randomUUID()}`, declineReason: null, refunded: false };
  }
}
