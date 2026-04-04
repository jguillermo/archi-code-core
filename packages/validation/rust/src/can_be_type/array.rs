//! can_be_array — JS array | JSON array string

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

pub(crate) fn from_str(s: &str) -> bool {
    matches!(
        serde_json::from_str::<serde_json::Value>(s),
        Ok(serde_json::Value::Array(_))
    )
}

/// Returns true if v is a JS array or a string that parses as a JSON array.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn can_be_array(value: &JsValue) -> bool {
    if js_sys::Array::is_array(value) {
        return true;
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
    fn valid_array_strings() {
        for s in ["[]", "[1,2,3]", r#"["a","b"]"#, r#"[{"key":1}]"#, "[null,true,42]"] {
            assert!(from_str(s), "expected true for {s:?}");
        }
    }

    #[test]
    fn objects_are_not_arrays() {
        for s in [r#"{"a":1}"#, "{}", r#"{"list":[1,2]}"#] {
            assert!(!from_str(s), "expected false for {s:?}");
        }
    }

    #[test]
    fn primitives_are_not_arrays() {
        for s in ["42", "true", "null", r#""hello""#, "3.14"] {
            assert!(!from_str(s), "expected false for {s:?}");
        }
    }

    #[test]
    fn invalid_strings_are_rejected() {
        for s in ["not json", "", "   ", "[unclosed"] {
            assert!(!from_str(s), "expected false for {s:?}");
        }
    }
}
