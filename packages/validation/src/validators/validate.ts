import { validate as wasm_validate } from '#wasm';

// ─── All available validation rule names ─────────────────────────────────────

export type ValidationRuleName =
  // String
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
  // Number
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
  // Email
  | 'isEmail'
  // UUID
  | 'isUuid'
  | 'isUuidV4'
  | 'isUuidV7'
  // URL
  | 'isUrl'
  | 'isUrlWithScheme'
  // IP
  | 'isIp'
  | 'isIpv4'
  | 'isIpv6'
  // Date / time
  | 'isDate'
  | 'isDatetime'
  | 'isTime'
  // Boolean
  | 'isBooleanString'
  // Misc
  | 'isCreditCard'
  | 'isJson'
  | 'isHexColor'
  | 'isBase64'
  | 'isSlug';

// ─── Rule formats ────────────────────────────────────────────────────────────

/** Simple rule with no params: `"isEmail"` */
export type SimpleRule = ValidationRuleName;

/** Rule with params: `["isMinLength", 5]` */
export type ArrayRule = [ValidationRuleName, ...unknown[]];

/** Rule with optional custom message: `{ rule: "isEmail", message: "..." }` */
export interface ConfigRule {
  rule: ValidationRuleName;
  params?: unknown[];
  message?: string;
}

export type ValidationRule = SimpleRule | ArrayRule | ConfigRule;

// ─── Input / Output ──────────────────────────────────────────────────────────

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
  errors: Record<string, string[]>;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export const validate = (input: ValidateInput): ValidateOutput => {
  return wasm_validate(input) as ValidateOutput;
};
