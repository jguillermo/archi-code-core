import { UserId } from './types/userId';
import { UserName } from './types/userName';
import { UserRoles } from './types/userPermissions';
import { AggregateTypes, DataTypes } from '@code-core/domain';
import { UserAuthenticationDetails } from './types/userAuthenticationDetails';

export class UserTypes extends AggregateTypes {
  public readonly id: UserId;
  public readonly name: UserName;
  public readonly roles: UserRoles;
  public readonly authenticationDetails: UserAuthenticationDetails;

  constructor(currentLevel: number, params: DataTypes<UserTypes>) {
    super(currentLevel);
    this.id = this.initializeType(UserId, params.id);
    this.name = this.initializeType(UserName, params.name);
    this.roles = this.initializeType(UserRoles, params.roles);
    this.authenticationDetails = this.initializeType(UserAuthenticationDetails, params.authenticationDetails);
  }
}
