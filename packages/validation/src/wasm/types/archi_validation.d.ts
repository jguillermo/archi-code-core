// Hand-written type declarations for the archi_validation WASM module.
// Run `npm run build:wasm` to compile Rust to WebAssembly.

export class Validator {
  constructor();
  set_locale(locale: string): void;

  // Fast field methods — NO field name (it was unused by Rust anyway)
  val_str(value: string): void;
  val_num(value: number): void;
  val_bool(value: boolean): void;
  val_null(): void;

  // Fast rule methods — integer code, zero string allocation per rule
  chk(rule: number): void;
  chk_n(rule: number, p: number): void;
  chk_nn(rule: number, p1: number, p2: number): void;
  chk_s(rule: number, p: string): void;
  chk_msg(rule: number, msg: string): void;
  chk_n_msg(rule: number, p: number, msg: string): void;
  chk_nn_msg(rule: number, p1: number, p2: number, msg: string): void;
  chk_s_msg(rule: number, p: string, msg: string): void;

  // Legacy field methods (backward compat)
  str_field(field: string, value: string): void;
  num_field(field: string, value: number): void;
  bool_field(field: string, value: boolean): void;
  null_field(field: string): void;

  // Legacy rule methods (backward compat, string-name API)
  check(rule: string): void;
  check_n(rule: string, p: number): void;
  check_nn(rule: string, p1: number, p2: number): void;
  check_s(rule: string, p: string): void;
  check_msg(rule: string, msg: string): void;
  check_n_msg(rule: string, p: number, msg: string): void;
  check_nn_msg(rule: string, p1: number, p2: number, msg: string): void;
  check_s_msg(rule: string, p: string, msg: string): void;

  // Run — returns packed [ok, f0_count, f0_code0, ..., f1_count, f1_code0, …] in one crossing (zero string marshaling)
  run_codes(): Uint8Array;

  // Run — returns packed [ok_byte, err_count_0, err_count_1, …] in one crossing
  run_flags(): Uint8Array;

  // Legacy run + individual result accessors
  run(): boolean;
  field_ok(index: number): boolean;
  field_error_count(index: number): number;
  field_error_at(field_index: number, error_index: number): string;

  reset(): void;
  free(): void;
}

// ─── JSON batch validation ────────────────────────────────────────────────────
export function validate_json(input: string): string;

// ─── Direct checks — string API (1 crossing, marshals rule name string) ───────
export function check_str(rule: string, value: string): boolean;
export function check_str_n(rule: string, value: string, p: number): boolean;
export function check_str_nn(rule: string, value: string, p1: number, p2: number): boolean;
export function check_str_s(rule: string, value: string, p: string): boolean;
export function check_num(rule: string, value: number): boolean;
export function check_num_n(rule: string, value: number, p: number): boolean;
export function check_num_nn(rule: string, value: number, p1: number, p2: number): boolean;
export function check_bool(rule: string, value: boolean): boolean;

// ─── Cast functions — naming: cast_{target}_{source} ─────────────────────────
// TypeScript cast.ts is a thin typeof-dispatcher; all validation logic is here.
export function cast_bool(value: string): boolean; // string  → bool
export function cast_bool_num(value: number): boolean; // f64     → bool (only 0/1)
export function cast_integer(value: string): number; // string  → integer
export function cast_integer_num(value: number): number; // f64     → integer (finite, no frac)
export function cast_num_bool(value: boolean): number; // bool    → 1/0 (infallible)
export function cast_float(value: string): number; // string  → float
export function cast_float_num(value: number): number; // f64     → float (finite only)
export function cast_str_num(value: number): string; // f64     → string (finite only)
export function cast_str_bool(value: boolean): string; // bool    → "true"/"false" (infallible)
export function cast_date(value: string): number; // string  → timestamp ms
export function cast_date_num(value: number): number; // f64 timestamp → validated f64
export function cast_json(value: string): void; // validates JSON; caller does JSON.parse

// ─── Direct checks — integer code API (fastest, no string alloc for rule) ─────
export function check_code_str(rule: number, value: string): boolean;
export function check_code_str_n(rule: number, value: string, p: number): boolean;
export function check_code_str_nn(rule: number, value: string, p1: number, p2: number): boolean;
export function check_code_str_s(rule: number, value: string, p: string): boolean;
export function check_code_num(rule: number, value: number): boolean;
export function check_code_num_n(rule: number, value: number, p: number): boolean;
export function check_code_num_nn(rule: number, value: number, p1: number, p2: number): boolean;
export function check_code_bool(rule: number, value: boolean): boolean;
