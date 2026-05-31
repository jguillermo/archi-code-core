import {
  canBeString,
  canBeBoolean,
  canBeInteger,
  canBeFloat,
  canBeDate,
  canBeJson,
  canBeArray,
  canBeEnum,
} from './primitives';

export class ConvertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConvertError';
  }
}

function describeValue(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';

  const t = typeof v;
  if (t === 'boolean' || t === 'number') return String(v);
  if (t === 'bigint') return `BigInt(${v})`;
  if (t === 'symbol') return (v as symbol).toString();

  if (t === 'function') {
    const name = (v as Function).name;
    return name ? `[Function: ${name}]` : '[Function]';
  }

  const tag = Object.prototype.toString.call(v).slice(8, -1);
  if (tag === 'RegExp') return (v as RegExp).toString();
  if (tag === 'Object' || tag === 'Array') {
    try {
      return JSON.stringify(v) as string;
    } catch {
      return `[${tag}]`;
    }
  }
  return `[${tag}]`;
}

export function toString(v: unknown): string {
  if (!canBeString(v)) throw new ConvertError(`Cannot convert ${describeValue(v)} to string`);
  return String(v);
}

export function toInteger(v: unknown): number {
  if (!canBeInteger(v)) {
    if (typeof v === 'number') throw new ConvertError(`Cannot convert ${v} to integer`);
    if (typeof v === 'string') throw new ConvertError(`Cannot convert "${v}" to integer`);
    throw new ConvertError(`Cannot convert ${describeValue(v)} to integer`);
  }
  if (typeof v === 'number') return v;
  return parseInt((v as string).trim(), 10);
}

export function toFloat(v: unknown): number {
  if (!canBeFloat(v)) {
    if (typeof v === 'number') throw new ConvertError(`Cannot convert ${v} to float`);
    if (typeof v === 'string') throw new ConvertError(`Cannot convert "${v}" to float`);
    throw new ConvertError(`Cannot convert ${describeValue(v)} to float`);
  }
  if (typeof v === 'number') return v;
  return Number((v as string).trim());
}

export function toBoolean(v: unknown): boolean {
  if (!canBeBoolean(v)) {
    if (typeof v === 'string') throw new ConvertError(`Cannot convert "${v}" to boolean`);
    throw new ConvertError(`Cannot convert ${describeValue(v)} to boolean`);
  }
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  const s = (v as string).trim().toLowerCase();
  return s === 'true' || s === '1';
}

export function toDate(v: unknown): Date {
  if (v instanceof Date) {
    if (isNaN(v.getTime())) throw new ConvertError('Cannot convert Invalid Date to date');
    return v;
  }
  if (typeof v === 'string') {
    if (!canBeDate(v)) throw new ConvertError(`Cannot convert "${v}" to date`);
    return new Date(v.replace(' ', 'T'));
  }
  throw new ConvertError(`Cannot convert ${describeValue(v)} to date`);
}

export function toJson(v: unknown): Record<string, unknown> {
  if (!canBeJson(v)) {
    if (typeof v === 'string') throw new ConvertError(`Cannot convert "${v}" to JSON object`);
    throw new ConvertError(`Cannot convert ${describeValue(v)} to JSON object`);
  }
  if (typeof v === 'string') return JSON.parse(v) as Record<string, unknown>;
  return v as Record<string, unknown>;
}

export function toArray(v: unknown): unknown[] {
  if (!canBeArray(v)) {
    if (typeof v === 'string') throw new ConvertError(`Cannot convert "${v}" to array`);
    throw new ConvertError(`Cannot convert ${describeValue(v)} to array`);
  }
  if (Array.isArray(v)) return v;
  return JSON.parse(v as string) as unknown[];
}

export function toEnum(v: unknown, options: string[]): string | number | boolean {
  if (!canBeEnum(v, options)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
      throw new ConvertError(`"${String(v)}" is not a valid enum option`);
    throw new ConvertError(`Cannot convert ${describeValue(v)} to enum`);
  }
  return v as string | number | boolean;
}
