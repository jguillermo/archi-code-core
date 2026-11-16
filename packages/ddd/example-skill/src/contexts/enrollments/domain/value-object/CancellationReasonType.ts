import { EnumType } from '@archi-code/ddd/domain';

export enum CancellationReason {
  STUDENT_REQUEST = 'student_request',
  COURSE_ARCHIVED = 'course_archived',
}

export class CancellationReasonType extends EnumType<CancellationReason> {
  protected getEnum(): typeof CancellationReason {
    return CancellationReason;
  }
}
