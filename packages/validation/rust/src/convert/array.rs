//! to_array — convert a JS value to a JS array or throw.
//! Calls can_be_array first; converts only if it returns true.

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

/// Converts v to a JS array (JsValue). Throws if can_be_array returns false.
/// If v is a JSON array string, it is parsed. If v is already an array, it is returned as-is.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn to_array(value: &JsValue) -> Result<JsValue, JsValue> {
    use crate::can_be_type::array::can_be_array;

    if !can_be_array(value) {
        return Err(JsValue::from_str("Value is not a valid array"));
    }

    if js_sys::Array::is_array(value) {
        return Ok(value.clone());
    }

    if let Some(s) = value.as_string() {
        return js_sys::JSON::parse(&s)
            .map_err(|_| JsValue::from_str("Value is not a valid array"));
    }

    unreachable!("can_be_array returned true but value is neither array nor string")
}
