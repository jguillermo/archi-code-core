import { EnumType, Required } from '@archi-code/ddd/domain';

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export class CourseStatusOption extends EnumType<CourseStatus> {
  protected getEnum(): typeof CourseStatus {
    return CourseStatus;
  }
}

export class CourseStatusType extends Required(CourseStatusOption) {}
