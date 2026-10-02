export class RequiredMark {
  static readonly symbol: unique symbol = Symbol.for('@archi-code/domain/required.v1');

  static isMarked(instance: object): boolean {
    return (instance as Partial<RequiredMarked>)[RequiredMark.symbol] === true;
  }

  static mark(prototype: object): void {
    Object.defineProperty(prototype, RequiredMark.symbol, { value: true });
  }
}

export interface RequiredMarked {
  readonly [RequiredMark.symbol]: true;
}

export type ValueOf<T, I> = I extends RequiredMarked ? T : T | null;
