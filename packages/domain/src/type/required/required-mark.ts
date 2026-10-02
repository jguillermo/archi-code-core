export const REQUIRED: unique symbol = Symbol.for('@archi-code/domain/required.v1');

export interface RequiredMark {
  readonly [REQUIRED]: true;
}

export type ValueOf<T, I> = I extends RequiredMark ? T : T | null;

export function isRequiredInstance(instance: object): boolean {
  return (instance as Partial<RequiredMark>)[REQUIRED] === true;
}
