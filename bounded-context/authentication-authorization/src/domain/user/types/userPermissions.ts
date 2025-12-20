import { AbstractArrayType, AddValidate, PrimitiveType, StringTypeRequired } from '@code-core/domain';

@AddValidate([{ validator: 'MinLength', value: 2 }])
class Role extends StringTypeRequired {}

@AddValidate([{ validator: 'IsOptional' }, { validator: 'ArrayMinSize', value: 1 }])
export class UserRoles extends AbstractArrayType<Role, null> {
  constructor(value: string[] | null = null) {
    super(value);
  }

  getItemClass(value: PrimitiveType<Role>): Role {
    return new Role(value);
  }
}
