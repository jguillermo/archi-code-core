import { EnumType, Required } from '../../../../ddd/domain';

export enum PaymentMethod {
  CARD = 'card',
  TRANSFER = 'transfer',
}

export class PaymentMethodOption extends EnumType<PaymentMethod> {
  protected getEnum(): typeof PaymentMethod {
    return PaymentMethod;
  }
}

export class PaymentMethodType extends Required(PaymentMethodOption) {}
