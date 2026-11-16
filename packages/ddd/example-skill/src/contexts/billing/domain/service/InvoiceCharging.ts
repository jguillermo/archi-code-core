import type { Invoice } from '../aggregate/Invoice';
import type { PaymentGateway } from './PaymentGateway';

export class InvoiceCharging {
  constructor(private readonly gateway: PaymentGateway) {}

  async charge(invoice: Invoice): Promise<void> {
    if (!invoice.awaitsCharge()) {
      return;
    }
    invoice.recordChargeOutcome(await this.gateway.charge(invoice.id, invoice.amount));
  }

  async refund(invoice: Invoice): Promise<void> {
    if (!invoice.awaitsRefund()) {
      return;
    }
    await this.gateway.refund(invoice.id, invoice.charge, invoice.amount);
    invoice.recordRefund();
  }
}
