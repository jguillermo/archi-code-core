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

const CRITERIA_ERROR_BRAND = Symbol.for('@archi-code/criteria:CriteriaError');

const MAX_QUOTED_LENGTH = 64;

export function quote(value: unknown): string {
  const text = String(value);
  return text.length > MAX_QUOTED_LENGTH ? `${text.slice(0, MAX_QUOTED_LENGTH)}…` : text;
}

export interface CriteriaErrorOptions {
  readonly cause?: unknown;
}

export class CriteriaError extends Error {
  declare readonly cause?: unknown;

  constructor(
    readonly code: CriteriaErrorCode,
    message: string,
    options?: CriteriaErrorOptions,
  ) {
    super(message);
    this.name = 'CriteriaError';
    Object.defineProperty(this, CRITERIA_ERROR_BRAND, { value: true });
    if (options !== undefined && 'cause' in options) {
      Object.defineProperty(this, 'cause', {
        value: options.cause,
        writable: true,
        configurable: true,
      });
    }
  }

  static [Symbol.hasInstance](value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as Record<symbol, unknown>)[CRITERIA_ERROR_BRAND] === true
    );
  }
}
