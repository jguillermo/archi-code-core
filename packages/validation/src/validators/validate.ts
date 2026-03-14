import { Validator as WasmValidator } from '#wasm';

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

// ─── Rule formats ─────────────────────────────────────────────────────────────

export type SimpleRule = ValidationRuleName;
export type ArrayRule = [ValidationRuleName, ...unknown[]];
export interface ConfigRule {
  rule: ValidationRuleName;
  params?: unknown[];
  message?: string;
}
export type ValidationRule = SimpleRule | ArrayRule | ConfigRule;

// ─── Input / Output ───────────────────────────────────────────────────────────

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

// ─── Integer rule codes — MUST match dispatch_by_code in orchestrator.rs ──────
//
// Using codes instead of strings eliminates UTF-8 string marshaling
// (malloc + copy + free) for every rule call across the JS↔WASM boundary.

const RC: Record<ValidationRuleName, number> = {
  isNotEmpty: 0,
  isMinLength: 1,
  isMaxLength: 2,
  isExactLength: 3,
  isLengthBetween: 4,
  isAlpha: 5,
  isAlphanumeric: 6,
  isNumeric: 7,
  isAscii: 8,
  isLowercase: 9,
  isUppercase: 10,
  isContains: 11,
  isStartsWith: 12,
  isEndsWith: 13,
  isMatchesRegex: 14,
  isInteger: 15,
  isPositiveInteger: 16,
  isNegativeInteger: 17,
  isFloat: 18,
  isPositiveNumber: 19,
  isNegativeNumber: 20,
  isInRange: 21,
  isMinValue: 22,
  isMaxValue: 23,
  isMultipleOf: 24,
  isEmail: 25,
  isUuid: 26,
  isUuidV4: 27,
  isUuidV7: 28,
  isUrl: 29,
  isUrlWithScheme: 30,
  isIp: 31,
  isIpv4: 32,
  isIpv6: 33,
  isDate: 34,
  isDatetime: 35,
  isTime: 36,
  isBooleanString: 37,
  isCreditCard: 38,
  isJson: 39,
  isHexColor: 40,
  isBase64: 41,
  isSlug: 42,
};

// ─── Validator singleton pool ─────────────────────────────────────────────────
//
// Reusing one Validator via reset() instead of new + free per call eliminates
// the Rust heap allocation and wasm-bindgen constructor/destructor overhead.

let _pool: WasmValidator | null = null;

const getPooled = (): WasmValidator => {
  if (!_pool) _pool = new WasmValidator();
  return _pool;
};

// ─── Fast rule dispatch — integer codes, no string marshaling per rule ────────
//
// No _msg variants: run_codes() returns rule codes, not strings — custom
// messages are irrelevant on this path and would only waste string marshaling.

const addRule = (v: WasmValidator, rule: ValidationRule): void => {
  let code: number;
  let p0: unknown;
  let p1: unknown;

  if (typeof rule === 'string') {
    code = RC[rule];
    p0 = p1 = undefined;
  } else if (Array.isArray(rule)) {
    const [name, ...rest] = rule as [ValidationRuleName, unknown?, unknown?];
    code = RC[name];
    [p0, p1] = rest;
  } else {
    code = RC[rule.rule];
    [p0, p1] = rule.params ?? [];
  }

  if (p1 !== undefined && typeof p0 === 'number' && typeof p1 === 'number') {
    v.chk_nn(code, p0, p1);
  } else if (p0 !== undefined && typeof p0 === 'number') {
    v.chk_n(code, p0);
  } else if (p0 !== undefined) {
    v.chk_s(code, String(p0));
  } else {
    v.chk(code);
  }
};

// ─── Entry point ──────────────────────────────────────────────────────────────
//
// Performance optimizations vs the naive approach:
//   • Pooled Validator — no constructor/destructor overhead
//   • Integer rule codes — no string marshal (malloc+copy+free) per rule
//   • val_str/num/bool/null — no field name string marshal (was discarded anyway)
//   • run_flags() — single crossing for all error counts (vs N crossings)
//   • Locale cache — skips set_locale() call when locale unchanged

export const validate = (input: ValidateInput): ValidateOutput => {
  const v = getPooled();
  v.reset();

  for (const { value, validations } of input.fields) {
    if (typeof value === 'string') v.val_str(value);
    else if (typeof value === 'number') v.val_num(value);
    else if (typeof value === 'boolean') v.val_bool(value);
    else v.val_null();

    for (const rule of validations) addRule(v, rule);
  }

  // Single crossing: [ok, f0_count, f0_code0, ..., f1_count, …] — zero string marshaling
  const codes = v.run_codes();
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

// ─── Exported rule codes (for external use with chk* methods) ────────────────
export { RC as RuleCodes };
