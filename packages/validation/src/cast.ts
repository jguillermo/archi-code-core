import {
  cast_bool,
  cast_bool_num,
  cast_integer,
  cast_integer_num,
  cast_num_bool,
  cast_float,
  cast_float_num,
  cast_str_num,
  cast_str_bool,
  cast_date,
  cast_date_num,
  cast_json,
} from '#wasm';

// ─── CastError ────────────────────────────────────────────────────────────────

export class CastError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CastError';
  }
}

// wasm-bindgen throws the JsValue directly — may be a raw string, not an Error object.
function wrapWasm<T>(fn: () => T, fallback: string): T {
  try {
    return fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : fallback;
    throw new CastError(msg);
  }
}

// ── canBeBoolean ──────────────────────────────────────────────────────────────

export function canBeBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number')
    return wrapWasm(() => cast_bool_num(v), `Cannot convert ${v} to boolean`);
  if (typeof v === 'string') return wrapWasm(() => cast_bool(v), `Cannot convert to boolean`);
  throw new CastError(`Cannot convert ${typeof v} to boolean`);
}

// ── canBeInteger ──────────────────────────────────────────────────────────────

export function canBeInteger(v: unknown): number {
  if (typeof v === 'boolean') return cast_num_bool(v);
  if (typeof v === 'number')
    return wrapWasm(() => cast_integer_num(v), `Cannot convert ${v} to integer`);
  if (typeof v === 'string') return wrapWasm(() => cast_integer(v), `Cannot convert to integer`);
  throw new CastError(`Cannot convert ${typeof v} to integer`);
}

// ── canBeFloat ────────────────────────────────────────────────────────────────

export function canBeFloat(v: unknown): number {
  if (typeof v === 'boolean') return cast_num_bool(v);
  if (typeof v === 'number')
    return wrapWasm(() => cast_float_num(v), `Cannot convert ${v} to float`);
  if (typeof v === 'string') return wrapWasm(() => cast_float(v), `Cannot convert to float`);
  throw new CastError(`Cannot convert ${typeof v} to float`);
}

// ── canBeString ───────────────────────────────────────────────────────────────

export function canBeString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return cast_str_bool(v);
  if (typeof v === 'number')
    return wrapWasm(() => cast_str_num(v), `Cannot convert ${v} to string`);
  if (typeof v === 'bigint') return String(v); // bigint cannot cross the WASM boundary
  throw new CastError(`Cannot convert ${typeof v} to string`);
}

// ── canBeDate ─────────────────────────────────────────────────────────────────

export function canBeDate(v: unknown): Date {
  if (v instanceof Date)
    return new Date(wrapWasm(() => cast_date_num(v.getTime()), 'Invalid Date'));
  if (typeof v === 'string')
    return new Date(wrapWasm(() => cast_date(v), `Cannot convert to date`));
  if (typeof v === 'number')
    return new Date(wrapWasm(() => cast_date_num(v), `Cannot convert ${v} to date`));
  throw new CastError(`Cannot convert ${typeof v} to date`);
}

// ── canBeJson ─────────────────────────────────────────────────────────────────

export function canBeJson(v: unknown): unknown {
  if (typeof v === 'string') {
    wrapWasm(() => cast_json(v), 'Invalid JSON');
    return JSON.parse(v);
  }
  // object (incl. null/array), number, boolean are valid JSON-serializable values
  if (v === null || typeof v === 'object' || typeof v === 'number' || typeof v === 'boolean')
    return v;
  throw new CastError(`Cannot convert ${typeof v} to JSON`);
}
