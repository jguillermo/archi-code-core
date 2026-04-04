//! to_boolean — convert a JS value to a boolean or throw.
//! Calls can_be_boolean first; converts only if it returns true.

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

// ─── Pure conversion helpers (testable without WASM) ─────────────────────────

/// Converts 0.0/1.0 to false/true. Caller guarantees n is 0.0 or 1.0.
fn convert_num(n: f64) -> bool {
    n == 1.0
}

/// Converts a valid boolean string to bool. Caller guarantees the string is valid.
fn convert_str(s: &str) -> bool {
    matches!(s.trim().to_lowercase().as_str(), "true" | "1")
}

// ─── WASM function ────────────────────────────────────────────────────────────

/// Converts v to a boolean. Throws if can_be_boolean returns false.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn to_boolean(value: &JsValue) -> Result<bool, JsValue> {
    use crate::can_be_type::boolean::can_be_boolean;

    if !can_be_boolean(value) {
        return Err(make_err(value, "boolean"));
    }

    if let Some(b) = value.as_bool() {
        return Ok(b);
    }
    if let Some(n) = value.as_f64() {
        return Ok(convert_num(n));
    }
    if let Some(s) = value.as_string() {
        return Ok(convert_str(&s));
    }
    unreachable!("can_be_boolean returned true but value is not bool, number, or string")
}

#[cfg(feature = "wasm")]
fn make_err(value: &JsValue, type_name: &str) -> JsValue {
    let repr = if let Some(s) = value.as_string() {
        format!("{s:?}")
    } else if let Some(n) = value.as_f64() {
        n.to_string()
    } else if let Some(b) = value.as_bool() {
        b.to_string()
    } else {
        value.js_typeof().as_string().unwrap_or_default()
    };
    JsValue::from_str(&format!("Value is not a valid {type_name}: {repr}"))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::{convert_num, convert_str};

    #[test]
    fn converts_boolean_numbers() {
        assert_eq!(convert_num(1.0), true);
        assert_eq!(convert_num(0.0), false);
    }

    #[test]
    fn converts_boolean_strings() {
        assert_eq!(convert_str("true"), true);
        assert_eq!(convert_str("TRUE"), true);
        assert_eq!(convert_str("1"), true);
        assert_eq!(convert_str("  true  "), true);
        assert_eq!(convert_str("false"), false);
        assert_eq!(convert_str("FALSE"), false);
        assert_eq!(convert_str("0"), false);
    }
}
