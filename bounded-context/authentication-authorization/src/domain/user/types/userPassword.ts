import { AddValidate, StringTypeRequired } from '@code-core/domain';

@AddValidate([{ validator: 'MinLength', value: 3 }])
export class UserPassword extends StringTypeRequired {}
