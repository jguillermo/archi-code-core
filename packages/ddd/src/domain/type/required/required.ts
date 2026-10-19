import { Validations } from '@archi-code/validation';
import type { AbstractType } from '../abstract-type';
import { RequiredMark } from './required-mark';
import type { RequiredMarked } from './required-mark';

type TypeClass = abstract new (value?: any) => AbstractType<any>;

type RequiredValueOf<C extends TypeClass> = Exclude<InstanceType<C>['value'], null>;

export type RequiredType<C extends TypeClass> = Omit<C, 'prototype'> &
  (abstract new (value: RequiredValueOf<C>) => InstanceType<C> & RequiredMarked);

export function Required<C extends TypeClass>(Base: C): RequiredType<C> {
  @Validations([{ validator: 'isRequired' }])
  abstract class RequiredValue extends (Base as unknown as abstract new (
    ...args: any[]
  ) => AbstractType<unknown>) {}
  Object.defineProperty(RequiredValue, 'name', { value: `Required(${Base.name})` });
  RequiredMark.mark(RequiredValue.prototype);
  return RequiredValue as unknown as RequiredType<C>;
}
