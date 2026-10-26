import { EnumType } from '../../../../ddd/domain';

export enum RejectionCode {
  LIMIT_EXCEEDED = 'limit_exceeded',
  AMOUNT_MISMATCH = 'amount_mismatch',
}

export class RejectionCodeType extends EnumType<RejectionCode> {
  protected getEnum(): typeof RejectionCode {
    return RejectionCode;
  }
}
