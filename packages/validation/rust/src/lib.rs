//! archi_validation — WebAssembly validation library
//!
//! Modules:
//!   batch      — binary protocol batch validation (run_flat, run_flat_codes, run_split)
//!   cast       — type coercion functions that throw on failure (cast_bool, cast_integer, …)
//!   primitives — primitive type checkers that return bool (is_string, is_boolean, …)

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

mod messages;
pub(crate) mod orchestrator;
mod validators;

mod batch;
mod cast;
mod can_be_type;
mod convert;

// ─── Shared types (used by batch + orchestrator) ──────────────────────────────

pub enum FieldValue {
    Str(String),
    Num(f64),
    Bool(bool),
    Null,
}

pub enum Param {
    Num(f64),
    Str(String),
}

// ─── WASM initialisation ──────────────────────────────────────────────────────

#[cfg(feature = "wasm")]
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}
