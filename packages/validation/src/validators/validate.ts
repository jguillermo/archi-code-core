import { Validator as WasmValidator } from '#wasm';

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

export type SimpleRule = ValidationRuleName;
export type ArrayRule = [ValidationRuleName, ...unknown[]];
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

// ─── Rule dispatch — zero serialization ──────────────────────────────────────
//
// Each rule variant maps to the correct typed check_* method.
// Params are passed as native f64 or &str — no encoding, no JSON.

const addRule = (v: WasmValidator, rule: ValidationRule): void => {
  let name: string;
  let p0: unknown;
  let p1: unknown;
  let msg: string | undefined;

  if (typeof rule === 'string') {
    name = rule;
    p0 = p1 = undefined;
  } else if (Array.isArray(rule)) {
    [name, p0, p1] = rule as [string, unknown?, unknown?];
  } else {
    ({ rule: name, message: msg } = rule);
    [p0, p1] = rule.params ?? [];
  }

  const hasMsg = msg !== undefined;

  if (p1 !== undefined && typeof p0 === 'number' && typeof p1 === 'number') {
    if (hasMsg) v.check_nn_msg(name, p0, p1, msg as string);
    else v.check_nn(name, p0, p1);
  } else if (p0 !== undefined && typeof p0 === 'number') {
    if (hasMsg) v.check_n_msg(name, p0, msg as string);
    else v.check_n(name, p0);
  } else if (p0 !== undefined) {
    if (hasMsg) v.check_s_msg(name, String(p0), msg as string);
    else v.check_s(name, String(p0));
  } else {
    if (hasMsg) v.check_msg(name, msg as string);
    else v.check(name);
  }
};

// ─── Entry point ─────────────────────────────────────────────────────────────

export const validate = (input: ValidateInput): ValidateOutput => {
  const v = new WasmValidator();
  if (input.locale) v.set_locale(input.locale);

  for (const { field, value, validations } of input.fields) {
    // Add field with native typed value — no encoding
    if (typeof value === 'string') v.str_field(field, value);
    else if (typeof value === 'number') v.num_field(field, value);
    else if (typeof value === 'boolean') v.bool_field(field, value);
    else v.null_field(field);

    // Add each rule via the correct typed method
    for (const rule of validations) addRule(v, rule);
  }

  const ok = v.run();

  // Read results field by field — no JSON, just typed values crossing the boundary
  const errors: Record<string, string[]> = {};
  for (let i = 0; i < input.fields.length; i++) {
    const n = v.field_error_count(i);
    if (n === 0) {
      errors[input.fields[i].field] = [];
    } else {
      errors[input.fields[i].field] = Array.from({ length: n }, (_, j) => v.field_error_at(i, j));
    }
  }

  v.free();
  return { ok, errors };
};
