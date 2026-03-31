// Hand-written type declarations for the archi_validation WASM module.
// Run `npm run build:wasm` to compile Rust to WebAssembly.
//
// Only two validation exports: run_flat and run_flat_codes.
// All interaction with Rust validation is through the binary protocol.

// ─── Binary batch validation ──────────────────────────────────────────────────

/** Run all validations from a pre-encoded binary payload. Returns 1 if all pass, 0 if any fail. */
export function run_flat(data: Uint8Array): number;

/** Run all validations and return per-field failing rule codes. Format: [ok_byte, f0_count, f0_code0, ..., f1_count, ...] */
export function run_flat_codes(data: Uint8Array): Uint8Array;

/** Run validations from a cached schema buffer + a per-call values buffer. Same output format as run_flat_codes. */
export function run_split(schema: Uint8Array, values: Uint8Array): Uint8Array;

// ─── Cast functions — naming: cast_{target}_{source} ─────────────────────────
export function cast_bool(value: string): boolean;
export function cast_bool_num(value: number): boolean;
export function cast_integer(value: string): number;
export function cast_integer_num(value: number): number;
export function cast_num_bool(value: boolean): number;
export function cast_float(value: string): number;
export function cast_float_num(value: number): number;
export function cast_str_num(value: number): string;
export function cast_str_bool(value: boolean): string;
export function cast_date(value: string): number;
export function cast_date_num(value: number): number;
export function cast_json(value: string): void;
