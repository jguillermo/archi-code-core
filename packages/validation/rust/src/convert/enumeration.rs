//! to_enum — validate a JS value against allowed options or throw.
//! Calls can_be_enum first; returns the original value only if it returns true.

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

/// Returns v if can_be_enum returns true, otherwise throws.
/// `options_json` must be a JSON-encoded string array, e.g. `'["a","b","c"]'`.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn to_enum(value: &JsValue, options_json: &str) -> Result<JsValue, JsValue> {
    use crate::can_be_type::enumeration::can_be_enum;

    if !can_be_enum(value, options_json) {
        return Err(JsValue::from_str("Value is not a valid enum option"));
    }

    Ok(value.clone())
}
