//! to_json — convert a JS value to a non-empty JSON object or throw.
//! Calls can_be_json first; converts only if it returns true.

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

/// Converts v to a JS object (JsValue). Throws if can_be_json returns false.
/// If v is a JSON string, it is parsed. If v is already an object, it is returned as-is.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn to_json(value: &JsValue) -> Result<JsValue, JsValue> {
    use crate::can_be_type::json::can_be_json;

    if !can_be_json(value) {
        return Err(JsValue::from_str("Value is not a valid JSON object"));
    }

    if let Some(s) = value.as_string() {
        return js_sys::JSON::parse(&s)
            .map_err(|_| JsValue::from_str("Value is not a valid JSON object"));
    }

    Ok(value.clone())
}
