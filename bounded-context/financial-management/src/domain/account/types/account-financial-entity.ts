import { AddValidate, Level, StringTypeRequired } from '@code-core/domain';

@Level(2)
@AddValidate([{ validator: 'MinLength', value: 3 }])
export class AccountFinancialEntity extends StringTypeRequired {
  static empty() {
    return new AccountFinancialEntity('');
  }
}
