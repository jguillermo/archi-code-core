import { run_split } from '#wasm';
import { encodeSchema, encodeValues, RC, SchemaField } from './flat-encoder';

// ─── All available validation rule names ─────────────────────────────────────

export type ValidationRuleName =
  | 'isNotEmpty'
  | 'isMinLength'
  | 'isMaxLength'
  | 'isExactLength'
  | 'isLengthBetween'
  | 'isAlpha'
  | 'isAlphanumeric'
  | 'isNumeric'
  | 'isAscii'
  | 'isLowercase'
  | 'isUppercase'
  | 'isContains'
  | 'isStartsWith'
  | 'isEndsWith'
  | 'isMatchesRegex'
  | 'isInteger'
  | 'isPositiveInteger'
  | 'isNegativeInteger'
  | 'isFloat'
  | 'isPositiveNumber'
  | 'isNegativeNumber'
  | 'isInRange'
  | 'isMinValue'
  | 'isMaxValue'
  | 'isMultipleOf'
  | 'isEmail'
  | 'isUuid'
  | 'isUuidV4'
  | 'isUuidV7'
  | 'isUrl'
  | 'isUrlWithScheme'
  | 'isIp'
  | 'isIpv4'
  | 'isIpv6'
  | 'isDate'
  | 'isDatetime'
  | 'isTime'
  | 'isBooleanString'
  | 'isCreditCard'
  | 'isJson'
  | 'isHexColor'
  | 'isBase64'
  | 'isSlug';

export type SimpleRule = ValidationRuleName;
export type ArrayRule = [ValidationRuleName, ...unknown[]];
export interface ConfigRule {
  rule: ValidationRuleName;
  params?: unknown[];
  message?: string;
}
export type ValidationRule = SimpleRule | ArrayRule | ConfigRule;

export interface ValidateOutput {
  ok: boolean;
  errors: Record<string, number[]>;
}

export { RC as RuleCodes };
export type { SchemaField };

// ─── Schema binary cache ──────────────────────────────────────────────────────
//
// Key: JSON serialization of the schema fields (order-sensitive hash).
// Value: compiled binary buffer + field name list.
//
// Rules are encoded to binary once and cached. Subsequent calls with the same
// schema skip encoding — only values are encoded and sent to WASM.

interface SchemaCacheEntry {
  buf: Buffer;
  names: string[];
}

const schemaCache = new Map<string, SchemaCacheEntry>();

// ─── Primary API ──────────────────────────────────────────────────────────────
//
// validate(fields, values) — two-parameter call.
//
// 1. Compute a hash key from the validation rules (JSON, order-sensitive).
// 2. Look up the cache — if found, reuse the compiled binary schema.
// 3. If not found, encode the schema to binary and store it in the cache.
// 4. Encode only the values and call run_split(schemaBuffer, valuesBuffer).

export function validate(fields: SchemaField[], values: Record<string, unknown>): ValidateOutput {
  const key = JSON.stringify(fields);
  let entry = schemaCache.get(key);
  if (!entry) {
    entry = { buf: encodeSchema(fields), names: fields.map((f) => f.field) };
    schemaCache.set(key, entry);
  }

  const valuesBuffer = encodeValues(fields, values);
  const codes = run_split(entry.buf, valuesBuffer);
  const ok = codes[0] === 1;

  const errors: Record<string, number[]> = {};
  let pos = 1;
  for (const name of entry.names) {
    const count = codes[pos++];
    errors[name] = count === 0 ? [] : Array.from(codes.subarray(pos, pos + count));
    pos += count;
  }

  return { ok, errors };
}

// ─── Compiled validator — backward-compatible wrapper ─────────────────────────

export interface CompiledValidator {
  validate(values: Record<string, unknown>): ValidateOutput;
}

export function createValidator(fields: SchemaField[]): CompiledValidator {
  return {
    validate(values: Record<string, unknown>): ValidateOutput {
      return validate(fields, values);
    },
  };
}
