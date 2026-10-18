import type { AbstractType } from '../type/abstract-type';
import type { EnumType } from '../type/enum-type';
import type { Entity } from '../entity/entity';
import type { PrimitiveTypes } from './primitive-types';

type EnumPrimitive<V> = V extends string ? string : V extends number ? number : V;

type Scalar = string | number | boolean | Date | null;

export type PrimitiveType<T> = T extends (infer U)[]
  ? PrimitiveType<U>[]
  : T extends EnumType<any>
    ? EnumPrimitive<T['value']>
    : T extends AbstractType<any>
      ? T['value']
      : T extends Entity<any>
        ? PrimitiveTypes<T>
        : T extends Scalar
          ? T
          : never;
