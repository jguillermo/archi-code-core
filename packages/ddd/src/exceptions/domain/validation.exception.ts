import { DomainException } from './domain.exception';
import { ExceptionBrand } from '../brand/exception-brand';
import { ExceptionCode } from '../exception-code';

export interface ValidationIssue {
  readonly field: string | null;
  readonly message: string;
}

export class ValidationException extends DomainException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.ValidationFailed);
  }

  readonly errors: readonly ValidationIssue[];

  constructor(errors: readonly ValidationIssue[]) {
    super(`Validation failed, ${errors.map(ValidationException.describe).join(', ')}`, [
      ExceptionCode.ValidationFailed,
    ]);
    this.errors = Object.freeze(
      errors.map(({ field, message }) => Object.freeze({ field, message })),
    );
  }

  private static describe(issue: ValidationIssue): string {
    return issue.field === null ? issue.message : `${issue.field}: ${issue.message}`;
  }
}
