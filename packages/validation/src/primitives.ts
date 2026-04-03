import {
  can_be_string,
  can_be_boolean,
  can_be_integer,
  can_be_float,
  can_be_date,
  can_be_json,
  can_be_array,
  can_be_enum,
} from '#wasm';

export function canBeString(v: unknown): boolean {
  return can_be_string(v);
}

export function canBeBoolean(v: unknown): boolean {
  return can_be_boolean(v);
}

export function canBeInteger(v: unknown): boolean {
  return can_be_integer(v);
}

export function canBeFloat(v: unknown): boolean {
  return can_be_float(v);
}

export function canBeDate(v: unknown): boolean {
  return can_be_date(v);
}

export function canBeJson(v: unknown): boolean {
  return can_be_json(v);
}

export function canBeArray(v: unknown): boolean {
  return can_be_array(v);
}

export function canBeEnum(v: unknown, options: string[]): boolean {
  return can_be_enum(v, JSON.stringify(options));
}
