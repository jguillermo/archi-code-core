import { DomainException, ValidationException } from '../../domain/index';
import { IssueCollectionError, IssueCollector } from '../../shared/index';
import type { CollectedIssue } from '../../shared/index';
import { UnexpectedErrorException } from '../exceptions/unexpected-error.exception';

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
    const builds = Object.fromEntries(
      Object.entries(factories).map(([field, factory]) => [
        field,
        () => ValueObjectBuilder.synchronous(field, factory()),
      ]),
    );
    return ValueObjectBuilder.validated(
      () => IssueCollector.collectFields(builds, ValueObjectBuilder.read) as Built<F>,
    );
  }

  static buildList<Value, Item>(
    values: readonly Value[],
    factory: (value: Value, index: number) => Item,
  ): Item[] {
    return ValueObjectBuilder.validated(() =>
      IssueCollector.collectItems(
        values,
        (value, index) => ValueObjectBuilder.synchronous(String(index), factory(value, index)),
        ValueObjectBuilder.read,
      ),
    );
  }

  private static synchronous<Result>(field: string, result: Result): Result {
    if (!ValueObjectBuilder.isThenable(result)) {
      return result;
    }
    result.then(undefined, () => undefined);
    throw new UnexpectedErrorException(
      `ValueObjectBuilder: the factory of "${field}" returned a Promise; build value objects synchronously`,
    );
  }

  private static validated<Collected>(collect: () => Collected): Collected {
    try {
      return collect();
    } catch (error) {
      if (error instanceof IssueCollectionError) {
        throw new ValidationException(error.issues);
      }
      throw error;
    }
  }

  private static read(error: unknown): readonly CollectedIssue[] | null {
    if (error instanceof ValidationException) {
      return error.errors;
    }
    if (error instanceof DomainException) {
      return [{ field: null, code: error.code, message: error.message }];
    }
    return null;
  }

  private static isThenable(result: unknown): result is PromiseLike<unknown> {
    return (
      (typeof result === 'object' || typeof result === 'function') &&
      result !== null &&
      typeof (result as { then?: unknown }).then === 'function'
    );
  }
}
