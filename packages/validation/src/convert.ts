import { canBeDate } from './primitives';

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
    try { return JSON.stringify(v)!; } catch { return `[${tag}]`; }
  }
  return `[${tag}]`;
}

export function toString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new ConvertError(`Cannot convert ${v} to string`);
    return String(v);
  }
  throw new ConvertError(`Cannot convert ${describeValue(v)} to string`);
}

export function toInteger(v: unknown): number {
  if (typeof v === 'number') {
    if (!Number.isFinite(v) || !Number.isInteger(v))
      throw new ConvertError(`Cannot convert ${v} to integer`);
    return v;
  }
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (!/^-?\d+$/.test(trimmed))
      throw new ConvertError(`Cannot convert "${v}" to integer`);
    return parseInt(trimmed, 10);
  }
  throw new ConvertError(`Cannot convert ${describeValue(v)} to integer`);
}

export function toFloat(v: unknown): number {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new ConvertError(`Cannot convert ${v} to float`);
    return v;
  }
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed === '') throw new ConvertError(`Cannot convert "${v}" to float`);
    const n = Number(trimmed);
    if (!Number.isFinite(n)) throw new ConvertError(`Cannot convert "${v}" to float`);
    return n;
  }
  throw new ConvertError(`Cannot convert ${describeValue(v)} to float`);
}

export function toBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') {
    if (v === 1) return true;
    if (v === 0) return false;
  }
  if (typeof v === 'string') {
    const lc = v.trim().toLowerCase();
    if (lc === 'true' || lc === '1') return true;
    if (lc === 'false' || lc === '0') return false;
    throw new ConvertError(`Cannot convert "${v}" to boolean`);
  }
  throw new ConvertError(`Cannot convert ${describeValue(v)} to boolean`);
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
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      if (p !== null && typeof p === 'object' && !Array.isArray(p) && Object.keys(p).length > 0)
        return p as Record<string, unknown>;
    } catch {}
    throw new ConvertError(`Cannot convert "${v}" to JSON object`);
  }
  if (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length > 0)
    return v as Record<string, unknown>;
  throw new ConvertError(`Cannot convert ${describeValue(v)} to JSON object`);
}

export function toArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p;
    } catch {}
    throw new ConvertError(`Cannot convert "${v}" to array`);
  }
  throw new ConvertError(`Cannot convert ${describeValue(v)} to array`);
}

export function toEnum(v: unknown, options: string[]): string | number | boolean {
  if (v === null || v === undefined)
    throw new ConvertError(`Cannot convert ${describeValue(v)} to enum`);
  if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean')
    throw new ConvertError(`Cannot convert ${describeValue(v)} to enum`);
  const str = String(v);
  if (!options.includes(str))
    throw new ConvertError(`"${str}" is not a valid enum option`);
  return v;
}
