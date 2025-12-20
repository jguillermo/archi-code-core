import { AbstractEnumType, AddValidate } from '@code-core/domain';

enum EnumAccountStatus {
  ACTIVE = 'Active',
  CLOSED = 'Closed',
}

@AddValidate([{ validator: 'IsEnum', value: EnumAccountStatus }, { validator: 'IsNotEmpty' }])
export class AccountStatus extends AbstractEnumType<EnumAccountStatus> {
  protected getEnum(): Record<string, EnumAccountStatus> {
    return EnumAccountStatus;
  }

  static enum() {
    return EnumAccountStatus;
  }

  static active(): AccountStatus {
    return new AccountStatus(EnumAccountStatus.ACTIVE);
  }

  isClosed(): boolean {
    return this.value === EnumAccountStatus.CLOSED;
  }

  toClose(): void {
    this._value = EnumAccountStatus.CLOSED;
  }
}
