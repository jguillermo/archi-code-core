//! can_be_json — non-empty JSON object | JSON object string
//! Arrays, primitives, null, and empty objects are not accepted.

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;
#[cfg(feature = "wasm")]
use wasm_bindgen::JsCast;

pub(crate) fn from_str(s: &str) -> bool {
    match serde_json::from_str::<serde_json::Value>(s) {
        Ok(serde_json::Value::Object(map)) => !map.is_empty(),
        _ => false,
    }
}

/// Returns true if v is a non-null, non-array object with at least one key that
/// can be serialized to JSON, or a JSON string representing such an object.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn can_be_json(value: &JsValue) -> bool {
    if let Some(s) = value.as_string() {
        return from_str(&s);
    }
    if value.is_null() || value.is_undefined() {
        return false;
    }
    if !value.is_object() || js_sys::Array::is_array(value) {
        return false;
    }
    if value.dyn_ref::<js_sys::Date>().is_some() {
        return false;
    }
    match js_sys::JSON::stringify(value).ok().and_then(|s| s.as_string()) {
        Some(s) => from_str(&s),
        None => false,
    }
}

#[cfg(test)]
mod tests {
    use super::from_str;

    #[test]
    fn valid_json_object_strings() {
        for s in [
            r#"{"name":"John","age":30}"#,
            r#"{"key":1}"#,
            r#"{"a":{"b":2}}"#,
            r#"{"list":[1,2,3]}"#,
        ] {
            assert!(from_str(s), "expected true for {s:?}");
        }
    }

    #[test]
    fn empty_object_is_invalid() {
        assert!(!from_str("{}"));
    }

    #[test]
    fn arrays_are_invalid() {
        for s in ["[]", "[1,2,3]", r#"[{"a":1}]"#] {
            assert!(!from_str(s), "expected false for {s:?}");
        }
    }

    #[test]
    fn primitives_and_null_are_invalid() {
        for s in ["42", "3.14", "true", "false", "null", r#""hello""#] {
            assert!(!from_str(s), "expected false for {s:?}");
        }
    }

    #[test]
    fn invalid_json_strings_are_rejected() {
        for s in ["not json", "", "   ", "{unclosed", "abc123"] {
            assert!(!from_str(s), "expected false for {s:?}");
        }
    }
}
