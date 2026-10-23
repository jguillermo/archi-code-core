import { EnumType, Required } from '../../../../ddd/domain';

export enum StaffRole {
  TREASURY = 'treasury',
  SUPPORT = 'support',
}

export class StaffRoleOption extends EnumType<StaffRole> {
  protected getEnum(): typeof StaffRole {
    return StaffRole;
  }
}

export class StaffRoleType extends Required(StaffRoleOption) {}
