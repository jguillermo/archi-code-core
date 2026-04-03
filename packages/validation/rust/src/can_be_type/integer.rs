//! can_be_integer — finite number with no fractional part | parseable integer string
//! Booleans are not accepted.

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

fn from_str(s: &str) -> bool {
    let s = s.trim();
    !s.is_empty() && s.parse::<i64>().is_ok()
}

fn from_num(n: f64) -> bool {
    n.is_finite() && n.fract() == 0.0
}

/// Returns true if v can be represented as an integer (no fractional part).
/// Booleans are not accepted.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn can_be_integer(value: &JsValue) -> bool {
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
    fn valid_integer_strings() {
        for s in ["0", "42", "-7", "1000000", "  10  "] {
            assert!(from_str(s), "expected true for {s:?}");
        }
    }

    #[test]
    fn invalid_integer_strings() {
        for s in ["3.14", "0.1", "abc", "", "   ", "NaN", "Infinity", "1e2"] {
            assert!(!from_str(s), "expected false for {s:?}");
        }
    }

    #[test]
    fn valid_integer_numbers() {
        for n in [0.0_f64, 42.0, -7.0, 1_000_000.0, f64::MAX.floor()] {
            assert!(from_num(n), "expected true for {n}");
        }
    }

    #[test]
    fn invalid_integer_numbers() {
        for n in [3.14_f64, 0.1, -0.5, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            assert!(!from_num(n), "expected false for {n}");
        }
    }
}
