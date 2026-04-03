//! to_float — convert a JS value to a finite float or throw.
//! Calls can_be_float first; converts only if it returns true.

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

// ─── Pure conversion helper (testable without WASM) ──────────────────────────

/// Parses a trimmed float string to f64. Caller guarantees the string is valid.
fn convert_str(s: &str) -> f64 {
    s.trim().parse::<f64>().unwrap()
}

// ─── WASM function ────────────────────────────────────────────────────────────

/// Converts v to a finite float (f64). Throws if can_be_float returns false.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn to_float(value: &JsValue) -> Result<f64, JsValue> {
    use crate::can_be_type::float::can_be_float;

    if !can_be_float(value) {
        return Err(make_err(value, "float"));
    }

    if let Some(n) = value.as_f64() {
        return Ok(n);
    }
    if let Some(s) = value.as_string() {
        return Ok(convert_str(&s));
    }
    unreachable!("can_be_float returned true but value is neither number nor string")
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
    use super::convert_str;

    #[test]
    fn converts_float_strings() {
        assert_eq!(convert_str("3.14"), 3.14);
        assert_eq!(convert_str("42"), 42.0);
        assert_eq!(convert_str("  -1.5  "), -1.5);
        assert_eq!(convert_str("0"), 0.0);
    }
}
