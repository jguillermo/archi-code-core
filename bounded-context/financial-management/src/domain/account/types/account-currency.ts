import { AbstractEnumType, AddValidate } from '@code-core/domain';

enum CurrencyEnum {
  USD = 'USD',
  PEN = 'PEN',
}

@AddValidate([{ validator: 'IsEnum', value: CurrencyEnum }, { validator: 'IsNotEmpty' }])
export class AccountCurrency extends AbstractEnumType<CurrencyEnum> {
  static enum() {
    return CurrencyEnum;
  }

  protected getEnum(): Record<string, CurrencyEnum> {
    return CurrencyEnum;
  }
}
