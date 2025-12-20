import { AbstractArrayType, AddValidate, PrimitiveType, StringTypeRequired } from '@code-core/domain';

@AddValidate([{ validator: 'MinLength', value: 2 }])
class Permission extends StringTypeRequired {}

@AddValidate([{ validator: 'IsOptional' }, { validator: 'ArrayMinSize', value: 1 }])
export class UserPermissions extends AbstractArrayType<Permission, null> {
  constructor(value: string[] | null = null) {
    super(value);
  }

  getItemClass(value: PrimitiveType<Permission>): Permission {
    return new Permission(value);
  }
}
