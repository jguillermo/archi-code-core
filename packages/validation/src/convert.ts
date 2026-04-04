import {
  to_integer,
  to_float,
  to_boolean,
  to_string,
  to_date,
  to_json,
  to_array,
  to_enum,
} from '#wasm';

// ─── ConvertError ─────────────────────────────────────────────────────────────

export class ConvertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConvertError';
  }
}

function wrap<T>(fn: () => T, fallback: string): T {
  try {
    return fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : fallback;
    throw new ConvertError(msg);
  }
}

// ─── toInteger ────────────────────────────────────────────────────────────────

export function toInteger(v: unknown): number {
  return wrap(() => to_integer(v), 'Value is not a valid integer');
}

// ─── toFloat ──────────────────────────────────────────────────────────────────

export function toFloat(v: unknown): number {
  return wrap(() => to_float(v), 'Value is not a valid float');
}

// ─── toBoolean ────────────────────────────────────────────────────────────────

export function toBoolean(v: unknown): boolean {
  return wrap(() => to_boolean(v), 'Value is not a valid boolean');
}

// ─── toString ─────────────────────────────────────────────────────────────────

export function toString(v: unknown): string {
  return wrap(() => to_string(v), 'Value is not a valid string');
}

// ─── toDate ───────────────────────────────────────────────────────────────────

export function toDate(v: unknown): Date {
  return new Date(wrap(() => to_date(v), 'Value is not a valid date'));
}

// ─── toJson ───────────────────────────────────────────────────────────────────

export function toJson(v: unknown): Record<string, unknown> {
  return wrap(() => to_json(v) as Record<string, unknown>, 'Value is not a valid JSON object');
}

// ─── toArray ──────────────────────────────────────────────────────────────────

export function toArray(v: unknown): unknown[] {
  return wrap(() => to_array(v) as unknown[], 'Value is not a valid array');
}

// ─── toEnum ───────────────────────────────────────────────────────────────────

export function toEnum(v: unknown, options: string[]): string | number | boolean {
  return wrap(
    () => to_enum(v, JSON.stringify(options)) as string | number | boolean,
    'Value is not a valid enum option',
  );
}
