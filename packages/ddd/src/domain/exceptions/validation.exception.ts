import { DomainException } from './domain.exception';
import { ExceptionBrand } from '../../shared/exceptions/brand/exception-brand';
import { ExceptionCode } from '../../shared/exceptions/exception-code';

export interface ValidationIssue {
  readonly field: string | null;
  readonly code: string;
  readonly message: string;
}

export type ValidationIssueInput = Omit<ValidationIssue, 'code'> & { readonly code?: string };

export class ValidationException extends DomainException {
  static {
    ExceptionBrand.brandClass(this, ExceptionCode.ValidationFailed);
  }

  readonly errors: readonly ValidationIssue[];

  constructor(errors: readonly ValidationIssueInput[]) {
    super(`Validation failed, ${errors.map(ValidationException.describe).join(', ')}`, [
      ExceptionCode.ValidationFailed,
    ]);
    this.errors = Object.freeze(
      errors.map(({ field, code = ExceptionCode.ValidationFailed, message }) =>
        Object.freeze({ field, code, message }),
      ),
    );
  }

  private static describe(issue: ValidationIssueInput): string {
    return issue.field === null ? issue.message : `${issue.field}: ${issue.message}`;
  }
}
