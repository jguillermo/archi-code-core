use regex::Regex;

// ─── Empty / Length ──────────────────────────────────────────────────────────

pub fn is_not_empty(value: &str) -> bool {
    !value.is_empty()
}

pub fn is_empty(value: &str) -> bool {
    value.is_empty()
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

/// isLength — char length with optional min/max (max=0 means unlimited)
pub fn is_length(value: &str, min: usize, max: usize) -> bool {
    let len = value.chars().count();
    len >= min && (max == 0 || len <= max)
}

/// isByteLength — UTF-8 byte length check
pub fn is_byte_length(value: &str, min: usize, max: usize) -> bool {
    let len = value.len();
    len >= min && (max == 0 || len <= max)
}

// ─── Character class ─────────────────────────────────────────────────────────

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

// ─── Contains / Matches ──────────────────────────────────────────────────────

pub fn equals(a: &str, b: &str) -> bool {
    a == b
}

pub fn contains(value: &str, needle: &str) -> bool {
    value.contains(needle)
}

pub fn contains_ignore_case(value: &str, needle: &str) -> bool {
    value.to_lowercase().contains(&needle.to_lowercase())
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

/// matches — alias for matches_regex
pub fn matches(value: &str, pattern: &str) -> bool {
    matches_regex(value, pattern)
}

// ─── Set membership ──────────────────────────────────────────────────────────

/// isIn — check if value is in a list of strings
pub fn is_in(value: &str, list: &[&str]) -> bool {
    list.contains(&value)
}

/// isWhitelisted — all characters in value must be in allowed chars
pub fn is_whitelisted(value: &str, allowed_chars: &str) -> bool {
    value.chars().all(|c| {
        let mut buf = [0u8; 4];
        allowed_chars.contains(c.encode_utf8(&mut buf) as &str)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty() {
        assert!(is_not_empty("hello"));
        assert!(!is_not_empty(""));
        assert!(is_empty(""));
        assert!(!is_empty("x"));
    }

    #[test]
    fn test_length() {
        assert!(is_min_length("hello", 3));
        assert!(!is_min_length("hi", 3));
        assert!(is_max_length("hi", 5));
        assert!(!is_max_length("hello world", 5));
        assert!(is_exact_length("abc", 3));
        assert!(is_length_between("abc", 2, 5));
        assert!(is_length("hello", 3, 10));
        assert!(!is_length("hi", 3, 10));
        assert!(is_length("hello", 3, 0)); // unlimited max
    }

    #[test]
    fn test_byte_length() {
        assert!(is_byte_length("hello", 3, 10));
        assert!(!is_byte_length("hi", 3, 0));
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
    fn test_contains() {
        assert!(contains("hello world", "world"));
        assert!(starts_with("hello", "he"));
        assert!(ends_with("hello", "lo"));
        assert!(equals("abc", "abc"));
        assert!(!equals("abc", "def"));
    }

    #[test]
    fn test_is_in() {
        assert!(is_in("foo", &["foo", "bar", "baz"]));
        assert!(!is_in("qux", &["foo", "bar", "baz"]));
    }

    #[test]
    fn test_is_whitelisted() {
        assert!(is_whitelisted("abc", "abcdef"));
        assert!(!is_whitelisted("abc!", "abcdef"));
    }

    #[test]
    fn test_regex() {
        assert!(matches_regex("hello123", r"^[a-z]+\d+$"));
        assert!(!matches_regex("HELLO", r"^[a-z]+$"));
    }
}
