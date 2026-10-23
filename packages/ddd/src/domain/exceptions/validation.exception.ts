import { ExceptionBrand } from '../../shared/index';
import { DomainExceptionCode } from './domain-exception-code';
import { DomainException } from './domain.exception';

export interface ValidationIssue {
  readonly field: string | null;
  readonly code: string;
  readonly message: string;
}

export type ValidationIssueInput = Omit<ValidationIssue, 'code'> & { readonly code?: string };

export class ValidationException extends DomainException {
  static {
    ExceptionBrand.brandClass(this, DomainExceptionCode.ValidationFailed);
  }

  readonly errors: readonly ValidationIssue[];

  constructor(errors: readonly ValidationIssueInput[]) {
    super(`Validation failed, ${errors.map(ValidationException.describe).join(', ')}`, [
      DomainExceptionCode.ValidationFailed,
    ]);
    this.errors = Object.freeze(
      errors.map(({ field, code = DomainExceptionCode.ValidationFailed, message }) =>
        Object.freeze({ field, code, message }),
      ),
    );
  }

  private static describe(issue: ValidationIssueInput): string {
    return issue.field === null ? issue.message : `${issue.field}: ${issue.message}`;
  }
}
