import {
  DomainException,
  InternalErrorException,
  ValidationException,
} from '../../../exceptions/index';
import type { ValidationIssue } from '../../../exceptions/index';

type Factories = Record<string, () => unknown>;

type Built<F extends Factories> = { [Field in keyof F]: ReturnType<F[Field]> };

type Synchronous<F extends Factories> = {
  [Field in keyof F]: [ReturnType<F[Field]>] extends [never]
    ? F[Field]
    : [ReturnType<F[Field]>] extends [PromiseLike<unknown>]
      ? never
      : F[Field];
};

export class ValueObjectBuilder {
  static build<F extends Factories>(factories: F & Synchronous<F>): Built<F> {
    const built: Record<string, unknown> = {};
    const issues: ValidationIssue[] = [];
    for (const [field, factory] of Object.entries(factories)) {
      try {
        Object.defineProperty(built, field, {
          value: ValueObjectBuilder.synchronous(field, factory()),
          enumerable: true,
          writable: true,
          configurable: true,
        });
      } catch (error) {
        issues.push(...ValueObjectBuilder.issuesOf(field, error));
      }
    }
    ValueObjectBuilder.assertNoIssues(issues);
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
        built.push(ValueObjectBuilder.synchronous(String(index), factory(value, index)));
      } catch (error) {
        issues.push(...ValueObjectBuilder.issuesOf(String(index), error));
      }
    });
    ValueObjectBuilder.assertNoIssues(issues);
    return built;
  }

  private static synchronous<Result>(field: string, result: Result): Result {
    if (!ValueObjectBuilder.isThenable(result)) {
      return result;
    }
    result.then(undefined, () => undefined);
    throw new InternalErrorException(
      `ValueObjectBuilder: the factory of "${field}" returned a Promise; build value objects synchronously`,
    );
  }

  private static isThenable(result: unknown): result is PromiseLike<unknown> {
    return (
      (typeof result === 'object' || typeof result === 'function') &&
      result !== null &&
      typeof (result as { then?: unknown }).then === 'function'
    );
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
