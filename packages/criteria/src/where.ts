import { Path, PathValue } from './path';

export type TextMode = 'sensitive' | 'insensitive';

export interface StringCondition<S extends string = string> {
  readonly eq?: S | null;
  readonly ne?: S | null;
  readonly gt?: string;
  readonly gte?: string;
  readonly lt?: string;
  readonly lte?: string;
  readonly between?: readonly [string, string];
  readonly in?: readonly S[];
  readonly nin?: readonly S[];
  readonly contains?: string;
  readonly startsWith?: string;
  readonly endsWith?: string;
  readonly mode?: TextMode;
  readonly isNull?: boolean;
}

export interface NumberCondition {
  readonly eq?: number | null;
  readonly ne?: number | null;
  readonly gt?: number;
  readonly gte?: number;
  readonly lt?: number;
  readonly lte?: number;
  readonly between?: readonly [number, number];
  readonly in?: readonly number[];
  readonly nin?: readonly number[];
  readonly isNull?: boolean;
}

export interface DateCondition {
  readonly eq?: Date | null;
  readonly ne?: Date | null;
  readonly gt?: Date;
  readonly gte?: Date;
  readonly lt?: Date;
  readonly lte?: Date;
  readonly between?: readonly [Date, Date];
  readonly in?: readonly Date[];
  readonly nin?: readonly Date[];
  readonly isNull?: boolean;
}

export interface BooleanCondition {
  readonly eq?: boolean | null;
  readonly ne?: boolean | null;
  readonly isNull?: boolean;
}

export interface ArrayCondition<E> {
  readonly has?: E;
  readonly hasSome?: readonly E[];
  readonly hasEvery?: readonly E[];
  readonly isEmpty?: boolean;
  readonly isNull?: boolean;
}

export type FieldFilter<V> = [NonNullable<V>] extends [never]
  ? null
  : [NonNullable<V>] extends [readonly (infer E)[]]
    ? [E] extends [string | number | boolean | Date]
      ? ArrayCondition<E> | null
      : never
    : [NonNullable<V>] extends [string]
      ? NonNullable<V> | null | StringCondition<NonNullable<V>>
      : [NonNullable<V>] extends [number]
        ? number | null | NumberCondition
        : [NonNullable<V>] extends [boolean]
          ? boolean | null | BooleanCondition
          : [NonNullable<V>] extends [Date]
            ? Date | null | DateCondition
            : never;

export type Where<T> = {
  readonly [P in Path<T>]?: FieldFilter<PathValue<T, P>>;
} & {
  readonly AND?: readonly Where<T>[];
  readonly OR?: readonly Where<T>[];
  readonly NOT?: Where<T>;
};
