import { EnumType, Required } from '@archi-code/ddd/domain';

export enum ActorRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  EDITOR = 'editor',
}

export class ActorRoleOption extends EnumType<ActorRole> {
  protected getEnum(): typeof ActorRole {
    return ActorRole;
  }
}

export class ActorRoleType extends Required(ActorRoleOption) {}
