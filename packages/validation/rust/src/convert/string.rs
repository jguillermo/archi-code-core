//! to_string — convert a JS value to a string or throw.
//! Calls can_be_string first; converts only if it returns true.

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

// ─── Pure conversion helper (testable without WASM) ──────────────────────────

/// Converts a finite f64 to its string representation. Caller guarantees n is finite.
fn convert_num(n: f64) -> String {
    if n == 0.0 { "0".to_string() } else { n.to_string() }
}

// ─── WASM function ────────────────────────────────────────────────────────────

/// Converts v to a string. Throws if can_be_string returns false.
#[cfg(feature = "wasm")]
#[wasm_bindgen(js_name = "to_string")]
pub fn to_str(value: &JsValue) -> Result<String, JsValue> {
    use crate::can_be_type::string::can_be_string;

    if !can_be_string(value) {
        return Err(JsValue::from_str("Value is not a valid string"));
    }

    if let Some(s) = value.as_string() {
        return Ok(s);
    }
    if let Some(b) = value.as_bool() {
        return Ok(b.to_string());
    }
    if let Some(n) = value.as_f64() {
        return Ok(convert_num(n));
    }
    unreachable!("can_be_string returned true but value is not string, bool, or number")
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::convert_num;

    #[test]
    fn converts_finite_numbers_to_string() {
        assert_eq!(convert_num(42.0), "42");
        assert_eq!(convert_num(-7.0), "-7");
        assert_eq!(convert_num(3.14), "3.14");
        assert_eq!(convert_num(0.0), "0");
        assert_eq!(convert_num(-0.0), "0");
    }
}
