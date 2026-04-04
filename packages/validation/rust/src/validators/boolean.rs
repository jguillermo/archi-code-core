/// isBoolean — strict: only "true", "false", "1", "0"
pub fn is_boolean(value: &str) -> bool {
    matches!(value, "true" | "false" | "1" | "0")
}

/// isBoolean loose — also accepts "yes", "no"
pub fn is_boolean_loose(value: &str) -> bool {
    matches!(
        value.to_lowercase().as_str(),
        "true" | "false" | "1" | "0" | "yes" | "no"
    )
}

/// isBooleanString — original archi-code validator (true/false/1/0/yes/no/on/off)
pub fn is_boolean_string(value: &str) -> bool {
    matches!(
        value.to_lowercase().as_str(),
        "true" | "false" | "1" | "0" | "yes" | "no" | "on" | "off"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_boolean_strict() {
        assert!(is_boolean("true"));
        assert!(is_boolean("false"));
        assert!(is_boolean("1"));
        assert!(is_boolean("0"));
        assert!(!is_boolean("yes"));
        assert!(!is_boolean("TRUE")); // strict: case-sensitive
        assert!(!is_boolean(""));
    }

    #[test]
    fn test_boolean_loose() {
        assert!(is_boolean_loose("TRUE"));
        assert!(is_boolean_loose("yes"));
        assert!(is_boolean_loose("NO"));
        assert!(!is_boolean_loose("on")); // not in loose set
    }

    #[test]
    fn test_boolean_string() {
        assert!(is_boolean_string("true"));
        assert!(is_boolean_string("on"));
        assert!(is_boolean_string("OFF"));
        assert!(!is_boolean_string("maybe"));
        assert!(!is_boolean_string(""));
    }
}
