export class Frozen {
  static deep<Value>(value: Value): Value {
    if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
      Object.freeze(value);
      Object.values(value).forEach((child) => Frozen.deep(child));
    }
    return value;
  }
}
