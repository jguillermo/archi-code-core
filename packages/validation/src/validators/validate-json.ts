import { validate_json as wasmValidateJson } from '#wasm';
import type { ValidateInput } from './validate';

// ─── JSON batch validation ────────────────────────────────────────────────────
//
// Accepts the standard ValidateInput either as a pre-parsed object or as a
// raw JSON string. In both cases a single JSON string crosses the JS↔WASM
// boundary, all parsing and validation run inside WASM, and a single JSON
// string comes back — only 2 boundary crossings for the entire batch.
//
// Returns string error messages (locale-aware) unlike validate() which returns
// numeric rule codes.

export interface ValidateJsonOutput {
  ok: boolean;
  errors: Record<string, string[]>;
}

export const validateJson = (input: ValidateInput | string): ValidateJsonOutput => {
  const json = typeof input === 'string' ? input : JSON.stringify(input);
  return JSON.parse(wasmValidateJson(json)) as ValidateJsonOutput;
};
