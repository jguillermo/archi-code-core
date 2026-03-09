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
    fn test_boolean_string() {
        assert!(is_boolean_string("true"));
        assert!(is_boolean_string("false"));
        assert!(is_boolean_string("TRUE"));
        assert!(is_boolean_string("1"));
        assert!(is_boolean_string("0"));
        assert!(is_boolean_string("yes"));
        assert!(is_boolean_string("no"));
        assert!(is_boolean_string("on"));
        assert!(is_boolean_string("off"));
        assert!(!is_boolean_string("maybe"));
        assert!(!is_boolean_string(""));
        assert!(!is_boolean_string("2"));
    }
}
