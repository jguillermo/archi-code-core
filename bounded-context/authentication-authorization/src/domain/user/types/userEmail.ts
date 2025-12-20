import { AddValidate, StringTypeRequired } from '@code-core/domain';

@AddValidate([{ validator: 'IsEmail' }])
export class UserEmail extends StringTypeRequired {}
