export class ValueEquality {
  static equals(left: unknown, right: unknown): boolean {
    if (left === right || (Number.isNaN(left) && Number.isNaN(right))) {
      return true;
    }
    if (left instanceof Date || right instanceof Date) {
      return ValueEquality.sameInstant(left, right);
    }
    if (Array.isArray(left) || Array.isArray(right)) {
      return ValueEquality.sameItems(left, right);
    }
    if (ValueEquality.isRecord(left) && ValueEquality.isRecord(right)) {
      return ValueEquality.sameEntries(left, right);
    }
    return false;
  }

  private static sameInstant(left: unknown, right: unknown): boolean {
    return (
      left instanceof Date &&
      right instanceof Date &&
      ValueEquality.equals(left.getTime(), right.getTime())
    );
  }

  private static sameItems(left: unknown, right: unknown): boolean {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => ValueEquality.equals(item, right[index]))
    );
  }

  private static sameEntries(
    left: Record<string, unknown>,
    right: Record<string, unknown>,
  ): boolean {
    const keys = Object.keys(left);
    return (
      keys.length === Object.keys(right).length &&
      keys.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(right, key) &&
          ValueEquality.equals(left[key], right[key]),
      )
    );
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
