use once_cell::sync::Lazy;
use regex::Regex;

static HEX_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^(0x|0h)?[0-9A-Fa-f]+$").unwrap());
static OCTAL_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^(0o)?[0-7]+$").unwrap());
static DECIMAL_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[-+]?([0-9]+)?(\.[0-9]+)?$").unwrap());

pub fn is_int(value: &str) -> bool {
    !value.is_empty() && value.parse::<i64>().is_ok()
}

pub fn is_integer(value: &str) -> bool {
    is_int(value)
}

pub fn is_positive_integer(value: &str) -> bool {
    value.parse::<i64>().map(|n| n > 0).unwrap_or(false)
}

pub fn is_negative_integer(value: &str) -> bool {
    value.parse::<i64>().map(|n| n < 0).unwrap_or(false)
}

pub fn is_float(value: &str) -> bool {
    !value.is_empty() && value.parse::<f64>().is_ok()
}

/// isDecimal — has a decimal point
pub fn is_decimal(value: &str) -> bool {
    !value.is_empty() && DECIMAL_RE.is_match(value) && value.contains('.')
}

pub fn is_hexadecimal(value: &str) -> bool {
    !value.is_empty() && HEX_RE.is_match(value)
}

pub fn is_octal(value: &str) -> bool {
    !value.is_empty() && OCTAL_RE.is_match(value)
}

pub fn is_positive_number(value: &str) -> bool {
    value.parse::<f64>().map(|n| n > 0.0).unwrap_or(false)
}

pub fn is_negative_number(value: &str) -> bool {
    value.parse::<f64>().map(|n| n < 0.0).unwrap_or(false)
}

pub fn is_in_range(value: f64, min: f64, max: f64) -> bool {
    value >= min && value <= max
}

pub fn is_min_value(value: f64, min: f64) -> bool {
    value >= min
}

pub fn is_max_value(value: f64, max: f64) -> bool {
    value <= max
}

// Aliases used by orchestrator.rs
pub fn is_positive(value: f64) -> bool { value > 0.0 }
pub fn is_negative(value: f64) -> bool { value < 0.0 }
pub fn is_min(value: f64, min: f64) -> bool { is_min_value(value, min) }
pub fn is_max(value: f64, max: f64) -> bool { is_max_value(value, max) }

pub fn is_multiple_of(value: f64, multiple: f64) -> bool {
    if multiple == 0.0 {
        return false;
    }
    (value % multiple).abs() < f64::EPSILON
}

pub fn is_divisible_by(value: &str, divisor: i64) -> bool {
    if divisor == 0 {
        return false;
    }
    value.parse::<i64>().map(|n| n % divisor == 0).unwrap_or(false)
}

pub fn is_port(value: &str) -> bool {
    value.parse::<u16>().map(|n| n >= 1).unwrap_or(false)
}
