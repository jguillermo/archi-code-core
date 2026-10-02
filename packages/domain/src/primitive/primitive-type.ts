import type { AbstractType } from '../type/abstract-type';
import type { EnumType } from '../type/enum-type';

type EnumPrimitive<V> = V extends string ? string : V extends number ? number : V;

export type PrimitiveType<T> = T extends (infer U)[]
  ? PrimitiveType<U>[]
  : T extends EnumType<any>
    ? EnumPrimitive<T['value']>
    : T extends AbstractType<any>
      ? T['value']
      : never;
