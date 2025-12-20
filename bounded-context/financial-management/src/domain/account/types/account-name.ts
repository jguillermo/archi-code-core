import { AddValidate, StringTypeRequired } from '@code-core/domain';

@AddValidate([
  { validator: 'MinLength', value: 3 },
  { validator: 'MaxLength', value: 50 },
])
export class AccountName extends StringTypeRequired {}
