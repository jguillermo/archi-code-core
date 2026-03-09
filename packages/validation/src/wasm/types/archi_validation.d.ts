// Hand-written type declarations for the archi_validation WASM module.
// Single entry point — all validation logic is orchestrated in Rust.
//
// Run `npm run build:wasm` to compile Rust to WebAssembly.

export function validate(input: unknown): unknown;
