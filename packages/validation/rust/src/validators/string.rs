use regex::Regex;

pub fn is_not_empty(value: &str) -> bool {
    !value.is_empty()
}

pub fn is_min_length(value: &str, min: usize) -> bool {
    value.chars().count() >= min
}

pub fn is_max_length(value: &str, max: usize) -> bool {
    value.chars().count() <= max
}

pub fn is_exact_length(value: &str, len: usize) -> bool {
    value.chars().count() == len
}

pub fn is_length_between(value: &str, min: usize, max: usize) -> bool {
    let len = value.chars().count();
    len >= min && len <= max
}

pub fn is_alpha(value: &str) -> bool {
    !value.is_empty() && value.chars().all(|c| c.is_alphabetic())
}

pub fn is_alphanumeric(value: &str) -> bool {
    !value.is_empty() && value.chars().all(|c| c.is_alphanumeric())
}

pub fn is_numeric(value: &str) -> bool {
    !value.is_empty() && value.chars().all(|c| c.is_ascii_digit())
}

pub fn is_ascii(value: &str) -> bool {
    value.is_ascii()
}

pub fn is_lowercase(value: &str) -> bool {
    !value.is_empty() && value.chars().all(|c| !c.is_alphabetic() || c.is_lowercase())
}

pub fn is_uppercase(value: &str) -> bool {
    !value.is_empty() && value.chars().all(|c| !c.is_alphabetic() || c.is_uppercase())
}

pub fn contains(value: &str, needle: &str) -> bool {
    value.contains(needle)
}

pub fn starts_with(value: &str, prefix: &str) -> bool {
    value.starts_with(prefix)
}

pub fn ends_with(value: &str, suffix: &str) -> bool {
    value.ends_with(suffix)
}

pub fn matches_regex(value: &str, pattern: &str) -> bool {
    Regex::new(pattern).map(|re| re.is_match(value)).unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_not_empty() {
        assert!(is_not_empty("hello"));
        assert!(!is_not_empty(""));
    }

    #[test]
    fn test_length() {
        assert!(is_min_length("hello", 3));
        assert!(!is_min_length("hi", 3));
        assert!(is_max_length("hi", 5));
        assert!(!is_max_length("hello world", 5));
        assert!(is_exact_length("abc", 3));
        assert!(is_length_between("abc", 2, 5));
    }

    #[test]
    fn test_char_types() {
        assert!(is_alpha("Hello"));
        assert!(!is_alpha("Hello1"));
        assert!(is_alphanumeric("Hello1"));
        assert!(!is_alphanumeric("Hello!"));
        assert!(is_numeric("12345"));
        assert!(!is_numeric("123a5"));
    }

    #[test]
    fn test_case() {
        assert!(is_lowercase("hello world"));
        assert!(!is_lowercase("Hello"));
        assert!(is_uppercase("HELLO WORLD"));
        assert!(!is_uppercase("Hello"));
    }

    #[test]
    fn test_contains_starts_ends() {
        assert!(contains("hello world", "world"));
        assert!(starts_with("hello", "he"));
        assert!(ends_with("hello", "lo"));
    }

    #[test]
    fn test_regex() {
        assert!(matches_regex("hello123", r"^[a-z]+\d+$"));
        assert!(!matches_regex("HELLO", r"^[a-z]+$"));
        assert!(!matches_regex("test", "[invalid regex("));
    }
}
