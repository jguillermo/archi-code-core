import { CriteriaValueObject, Path, PathValue, ValueOfObject } from './path';

interface ListValueObject<Item> extends CriteriaValueObject {
  readonly items: Item[];
}

export type TextMode = 'sensitive' | 'insensitive';

export interface StringCondition<V> {
  readonly eq?: V | null;
  readonly ne?: V | null;
  readonly gt?: V;
  readonly gte?: V;
  readonly lt?: V;
  readonly lte?: V;
  readonly between?: readonly [V, V];
  readonly in?: readonly V[];
  readonly nin?: readonly V[];
  readonly contains?: string;
  readonly startsWith?: string;
  readonly endsWith?: string;
  readonly mode?: TextMode;
  readonly isNull?: boolean;
}

export interface RangeCondition<V> {
  readonly eq?: V | null;
  readonly ne?: V | null;
  readonly gt?: V;
  readonly gte?: V;
  readonly lt?: V;
  readonly lte?: V;
  readonly between?: readonly [V, V];
  readonly in?: readonly V[];
  readonly nin?: readonly V[];
  readonly isNull?: boolean;
}

export interface BooleanCondition<V> {
  readonly eq?: V | null;
  readonly ne?: V | null;
  readonly isNull?: boolean;
}

export interface ArrayCondition<Item> {
  readonly has?: Item;
  readonly hasSome?: readonly Item[];
  readonly hasEvery?: readonly Item[];
  readonly isEmpty?: boolean;
  readonly isNull?: boolean;
}

export type FieldFilter<V> = [ValueOfObject<V>] extends [never]
  ? never
  : [NonNullable<V>] extends [ListValueObject<infer Item>]
    ? [ValueOfObject<Item>] extends [string | number | boolean | Date]
      ? ArrayCondition<Item> | null
      : never
    : [ValueOfObject<V>] extends [string]
      ? NonNullable<V> | null | StringCondition<NonNullable<V>>
      : [ValueOfObject<V>] extends [number | Date]
        ? NonNullable<V> | null | RangeCondition<NonNullable<V>>
        : [ValueOfObject<V>] extends [boolean]
          ? NonNullable<V> | null | BooleanCondition<NonNullable<V>>
          : never;

export type Where<T> = {
  readonly [P in Path<T>]?: FieldFilter<PathValue<T, P>>;
} & {
  readonly AND?: readonly Where<T>[];
  readonly OR?: readonly Where<T>[];
  readonly NOT?: Where<T>;
};
