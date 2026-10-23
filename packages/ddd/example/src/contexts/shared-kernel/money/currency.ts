import { EnumType, Required } from '../../../ddd/domain';

export enum Currency {
  EUR = 'EUR',
  USD = 'USD',
  GBP = 'GBP',
}

export class CurrencyOption extends EnumType<Currency> {
  protected getEnum(): typeof Currency {
    return Currency;
  }
}

export class MoneyCurrency extends Required(CurrencyOption) {}
