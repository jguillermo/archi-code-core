//! can_be_float — finite number | parseable numeric string
//! Booleans are not accepted.

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

pub(crate) fn from_str(s: &str) -> bool {
    let s = s.trim();
    !s.is_empty() && s.parse::<f64>().map(|n| n.is_finite()).unwrap_or(false)
}

pub(crate) fn from_num(n: f64) -> bool {
    n.is_finite()
}

/// Returns true if v can be represented as a finite number.
/// Booleans are not accepted.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn can_be_float(value: &JsValue) -> bool {
    if let Some(n) = value.as_f64() {
        return from_num(n);
    }
    if let Some(s) = value.as_string() {
        return from_str(&s);
    }
    false
}

#[cfg(test)]
mod tests {
    use super::{from_num, from_str};

    #[test]
    fn valid_float_strings() {
        for s in ["0", "42", "-7", "3.14", "-0.5", "4e2", "+123", "0034", "   123   "] {
            assert!(from_str(s), "expected true for {s:?}");
        }
    }

    #[test]
    fn invalid_float_strings() {
        for s in ["abc", "", "   ", "NaN", "Infinity", "-Infinity", "123abc", "123,456", "123.456.789"] {
            assert!(!from_str(s), "expected false for {s:?}");
        }
    }

    #[test]
    fn valid_float_numbers() {
        for n in [0.0_f64, 42.0, -7.0, 3.14, f64::MAX, f64::MIN_POSITIVE, f64::EPSILON] {
            assert!(from_num(n), "expected true for {n}");
        }
    }

    #[test]
    fn invalid_float_numbers() {
        assert!(!from_num(f64::NAN));
        assert!(!from_num(f64::INFINITY));
        assert!(!from_num(f64::NEG_INFINITY));
    }
}
