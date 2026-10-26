import { DomainException } from '../../../../ddd/domain';

export class PaymentNotAwaitingTransfer extends DomainException {
  constructor(paymentId: string, status: string) {
    super(`Payment ${paymentId} is ${status}, not awaiting a transfer`, ['PAY001']);
  }
}
