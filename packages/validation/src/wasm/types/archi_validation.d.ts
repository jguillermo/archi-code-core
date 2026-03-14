// Hand-written type declarations for the archi_validation WASM module.
// Run `npm run build:wasm` to compile Rust to WebAssembly.

/** Zero-serialization validator. Data crosses the JS↔WASM boundary as native typed values. */
export class Validator {
  constructor();
  set_locale(locale: string): void;

  // Add field — one method per value type
  str_field(field: string, value: string): void;
  num_field(field: string, value: number): void;
  bool_field(field: string, value: boolean): void;
  null_field(field: string): void;

  // Add rule to the last added field
  check(rule: string): void;
  check_n(rule: string, p: number): void;
  check_nn(rule: string, p1: number, p2: number): void;
  check_s(rule: string, p: string): void;
  check_msg(rule: string, msg: string): void;
  check_n_msg(rule: string, p: number, msg: string): void;
  check_nn_msg(rule: string, p1: number, p2: number, msg: string): void;
  check_s_msg(rule: string, p: string, msg: string): void;

  // Run and read results — no JSON, no serialization
  run(): boolean;
  field_ok(index: number): boolean;
  field_error_count(index: number): number;
  field_error_at(field_index: number, error_index: number): string;

  reset(): void;
  free(): void;
}

// ─── JSON batch validation (2 boundary crossings for the entire batch) ────────

/** Validate multiple fields from a JSON string. Parsing and validation run inside WASM.
 *  Input:  JSON string of ValidateInput  { locale?, fields: [...] }
 *  Output: JSON string of ValidateOutput { ok, errors }
 */
export function validate_json(input: string): string;

// ─── Direct single-rule check functions (1 boundary crossing per check) ───────

/** Check a string value against a rule with no params. */
export function check_str(rule: string, value: string): boolean;
/** Check a string value against a rule with one numeric param. */
export function check_str_n(rule: string, value: string, p: number): boolean;
/** Check a string value against a rule with two numeric params. */
export function check_str_nn(rule: string, value: string, p1: number, p2: number): boolean;
/** Check a string value against a rule with one string param. */
export function check_str_s(rule: string, value: string, p: string): boolean;
/** Check a numeric value against a rule with no params. */
export function check_num(rule: string, value: number): boolean;
/** Check a numeric value against a rule with one numeric param. */
export function check_num_n(rule: string, value: number, p: number): boolean;
/** Check a numeric value against a rule with two numeric params. */
export function check_num_nn(rule: string, value: number, p1: number, p2: number): boolean;
/** Check a boolean value against a rule. */
export function check_bool(rule: string, value: boolean): boolean;
