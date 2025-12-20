import { AbstractEnumType, AddValidate } from '@code-core/domain';

enum EnumAccountType {
  REAL = 'Real',
  VIRTUAL = 'Virtual',
}

@AddValidate([{ validator: 'IsEnum', value: EnumAccountType }, { validator: 'IsNotEmpty' }])
export class AccountType extends AbstractEnumType<EnumAccountType> {
  protected getEnum(): Record<string, EnumAccountType> {
    return EnumAccountType;
  }

  static enum() {
    return EnumAccountType;
  }

  isReal(): boolean {
    return this.value === EnumAccountType.REAL;
  }

  isVirtual(): boolean {
    return this.value === EnumAccountType.VIRTUAL;
  }
}
