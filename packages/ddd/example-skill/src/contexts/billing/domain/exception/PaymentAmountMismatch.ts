import { DomainException } from '@archi-code/ddd/domain';

export class PaymentAmountMismatch extends DomainException {
  constructor(invoiceId: string, expected: number, offered: number) {
    super(`Invoice ${invoiceId} is for ${expected} cents, not ${offered}`, ['BIL003']);
  }
}
