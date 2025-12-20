import { UserId } from '../../types/userId';
import { UserRoles } from '../../types/userPermissions';
import { UserName } from '../../types/userName';
import { ValidationException } from '@code-core/domain';

export class SignPayload {
  constructor(
    private readonly id: UserId,
    private readonly roles: UserRoles,
    private readonly name: UserName,
  ) {
    const errors: string[] = [];
    if (!this.id.isValid()) {
      errors.push(this.id.validatorMessageStr());
    }
    if (!this.roles.isValid()) {
      errors.push(this.roles.validatorMessageStr());
    }
    if (!this.name.isValid()) {
      errors.push(this.name.validatorMessageStr());
    }
    if (errors.length > 0) {
      throw new ValidationException(errors);
    }
  }

  toJson() {
    return {
      id: this.id.value,
      roles: this.roles.value,
      name: this.name.value,
    };
  }

  static create(data: any | null): SignPayload {
    return new SignPayload(new UserId(data?.id ?? ''), new UserRoles(data?.roles ?? []), new UserName(data?.name ?? ''));
  }
}
