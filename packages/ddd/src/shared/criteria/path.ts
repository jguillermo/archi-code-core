export interface CriteriaValueObject {
  readonly value: unknown;
  readonly isNull: boolean;
  equals(other: never): boolean;
}

export interface CriteriaAggregate {
  readonly id: CriteriaValueObject;
  pullDomainEvents(): unknown[];
  toPrimitives(): object;
}

export type CriteriaDocument<A extends CriteriaAggregate> = ReturnType<A['toPrimitives']>;

export type ValueOfObject<V> =
  NonNullable<V> extends CriteriaValueObject ? NonNullable<NonNullable<V>['value']> : never;

type Scalar = string | number | boolean | Date;

type FilterableObject<V> = [ValueOfObject<V>] extends [never]
  ? false
  : [ValueOfObject<V>] extends [Scalar]
    ? true
    : [ValueOfObject<V>] extends [readonly Scalar[]]
      ? true
      : false;

type Depth = [never, 0, 1, 2, 3];

export type Path<T, D extends number = 4> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T & string]-?: NonNullable<T[K]> extends Function
          ? never
          : NonNullable<T[K]> extends CriteriaValueObject
            ? FilterableObject<T[K]> extends true
              ? K
              : never
            : NonNullable<T[K]> extends readonly unknown[]
              ? never
              : NonNullable<T[K]> extends object
                ? `${K}.${Path<NonNullable<T[K]>, Depth[D]>}`
                : never;
      }[keyof T & string]
    : never;

export type PathValue<T, P extends string> = P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? PathValue<NonNullable<T[K]>, R>
    : never
  : P extends keyof T
    ? T[P]
    : never;

export type SortablePath<T> = {
  [P in Path<T>]: [ValueOfObject<PathValue<T, P>>] extends [never]
    ? never
    : [ValueOfObject<PathValue<T, P>>] extends [Scalar]
      ? P
      : never;
}[Path<T>];
