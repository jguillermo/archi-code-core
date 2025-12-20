import { Level, StringTypeRequired } from '@code-core/domain';

@Level(2)
export class AccountNumber extends StringTypeRequired {
  static empty() {
    return new AccountNumber('');
  }
}
