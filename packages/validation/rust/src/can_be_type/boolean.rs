//! can_be_boolean — bool | 0/1 | "true"/"false"/"1"/"0"

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

pub(crate) fn from_num(n: f64) -> bool {
    n == 0.0 || n == 1.0
}

pub(crate) fn from_str(s: &str) -> bool {
    matches!(s.trim().to_lowercase().as_str(), "true" | "false" | "1" | "0")
}

/// Returns true if v can be represented as a boolean.
/// Accepts: true/false, 0/1, "true"/"false"/"1"/"0" (case-insensitive, trimmed).
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn can_be_boolean(value: &JsValue) -> bool {
    if value.as_bool().is_some() {
        return true;
    }
    if let Some(n) = value.as_f64() {
        return n == 0.0 || n == 1.0;
    }
    if let Some(s) = value.as_string() {
        return from_str(&s);
    }
    false
}

#[cfg(test)]
mod tests {
    use super::from_str;

    #[test]
    fn valid_boolean_strings() {
        for s in ["true", "false", "TRUE", "FALSE", "True", "False", "1", "0"] {
            assert!(from_str(s), "expected true for {s:?}");
        }
    }

    #[test]
    fn trimmed_boolean_strings() {
        for s in ["  true  ", " false ", " 1", " 0 "] {
            assert!(from_str(s), "expected true for {s:?}");
        }
    }

    #[test]
    fn invalid_boolean_strings() {
        for s in ["yes", "no", "on", "off", "2", "-1", "", "   ", "maybe", "bool"] {
            assert!(!from_str(s), "expected false for {s:?}");
        }
    }

    #[test]
    fn valid_boolean_numbers() {
        assert!(0.0_f64 == 0.0 || 0.0_f64 == 1.0);
        assert!(1.0_f64 == 0.0 || 1.0_f64 == 1.0);
    }

    #[test]
    fn invalid_boolean_numbers() {
        for n in [-1.0_f64, 2.0, 0.5, f64::NAN, f64::INFINITY] {
            assert!(n != 0.0 && n != 1.0, "expected false for {n}");
        }
    }
}
