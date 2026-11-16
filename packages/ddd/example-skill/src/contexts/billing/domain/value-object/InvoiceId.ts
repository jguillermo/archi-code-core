import { IdType, UuidType } from '@archi-code/ddd/domain';
import type { EnrollmentReference } from './EnrollmentReference';

export class InvoiceId extends IdType<'InvoiceId'> {
  static forEnrollment(enrollment: EnrollmentReference): InvoiceId {
    return new InvoiceId(UuidType.fromValue(`invoice-of-enrollment:${enrollment.value}`));
  }
}
