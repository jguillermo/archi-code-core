use chrono::NaiveDate;

// ─── toDate ──────────────────────────────────────────────────────────────────

/// toDate — parse a string to NaiveDate (YYYY-MM-DD format)
pub fn to_date(value: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").ok()
        .or_else(|| NaiveDate::parse_from_str(value, "%m/%d/%Y").ok())
        .or_else(|| NaiveDate::parse_from_str(value, "%d/%m/%Y").ok())
}

// ─── toFloat ─────────────────────────────────────────────────────────────────

/// toFloat — parse a string to f64, returns None if invalid
pub fn to_float(value: &str) -> Option<f64> {
    value.trim().parse::<f64>().ok()
}

// ─── toInt ────────────────────────────────────────────────────────────────────

/// toInt — parse a string to i64 with optional radix (default 10)
pub fn to_int(value: &str, radix: Option<u32>) -> Option<i64> {
    let r = radix.unwrap_or(10);
    let trimmed = value.trim();
    i64::from_str_radix(trimmed, r).ok()
}

// ─── toBoolean ───────────────────────────────────────────────────────────────

/// toBoolean — strict: only "1" and case-insensitive "true" return true
pub fn to_boolean(value: &str) -> bool {
    value == "1" || value.eq_ignore_ascii_case("true")
}

/// toBoolean loose — "0", "false", "" return false; everything else true
pub fn to_boolean_loose(value: &str) -> bool {
    value != "0" && !value.eq_ignore_ascii_case("false") && !value.is_empty()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_to_date() {
        assert!(to_date("2024-01-15").is_some());
        assert!(to_date("01/15/2024").is_some());
        assert!(to_date("not-a-date").is_none());
    }

    #[test]
    fn test_to_float() {
        assert_eq!(to_float("3.14"), Some(3.14));
        assert_eq!(to_float("42"), Some(42.0));
        assert_eq!(to_float("abc"), None);
    }

    #[test]
    fn test_to_int() {
        assert_eq!(to_int("42", None), Some(42));
        assert_eq!(to_int("FF", Some(16)), Some(255));
        assert_eq!(to_int("abc", None), None);
    }

    #[test]
    fn test_to_boolean() {
        assert!(to_boolean("1"));
        assert!(to_boolean("true"));
        assert!(to_boolean("True"));
        assert!(!to_boolean("0"));
        assert!(!to_boolean("false"));
        assert!(!to_boolean("yes")); // strict: only 1/true
    }

    #[test]
    fn test_to_boolean_loose() {
        assert!(to_boolean_loose("yes"));
        assert!(to_boolean_loose("anything"));
        assert!(!to_boolean_loose("0"));
        assert!(!to_boolean_loose("false"));
        assert!(!to_boolean_loose(""));
    }
}
