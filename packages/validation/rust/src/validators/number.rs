pub fn is_integer(value: &str) -> bool {
    value.parse::<i64>().is_ok()
}

pub fn is_positive_integer(value: &str) -> bool {
    value.parse::<i64>().map(|n| n > 0).unwrap_or(false)
}

pub fn is_negative_integer(value: &str) -> bool {
    value.parse::<i64>().map(|n| n < 0).unwrap_or(false)
}

pub fn is_float(value: &str) -> bool {
    value.parse::<f64>().is_ok()
}

pub fn is_positive(value: f64) -> bool {
    value > 0.0
}

pub fn is_negative(value: f64) -> bool {
    value < 0.0
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_integer_parsing() {
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
        assert!(!is_positive_integer("-5"));
        assert!(is_negative_integer("-5"));
        assert!(!is_negative_integer("0"));
        assert!(!is_negative_integer("5"));
    }

    #[test]
    fn test_float() {
        assert!(is_float("3.14"));
        assert!(is_float("42"));
        assert!(!is_float("abc"));
    }

    #[test]
    fn test_sign() {
        assert!(is_positive(1.0));
        assert!(!is_positive(0.0));
        assert!(!is_positive(-1.0));
        assert!(is_negative(-1.0));
        assert!(!is_negative(0.0));
    }

    #[test]
    fn test_range() {
        assert!(is_in_range(5.0, 1.0, 10.0));
        assert!(!is_in_range(11.0, 1.0, 10.0));
        assert!(is_min(5.0, 5.0));
        assert!(!is_min(4.9, 5.0));
        assert!(is_max(5.0, 5.0));
        assert!(!is_max(5.1, 5.0));
    }

    #[test]
    fn test_multiple_of() {
        assert!(is_multiple_of(10.0, 2.0));
        assert!(!is_multiple_of(10.0, 3.0));
        assert!(!is_multiple_of(5.0, 0.0));
    }
}
