import { AbstractJsonType } from '../type/abstract-json-type';
import { AbstractArrayType, AbstractBooleanType, AbstractDateType, AbstractEnumType, AbstractNumberType, AbstractStringType, AbstractUuidType, IdType } from '../type';

type Nullable<T> = T | null;

type PrimitiveEnum<T> = T extends string ? string : T extends number ? number : never;

// type BaseType<T> = T extends AbstractType<infer V, undefined> ? V : T extends AbstractType<infer V, null> ? Nullable<V> : never;

type BooleanType<T> = T extends AbstractBooleanType<undefined> ? boolean : T extends AbstractBooleanType<null> ? Nullable<boolean> : never;

type DateType<T> = T extends AbstractDateType<undefined> ? Date : T extends AbstractDateType<null> ? Nullable<Date> : never;

type NumberType<T> = T extends AbstractNumberType<undefined> ? number : T extends AbstractNumberType<null> ? Nullable<number> : never;

type StringType<T> = T extends AbstractStringType<undefined> ? string : T extends AbstractStringType<null> ? Nullable<string> : never;

type UuidType<T> = T extends AbstractUuidType<undefined> ? string : T extends AbstractUuidType<null> ? Nullable<string> : never;

type EnumType<T> = T extends AbstractEnumType<infer U, undefined> ? PrimitiveEnum<U> : T extends AbstractEnumType<infer U, null> ? Nullable<PrimitiveEnum<U>> : never;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type JsonType<T> = T extends AbstractJsonType<infer U> ? U : T extends AbstractJsonType<infer U, null> ? Nullable<U> : never;

type IdTypePrimitive<T> = T extends IdType ? string : never;

export type PrimitiveType<T> =
  T extends Array<infer U>
    ? PrimitiveType<U>[]
    : T extends AbstractArrayType<infer A, undefined>
      ? PrimitiveType<A>[]
      : T extends AbstractArrayType<infer A, null>
        ? Nullable<PrimitiveType<A>[]>
        : BooleanType<T> | DateType<T> | NumberType<T> | StringType<T> | UuidType<T> | EnumType<T> | JsonType<T> | IdTypePrimitive<T> | never;
