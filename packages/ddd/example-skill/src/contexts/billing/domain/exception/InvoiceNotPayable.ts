import { DomainException } from '@archi-code/ddd/domain';

export class InvoiceNotPayable extends DomainException {
  constructor(invoiceId: string, status: string) {
    super(`Invoice ${invoiceId} is ${status} and cannot be paid`, ['BIL002']);
  }
}
