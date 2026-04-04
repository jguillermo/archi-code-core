use once_cell::sync::Lazy;
use regex::Regex;

// ─── Compiled regexes ────────────────────────────────────────────────────────

static HEX_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^(0x|0h)?[0-9A-Fa-f]+$").unwrap());
static OCTAL_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^(0o)?[0-7]+$").unwrap());
static DECIMAL_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[-+]?([0-9]+)?(\.[0-9]+)?$").unwrap());

// ─── Integer ─────────────────────────────────────────────────────────────────

pub fn is_integer(value: &str) -> bool {
    value.parse::<i64>().is_ok()
}

/// isInt — alias
pub fn is_int(value: &str) -> bool {
    is_integer(value)
}

pub fn is_positive_integer(value: &str) -> bool {
    value.parse::<i64>().map(|n| n > 0).unwrap_or(false)
}

pub fn is_negative_integer(value: &str) -> bool {
    value.parse::<i64>().map(|n| n < 0).unwrap_or(false)
}

// ─── Float / Decimal ─────────────────────────────────────────────────────────

pub fn is_float(value: &str) -> bool {
    !value.is_empty() && value.parse::<f64>().is_ok()
}

/// isDecimal — has decimal point (e.g. "3.14", not "42")
pub fn is_decimal(value: &str) -> bool {
    !value.is_empty() && DECIMAL_RE.is_match(value) && value.contains('.')
}

// ─── Base representations ────────────────────────────────────────────────────

pub fn is_hexadecimal(value: &str) -> bool {
    !value.is_empty() && HEX_RE.is_match(value)
}

pub fn is_octal(value: &str) -> bool {
    !value.is_empty() && OCTAL_RE.is_match(value)
}

// ─── Sign / Range ─────────────────────────────────────────────────────────────

pub fn is_positive(value: f64) -> bool {
    value > 0.0
}

pub fn is_negative(value: f64) -> bool {
    value < 0.0
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

pub fn is_min(value: f64, min: f64) -> bool {
    value >= min
}

pub fn is_max(value: f64, max: f64) -> bool {
    value <= max
}

pub fn is_multiple_of(value: f64, multiple: f64) -> bool {
    if multiple == 0.0 {
        return false;
    }
    (value % multiple).abs() < f64::EPSILON
}

/// isDivisibleBy — string version
pub fn is_divisible_by(value: &str, divisor: i64) -> bool {
    if divisor == 0 {
        return false;
    }
    value.parse::<i64>().map(|n| n % divisor == 0).unwrap_or(false)
}

// ─── Port ────────────────────────────────────────────────────────────────────

pub fn is_port(value: &str) -> bool {
    value.parse::<u16>().map(|n| n >= 1).unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_integer() {
        assert!(is_integer("42"));
        assert!(is_integer("-10"));
        assert!(is_integer("0"));
        assert!(!is_integer("3.14"));
        assert!(!is_integer("abc"));
    }

    #[test]
    fn test_signed_integers() {
        assert!(is_positive_integer("5"));
        assert!(!is_positive_integer("0"));
        assert!(is_negative_integer("-5"));
        assert!(!is_negative_integer("5"));
    }

    #[test]
    fn test_float() {
        assert!(is_float("3.14"));
        assert!(is_float("42"));
        assert!(!is_float("abc"));
        assert!(!is_float(""));
    }

    #[test]
    fn test_decimal() {
        assert!(is_decimal("3.14"));
        assert!(!is_decimal("42"));
        assert!(!is_decimal("abc"));
    }

    #[test]
    fn test_hex_octal() {
        assert!(is_hexadecimal("ff"));
        assert!(is_hexadecimal("0xFF"));
        assert!(!is_hexadecimal("xyz"));
        assert!(is_octal("0777"));
        assert!(is_octal("0o755"));
        assert!(!is_octal("89"));
    }

    #[test]
    fn test_range() {
        assert!(is_in_range(5.0, 1.0, 10.0));
        assert!(!is_in_range(11.0, 1.0, 10.0));
        assert!(is_min(5.0, 5.0));
        assert!(is_max(5.0, 5.0));
    }

    #[test]
    fn test_multiple() {
        assert!(is_multiple_of(10.0, 2.0));
        assert!(!is_multiple_of(10.0, 3.0));
        assert!(is_divisible_by("10", 2));
        assert!(!is_divisible_by("10", 3));
    }

    #[test]
    fn test_port() {
        assert!(is_port("80"));
        assert!(is_port("65535"));
        assert!(!is_port("0"));
        assert!(!is_port("65536"));
        assert!(!is_port("abc"));
    }
}
