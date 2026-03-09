//! archi_validation — WebAssembly validation library
//!
//! Single entry point: `validate(input: JsValue) -> JsValue`
//! All orchestration logic lives in Rust (orchestrator.rs).

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg_attr(not(feature = "wasm"), allow(dead_code))]
mod messages;
#[cfg_attr(not(feature = "wasm"), allow(dead_code))]
mod orchestrator;
mod validators;

// ─── WASM setup ──────────────────────────────────────────────────────────────

#[cfg(feature = "wasm")]
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// ─── Single entry point ──────────────────────────────────────────────────────

/// Validate multiple fields in a single call.
///
/// Input shape:
/// ```json
/// {
///   "locale": "en",
///   "fields": [
///     { "field": "email", "value": "test@example.com", "validations": ["isEmail"] },
///     { "field": "age",   "value": 25,                 "validations": [["isInRange", 0, 120]] }
///   ]
/// }
/// ```
/// Output shape: `{ ok: boolean, errors: Record<string, string[]> }`
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn validate(input: JsValue) -> JsValue {
    use serde::Serialize as _;
    let serializer = serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true);

    let req: orchestrator::ValidateInput = match serde_wasm_bindgen::from_value(input) {
        Ok(r) => r,
        Err(_) => {
            let out = orchestrator::ValidateOutput {
                ok: false,
                errors: std::collections::HashMap::new(),
            };
            return out.serialize(&serializer).unwrap_or(JsValue::NULL);
        }
    };
    let result = orchestrator::process(req);
    result.serialize(&serializer).unwrap_or(JsValue::NULL)
}
