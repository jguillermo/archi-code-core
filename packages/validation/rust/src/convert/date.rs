//! to_date — convert a JS value to a UTC timestamp (ms) or throw.
//! Calls can_be_date first; converts only if it returns true.

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;
#[cfg(feature = "wasm")]
use wasm_bindgen::JsCast;

// ─── Pure conversion helper (testable without WASM) ──────────────────────────

/// Parses a valid ISO 8601 string to a UTC timestamp in ms.
/// Caller guarantees the string passed can_be_date validation.
fn parse_str(s: &str) -> Result<f64, String> {
    use chrono::{DateTime, NaiveDate, NaiveDateTime};
    let s = s.trim();
    if let Ok(d) = NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        if let Some(dt) = d.and_hms_opt(0, 0, 0) {
            return Ok(dt.and_utc().timestamp_millis() as f64);
        }
    }
    let normalized: std::borrow::Cow<str> = if s.contains(' ') {
        std::borrow::Cow::Owned(s.replacen(' ', "T", 1))
    } else {
        std::borrow::Cow::Borrowed(s)
    };
    let n = normalized.as_ref();
    if let Ok(dt) = NaiveDateTime::parse_from_str(n, "%Y-%m-%dT%H:%M:%S") {
        return Ok(dt.and_utc().timestamp_millis() as f64);
    }
    if let Ok(dt) = DateTime::parse_from_rfc3339(n) {
        return Ok(dt.timestamp_millis() as f64);
    }
    if let Ok(dt) = DateTime::parse_from_str(n, "%Y-%m-%dT%H:%M:%S%.f%z") {
        return Ok(dt.timestamp_millis() as f64);
    }
    Err(format!("Value is not a valid date: {s:?}"))
}

// ─── WASM function ────────────────────────────────────────────────────────────

/// Converts v to a UTC timestamp in milliseconds (f64). Throws if can_be_date returns false.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn to_date(value: &JsValue) -> Result<f64, JsValue> {
    use crate::can_be_type::date::can_be_date;

    if !can_be_date(value) {
        return Err(JsValue::from_str("Value is not a valid date"));
    }

    if let Some(date) = value.dyn_ref::<js_sys::Date>() {
        return Ok(date.get_time());
    }
    if let Some(s) = value.as_string() {
        return parse_str(&s).map_err(|e| JsValue::from_str(&e));
    }
    unreachable!("can_be_date returned true but value is neither Date nor string")
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::parse_str;

    #[test]
    fn converts_date_only_string() {
        let ms = parse_str("2024-01-15").unwrap();
        assert_eq!(ms, 1705276800000.0);
    }

    #[test]
    fn converts_datetime_with_timezone() {
        let ms = parse_str("2024-06-15T12:30:00Z").unwrap();
        assert!(ms > 0.0);
    }

    #[test]
    fn converts_datetime_with_space_separator() {
        let ms = parse_str("2018-03-23 16:02:15").unwrap();
        assert!(ms > 0.0);
    }

    #[test]
    fn converts_datetime_without_timezone() {
        let ms = parse_str("2024-01-15T10:00:00").unwrap();
        assert!(ms > 0.0);
    }
}
