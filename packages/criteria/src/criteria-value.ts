export type CriteriaScalar = string | number | boolean | Date;
export type CriteriaValue = CriteriaScalar | null;
export type RangeValue = string | number | Date;

function rank(value: unknown): number {
  if (value == null) {
    return 0;
  }
  if (typeof value === 'number') {
    return 1;
  }
  if (typeof value === 'string') {
    return 2;
  }
  if (typeof value === 'boolean') {
    return 3;
  }
  if (value instanceof Date) {
    return 4;
  }
  return 5;
}

function sign(difference: number): number {
  if (difference < 0) {
    return -1;
  }
  return difference > 0 ? 1 : 0;
}

export function compareValues(left: unknown, right: unknown): number {
  const leftRank = rank(left);
  const rightRank = rank(right);
  if (leftRank !== rightRank) {
    return sign(leftRank - rightRank);
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return sign(left - right);
  }
  if (typeof left === 'string' && typeof right === 'string') {
    if (left === right) {
      return 0;
    }
    return left < right ? -1 : 1;
  }
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return sign(Number(left) - Number(right));
  }
  if (left instanceof Date && right instanceof Date) {
    return sign(left.getTime() - right.getTime());
  }
  return 0;
}

export function valuesEqual(left: unknown, right: unknown): boolean {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }
  return left === right;
}

export function isScalar(value: unknown): value is CriteriaScalar {
  return typeof value === 'string' || typeof value === 'boolean' || isRangeValue(value);
}

export function isRangeValue(value: unknown): value is RangeValue {
  if (typeof value === 'string') {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function sameKind(left: unknown, right: unknown): boolean {
  return rank(left) === rank(right);
}

export function copyScalar<V extends CriteriaScalar>(value: V): V {
  return (value instanceof Date ? new Date(value.getTime()) : value) as V;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)
  );
}
