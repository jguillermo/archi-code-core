import type { AggregateRoot } from '../aggregate/aggregate-root';
import type { AbstractType } from '../type/abstract-type';
import type { EnumType } from '../type/enum-type';

export type Methods<T> = {
  [P in keyof T]-?: T[P] extends Function ? P : never;
}[keyof T];

export type MethodsAndProperties<T> = { [key in keyof T]: T[key] };

export type Properties<T> = Omit<MethodsAndProperties<T>, Methods<T>>;

export type MutablePropertiesData<T> = Mutable<Required<Properties<T>>>;
export type PropertiesData<T> = Required<Properties<T>>;

type RemoveUnderscore<S extends string> = S extends `_${infer R}` ? R : S;

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};
type AggregateBookkeeping<T> = T extends AggregateRoot<any, any> ? 'version' : never;

export type PrimitiveTypes<T> = {
  [key in keyof Mutable<Properties<T>> as key extends AggregateBookkeeping<T>
    ? never
    : RemoveUnderscore<string & key>]: PrimitiveType<T[key]>;
};

export type DataTypes<T> = Partial<PrimitiveTypes<T>>;

type EnumPrimitive<V> = V extends string ? string : V extends number ? number : V;

export type PrimitiveType<T> = T extends (infer U)[]
  ? PrimitiveType<U>[]
  : T extends EnumType<any>
    ? EnumPrimitive<T['value']>
    : T extends AbstractType<any>
      ? T['value']
      : T extends null
        ? null
        : T extends Date
          ? never
          : T extends object
            ? PrimitiveTypes<T>
            : never;
