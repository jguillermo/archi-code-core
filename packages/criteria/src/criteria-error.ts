export type CriteriaErrorCode =
  | 'INVALID_FORMAT'
  | 'INVALID_FIELD'
  | 'INVALID_OPERATOR'
  | 'INVALID_VALUE'
  | 'EMPTY_LIST'
  | 'INVALID_RANGE'
  | 'INVALID_ORDER'
  | 'INVALID_PAGINATION'
  | 'UNKNOWN_FIELD'
  | 'OPERATOR_NOT_ALLOWED'
  | 'NOT_SORTABLE'
  | 'LIMIT_EXCEEDED'
  | 'INVALID_SCHEMA'
  | 'INVALID_TEXT'
  | 'UNSUPPORTED_VERSION';

export class CriteriaError extends Error {
  constructor(
    readonly code: CriteriaErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CriteriaError';
  }
}
