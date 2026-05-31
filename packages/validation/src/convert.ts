export class ConvertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConvertError';
  }
}

export function toString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new ConvertError(`Cannot convert ${v} to string`);
    return String(v);
  }
  throw new ConvertError(`Cannot convert ${typeof v} to string`);
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
  throw new ConvertError(`Cannot convert ${typeof v} to integer`);
}

export function toFloat(v: unknown): number {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new ConvertError(`Cannot convert ${v} to float`);
    return v;
  }
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed === '') throw new ConvertError(`Cannot convert "" to float`);
    const n = Number(trimmed);
    if (!Number.isFinite(n)) throw new ConvertError(`Cannot convert "${v}" to float`);
    return n;
  }
  throw new ConvertError(`Cannot convert ${typeof v} to float`);
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
  }
  let repr: string;
  try { repr = JSON.stringify(v) ?? typeof v; } catch { repr = typeof v; }
  throw new ConvertError(`Cannot convert ${repr} to boolean`);
}

export function toDate(v: unknown): Date {
  if (v instanceof Date) {
    if (isNaN(v.getTime())) throw new ConvertError('Invalid Date object');
    return v;
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    if (isNaN(d.getTime())) throw new ConvertError(`Cannot convert "${v}" to date`);
    return d;
  }
  throw new ConvertError(`Cannot convert ${typeof v} to date`);
}

export function toJson(v: unknown): Record<string, unknown> {
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      if (p !== null && typeof p === 'object' && !Array.isArray(p) && Object.keys(p).length > 0)
        return p as Record<string, unknown>;
    } catch {}
    throw new ConvertError(`Cannot convert string to JSON object`);
  }
  if (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length > 0)
    return v as Record<string, unknown>;
  throw new ConvertError(`Cannot convert ${v === null ? 'null' : typeof v} to JSON object`);
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
  throw new ConvertError(`Cannot convert ${typeof v} to array`);
}

export function toEnum(v: unknown, options: string[]): string | number | boolean {
  if (v === null || v === undefined)
    throw new ConvertError(`Cannot convert null/undefined to enum`);
  if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean')
    throw new ConvertError(`Cannot convert ${typeof v} to enum`);
  const str = String(v);
  if (!options.includes(str))
    throw new ConvertError(`"${str}" is not a valid enum option`);
  return v;
}
