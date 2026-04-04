use chrono::{NaiveDate, NaiveTime, DateTime};
use once_cell::sync::Lazy;
use regex::Regex;

// ─── ISO 8601 regex ──────────────────────────────────────────────────────────

// ISO 8601 — simplified regex (without lookaheads/backreferences for Rust compat)
// Covers: YYYY-MM-DD, YYYY-MM-DDThh:mm:ss[Z|±hh:mm], YYYY-Www, YYYY-DDD
static ISO8601_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"^[+-]?\d{4}(-((0[1-9]|1[0-2])(-([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s](([01]\d|2[0-3])(:[0-5]\d)?(:[0-5]\d([.,]\d+)?)?|24:00:00([.,]0+)?)?([zZ]|[+-][01]\d:[0-5]\d)?)?)?$",
    ).unwrap()
});

static RFC3339_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"^[0-9]{4}-(0[1-9]|1[0-2])-([12]\d|0[1-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?([zZ]|[+\-][01][0-9]:[0-5][0-9])$",
    ).unwrap()
});

// ─── Basic validators ────────────────────────────────────────────────────────

pub fn is_date(value: &str) -> bool {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").is_ok()
}

pub fn is_datetime(value: &str) -> bool {
    DateTime::parse_from_rfc3339(value).is_ok()
        || DateTime::parse_from_str(value, "%Y-%m-%dT%H:%M:%S%.f%z").is_ok()
        || value.parse::<chrono::DateTime<chrono::Utc>>().is_ok()
}

pub fn is_time(value: &str) -> bool {
    NaiveTime::parse_from_str(value, "%H:%M:%S").is_ok()
        || NaiveTime::parse_from_str(value, "%H:%M").is_ok()
        || NaiveTime::parse_from_str(value, "%H:%M:%S%.f").is_ok()
}

pub fn is_iso8601(value: &str) -> bool {
    ISO8601_RE.is_match(value)
}

pub fn is_rfc3339(value: &str) -> bool {
    RFC3339_RE.is_match(value)
}

// ─── Before / After ──────────────────────────────────────────────────────────

/// isAfter — value date is after the comparison date (both YYYY-MM-DD)
pub fn is_after(value: &str, comparison: &str) -> bool {
    match (NaiveDate::parse_from_str(value, "%Y-%m-%d"), NaiveDate::parse_from_str(comparison, "%Y-%m-%d")) {
        (Ok(d1), Ok(d2)) => d1 > d2,
        _ => false,
    }
}

/// isBefore — value date is before the comparison date (both YYYY-MM-DD)
pub fn is_before(value: &str, comparison: &str) -> bool {
    match (NaiveDate::parse_from_str(value, "%Y-%m-%d"), NaiveDate::parse_from_str(comparison, "%Y-%m-%d")) {
        (Ok(d1), Ok(d2)) => d1 < d2,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_date() {
        assert!(is_date("2024-01-15"));
        assert!(!is_date("2024-13-01"));
        assert!(!is_date("not-a-date"));
    }

    #[test]
    fn test_datetime() {
        assert!(is_datetime("2024-01-15T10:30:00Z"));
        assert!(is_datetime("2024-01-15T10:30:00+05:00"));
        assert!(!is_datetime("not-a-datetime"));
    }

    #[test]
    fn test_time() {
        assert!(is_time("10:30:00"));
        assert!(is_time("10:30"));
        assert!(!is_time("25:00:00"));
    }

    #[test]
    fn test_iso8601() {
        assert!(is_iso8601("2024-01-15"));
        assert!(is_iso8601("2024-01-15T10:30:00Z"));
        assert!(is_iso8601("2024-W03"));
        assert!(!is_iso8601("not-a-date"));
    }

    #[test]
    fn test_rfc3339() {
        assert!(is_rfc3339("2024-01-15T10:30:00Z"));
        assert!(is_rfc3339("2024-01-15T10:30:00+05:00"));
        assert!(!is_rfc3339("2024-01-15"));
    }

    #[test]
    fn test_before_after() {
        assert!(is_after("2024-06-01", "2024-01-01"));
        assert!(!is_after("2024-01-01", "2024-06-01"));
        assert!(is_before("2024-01-01", "2024-06-01"));
    }
}
