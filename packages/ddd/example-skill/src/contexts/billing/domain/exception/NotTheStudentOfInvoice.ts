import { DomainException } from '@archi-code/ddd/domain';

export class NotTheStudentOfInvoice extends DomainException {
  constructor(invoiceId: string) {
    super(`Only the student of invoice ${invoiceId} may pay it`, ['BIL001']);
  }
}
