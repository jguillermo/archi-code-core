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

// ─── Compiled validator — only public API ─────────────────────────────────────
//
// Schema is serialized once at createValidator() time and cached in the closure.
// Each validate() call only encodes the dynamic values — never the rules again.

export interface CompiledValidator {
  validate(values: Record<string, unknown>): ValidateOutput;
}

export function createValidator(fields: SchemaField[]): CompiledValidator {
  const schemaBuffer = encodeSchema(fields);
  const fieldNames = fields.map((f) => f.field);

  return {
    validate(values: Record<string, unknown>): ValidateOutput {
      const valuesBuffer = encodeValues(fields, values);
      const codes = run_split(schemaBuffer, valuesBuffer);
      const ok = codes[0] === 1;

      const errors: Record<string, number[]> = {};
      let pos = 1;
      for (const name of fieldNames) {
        const count = codes[pos++];
        errors[name] = count === 0 ? [] : Array.from(codes.subarray(pos, pos + count));
        pos += count;
      }

      return { ok, errors };
    },
  };
}
