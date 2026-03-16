import { run_flat_codes } from '#wasm';
import { encodeFlat, RC } from './flat-encoder';

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

export interface FieldInput {
  field: string;
  value: unknown;
  validations: ValidationRule[];
}

export interface ValidateInput {
  locale?: 'en' | 'es';
  fields: FieldInput[];
}

export interface ValidateOutput {
  ok: boolean;
  errors: Record<string, number[]>;
}

// ─── Entry point ──────────────────────────────────────────────────────────────
//
// Encodes the entire input as a binary buffer (O(n) allocation, done once),
// then calls run_flat_codes() — a single JS↔WASM boundary crossing for the
// whole batch. The result is a compact byte array decoded here in JS.

export const validate = (input: ValidateInput): ValidateOutput => {
  const encoded = encodeFlat(input.fields);
  const codes = run_flat_codes(encoded);
  const ok = codes[0] === 1;

  const errors: Record<string, number[]> = {};
  let pos = 1;
  for (const { field } of input.fields) {
    const count = codes[pos++];
    errors[field] = count === 0 ? [] : Array.from(codes.subarray(pos, pos + count));
    pos += count;
  }

  return { ok, errors };
};

export { RC as RuleCodes };
