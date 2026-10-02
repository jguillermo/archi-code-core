import { PrimitiveType } from './primitive-type';

export type Methods<T> = {
  [P in keyof T]: T[P] extends Function ? P : never;
}[keyof T];

export type MethodsAndProperties<T> = { [key in keyof T]: T[key] };

export type Properties<T> = Omit<MethodsAndProperties<T>, Methods<T>>;

export type MutablePropertiesData<T> = Mutable<Required<Properties<T>>>;
export type PropertiesData<T> = Required<Properties<T>>;

type RemoveUnderscore<S extends string> = S extends `_${infer R}` ? R : S;

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};
export type PrimitiveTypes<T> = {
  [key in keyof Mutable<Properties<T>> as RemoveUnderscore<string & key>]: PrimitiveType<T[key]>;
};

export type DataTypes<T> = Partial<PrimitiveTypes<T>>;
