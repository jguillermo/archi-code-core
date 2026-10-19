import { DomainException, ValidationException } from '../../../exceptions/index';
import type { ValidationIssue } from '../../../exceptions/index';

type Factories = Record<string, () => unknown>;

type Built<F extends Factories> = { [Field in keyof F]: ReturnType<F[Field]> };

export class ValueObjects {
  static build<F extends Factories>(factories: F): Built<F> {
    const built: Record<string, unknown> = {};
    const issues: ValidationIssue[] = [];
    for (const [field, factory] of Object.entries(factories)) {
      try {
        built[field] = factory();
      } catch (error) {
        issues.push(...ValueObjects.issuesOf(field, error));
      }
    }
    ValueObjects.assertNoIssues(issues);
    return built as Built<F>;
  }

  static buildList<Value, Item>(
    values: readonly Value[],
    factory: (value: Value, index: number) => Item,
  ): Item[] {
    const built: Item[] = [];
    const issues: ValidationIssue[] = [];
    values.forEach((value, index) => {
      try {
        built.push(factory(value, index));
      } catch (error) {
        issues.push(...ValueObjects.issuesOf(String(index), error));
      }
    });
    ValueObjects.assertNoIssues(issues);
    return built;
  }

  private static issuesOf(field: string, error: unknown): ValidationIssue[] {
    if (error instanceof ValidationException) {
      return error.errors.map((issue) => ({
        field: issue.field === null ? field : `${field}.${issue.field}`,
        code: issue.code,
        message: issue.message,
      }));
    }
    if (error instanceof DomainException) {
      return [{ field, code: error.code, message: error.message }];
    }
    throw error;
  }

  private static assertNoIssues(issues: ValidationIssue[]): void {
    if (issues.length > 0) {
      throw new ValidationException(issues);
    }
  }
}
