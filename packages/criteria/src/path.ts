type Depth = [never, 0, 1, 2, 3];

type Leaf = string | number | boolean | Date | readonly unknown[];

export type Path<T, D extends number = 4> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T & string]-?: NonNullable<T[K]> extends Function
          ? never
          : [NonNullable<T[K]>] extends [Leaf]
            ? K
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
  [P in Path<T>]: [NonNullable<PathValue<T, P>>] extends [string | number | boolean | Date]
    ? P
    : never;
}[Path<T>];
