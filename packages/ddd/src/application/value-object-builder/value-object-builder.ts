import { InternalErrorException } from '../../exceptions';
import { IssueCollector } from '../../shared/index';

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
    return IssueCollector.collectFields(builds) as Built<F>;
  }

  static buildList<Value, Item>(
    values: readonly Value[],
    factory: (value: Value, index: number) => Item,
  ): Item[] {
    return IssueCollector.collectItems(values, (value, index) =>
      ValueObjectBuilder.synchronous(String(index), factory(value, index)),
    );
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
}
