const COMPOSITE: unique symbol = Symbol.for('@archi-code/ddd/composite.v1');

export class CompositeBrand {
  static mark(prototype: object): void {
    Object.defineProperty(prototype, COMPOSITE, { value: true });
  }

  static isComposite(value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as Record<symbol, unknown>)[COMPOSITE] === true
    );
  }
}
