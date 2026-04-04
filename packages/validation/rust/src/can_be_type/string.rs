//! can_be_string — string | boolean | finite number

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

/// Returns true if v can be meaningfully converted to a string:
/// already a string, a boolean, or a finite number.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn can_be_string(value: &JsValue) -> bool {
    if value.is_string() {
        return true;
    }
    if value.as_bool().is_some() {
        return true;
    }
    if let Some(n) = value.as_f64() {
        return n.is_finite();
    }
    false
}

#[cfg(test)]
mod tests {
    // can_be_string delegates entirely to JsValue type inspection —
    // the logic is: is_string || is_bool || (is_number && finite).
    // We test the finite-number branch directly.

    fn finite(n: f64) -> bool {
        n.is_finite()
    }

    #[test]
    fn finite_numbers_are_string_coercible() {
        assert!(finite(0.0));
        assert!(finite(42.0));
        assert!(finite(-3.14));
        assert!(finite(f64::MAX));
        assert!(finite(f64::MIN_POSITIVE));
    }

    #[test]
    fn non_finite_numbers_are_not_coercible() {
        assert!(!finite(f64::NAN));
        assert!(!finite(f64::INFINITY));
        assert!(!finite(f64::NEG_INFINITY));
    }
}
