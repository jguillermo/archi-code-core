use chrono::{NaiveDate, NaiveTime, DateTime, Datelike};
use once_cell::sync::Lazy;
use regex::Regex;

static ISO8601_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"^[+-]?\d{4}(-((0[1-9]|1[0-2])(-([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s](([01]\d|2[0-3])(:[0-5]\d)?(:[0-5]\d([.,]\d+)?)?|24:00:00([.,]0+)?)?([zZ]|[+-][01]\d:[0-5]\d)?)?)?$"
    ).unwrap()
});

static RFC3339_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"^[0-9]{4}-(0[1-9]|1[0-2])-([12]\d|0[1-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?([zZ]|[+\-][01][0-9]:[0-5][0-9])$"
    ).unwrap()
});

// Parse a date string flexibly, returning a NaiveDate for comparison.
// Date-only strings use their own date; datetime strings use the UTC date component.
fn parse_date_flexible(s: &str) -> Option<NaiveDate> {
    let s = s.trim();
    // YYYY-MM-DD
    if let Ok(d) = NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        return Some(d);
    }
    // MM/DD/YYYY
    if let Ok(d) = NaiveDate::parse_from_str(s, "%m/%d/%Y") {
        return Some(d);
    }
    // RFC 2822 / JS Date.toString(): "Mon Jan 01 2024 00:00:00 GMT+0000 (UTC)"
    if let Ok(dt) = DateTime::parse_from_rfc2822(s) {
        return Some(NaiveDate::from_ymd_opt(dt.year(), dt.month(), dt.day())?);
    }
    // RFC 3339 / ISO 8601 datetime
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return Some(NaiveDate::from_ymd_opt(dt.year(), dt.month(), dt.day())?);
    }
    // JS Date.toString() variants: "Mon Aug 03 2011 00:00:00 GMT+0000"
    if let Ok(dt) = DateTime::parse_from_str(s, "%a %b %d %Y %H:%M:%S GMT%z") {
        return Some(NaiveDate::from_ymd_opt(dt.year(), dt.month(), dt.day())?);
    }
    if let Ok(dt) = DateTime::parse_from_str(s, "%a %b %d %Y %H:%M:%S GMT%z (%Z)") {
        return Some(NaiveDate::from_ymd_opt(dt.year(), dt.month(), dt.day())?);
    }
    // "Thu Jan 01 1970 00:00:00 GMT+0000 (Coordinated Universal Time)"
    // Try stripping the timezone name in parentheses
    if let Some(idx) = s.rfind('(') {
        let trimmed = s[..idx].trim();
        if let Ok(dt) = DateTime::parse_from_str(trimmed, "%a %b %d %Y %H:%M:%S GMT%z") {
            return Some(NaiveDate::from_ymd_opt(dt.year(), dt.month(), dt.day())?);
        }
    }
    None
}

pub fn is_date(value: &str) -> bool {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").is_ok()
}

pub fn is_datetime(value: &str) -> bool {
    DateTime::parse_from_rfc3339(value).is_ok()
        || DateTime::parse_from_str(value, "%Y-%m-%dT%H:%M:%S%.f%z").is_ok()
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

/// isAfter — value date is after comparison date (flexible parsing, comparison defaults to now)
pub fn is_after(value: &str, comparison: &str) -> bool {
    match (parse_date_flexible(value), parse_date_flexible(comparison)) {
        (Some(d1), Some(d2)) => d1 > d2,
        _ => false,
    }
}

/// isBefore — value date is before comparison date (flexible parsing)
pub fn is_before(value: &str, comparison: &str) -> bool {
    match (parse_date_flexible(value), parse_date_flexible(comparison)) {
        (Some(d1), Some(d2)) => d1 < d2,
        _ => false,
    }
}
