//! can_be_enum — string | number | boolean matches one of the provided options
//! `options_json` must be a JSON-encoded string array: `'["a","b","c"]'`

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

pub(crate) fn value_to_string(s: Option<String>, b: Option<bool>, n: Option<f64>) -> Option<String> {
    if let Some(s) = s {
        return Some(s);
    }
    if let Some(b) = b {
        return Some(b.to_string());
    }
    if let Some(n) = n {
        if !n.is_finite() {
            return None;
        }
        return Some(if n.fract() == 0.0 { (n as i64).to_string() } else { n.to_string() });
    }
    None
}

pub(crate) fn check(str_value: &str, options_json: &str) -> bool {
    match serde_json::from_str::<Vec<String>>(options_json) {
        Ok(options) => options.iter().any(|o| o == str_value),
        Err(_) => false,
    }
}

/// Returns true if v (string, number, or boolean) matches one of the provided options.
/// `options_json` must be a JSON-encoded string array, e.g. `'["a","b","c"]'`.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn can_be_enum(value: &JsValue, options_json: &str) -> bool {
    match value_to_string(value.as_string(), value.as_bool(), value.as_f64()) {
        Some(s) => check(&s, options_json),
        None => false,
    }
}

#[cfg(test)]
mod tests {
    use super::check;

    const COLORS: &str = r#"["red","green","blue"]"#;
    const NUMS: &str = r#"["1","2","3"]"#;

    #[test]
    fn matching_string_options() {
        assert!(check("red", COLORS));
        assert!(check("green", COLORS));
        assert!(check("blue", COLORS));
    }

    #[test]
    fn non_matching_string_options() {
        assert!(!check("yellow", COLORS));
        assert!(!check("RED", COLORS)); // case-sensitive
        assert!(!check("red ", COLORS)); // no trimming of value
        assert!(!check("", COLORS));
    }

    #[test]
    fn number_as_string() {
        assert!(check("1", NUMS));
        assert!(check("2", NUMS));
        assert!(!check("4", NUMS));
    }

    #[test]
    fn empty_options_list() {
        assert!(!check("red", "[]"));
    }

    #[test]
    fn invalid_options_json_returns_false() {
        assert!(!check("red", "not-json"));
        assert!(!check("red", "{}")); // object, not array
    }
}
