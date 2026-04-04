//! can_be_date — Date instance | ISO 8601 string
//! Numeric timestamps are not accepted.

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;
#[cfg(feature = "wasm")]
use wasm_bindgen::JsCast;

pub(crate) fn from_str(s: &str) -> bool {
    use chrono::{DateTime, NaiveDate, NaiveDateTime};
    let s = s.trim();
    // Require 4-digit year prefix
    if s.len() < 10 || !s.as_bytes()[..4].iter().all(|b| b.is_ascii_digit()) {
        return false;
    }
    // YYYY-MM-DD
    if NaiveDate::parse_from_str(s, "%Y-%m-%d").is_ok() {
        return true;
    }
    // Normalize space separator → T (e.g. "2018-03-23 16:02:15" → "2018-03-23T16:02:15")
    let normalized: std::borrow::Cow<str> = if s.contains(' ') {
        std::borrow::Cow::Owned(s.replacen(' ', "T", 1))
    } else {
        std::borrow::Cow::Borrowed(s)
    };
    let n = normalized.as_ref();
    // YYYY-MM-DDTHH:MM:SS (no timezone)
    if NaiveDateTime::parse_from_str(n, "%Y-%m-%dT%H:%M:%S").is_ok() {
        return true;
    }
    // RFC 3339 / ISO 8601 with timezone (handles Z and ±HH:MM, with or without fractional seconds)
    if DateTime::parse_from_rfc3339(n).is_ok() {
        return true;
    }
    // With fractional seconds and numeric timezone offset
    if DateTime::parse_from_str(n, "%Y-%m-%dT%H:%M:%S%.f%z").is_ok() {
        return true;
    }
    false
}

/// Returns true if v is a valid Date instance or an ISO 8601 date string.
/// Numeric timestamps are not accepted.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn can_be_date(value: &JsValue) -> bool {
    if let Some(date) = value.dyn_ref::<js_sys::Date>() {
        return date.get_time().is_finite();
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
    fn valid_date_strings() {
        for s in [
            "2018-03-23",
            "2018-03-23T16:02:15",
            "2018-03-23T16:02:15.000Z",
            "2018-03-23 16:02:15",
            "2018-03-23 16:02:15.000Z",
            "2018-03-23 00:00:00",
        ] {
            assert!(from_str(s), "expected true for {s:?}");
        }
    }

    #[test]
    fn invalid_date_strings() {
        for s in ["random", "", "   ", "abc123", "df9ef000-21fc-4e06-b8f7-103c3a133d10"] {
            assert!(!from_str(s), "expected false for {s:?}");
        }
    }

    #[test]
    fn out_of_range_fields_are_rejected() {
        // day > 31, month > 12, year too short, hour > 23, minutes > 59, seconds > 59
        for s in [
            "2018-03-33T16:02:15.000Z",
            "2018-13-23T16:02:15.000Z",
            "1-03-23T16:02:15.000Z",
            "2018-03-23T25:02:15.000Z",
            "2018-03-23T15:61:15.000Z",
            "2018-03-23T15:02:61.000Z",
        ] {
            assert!(!from_str(s), "expected false for {s:?}");
        }
    }
}
