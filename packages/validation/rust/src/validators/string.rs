use regex::Regex;

pub fn is_empty(value: &str) -> bool {
    value.is_empty()
}

pub fn is_not_empty(value: &str) -> bool {
    !value.is_empty()
}

/// isLength — unicode grapheme count with optional min/max (max=0 means unlimited)
pub fn is_length(value: &str, min: usize, max: usize) -> bool {
    // Count chars, subtracting presentation sequences (U+FE0F/U+FE0E) and surrogate pairs
    let pres_seq = count_presentation_sequences(value);
    let surrogate_pairs = count_surrogate_pairs(value);
    let len = value.chars().count() - pres_seq - surrogate_pairs;
    len >= min && (max == 0 || len <= max)
}

fn count_presentation_sequences(s: &str) -> usize {
    let chars: Vec<char> = s.chars().collect();
    let mut count = 0;
    for i in 1..chars.len() {
        if (chars[i] == '\u{FE0F}' || chars[i] == '\u{FE0E}') && chars[i - 1] != '\u{FE0F}' && chars[i - 1] != '\u{FE0E}' {
            count += 1;
        }
    }
    count
}

fn count_surrogate_pairs(s: &str) -> usize {
    s.chars().filter(|&c| c as u32 >= 0x10000).count()
}

/// isByteLength — UTF-8 byte length check (max=0 means unlimited)
pub fn is_byte_length(value: &str, min: usize, max: usize) -> bool {
    let len = value.len();
    len >= min && (max == 0 || len <= max)
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

pub fn equals(a: &str, b: &str) -> bool {
    a == b
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
    Regex::new(pattern)
        .map(|re| re.is_match(value))
        .unwrap_or(false)
}

pub fn matches(value: &str, pattern: &str) -> bool {
    matches_regex(value, pattern)
}

pub fn is_in(value: &str, list: &[&str]) -> bool {
    list.contains(&value)
}

/// isWhitelisted — all characters must be in allowed chars string
pub fn is_whitelisted(value: &str, allowed_chars: &str) -> bool {
    value.chars().all(|c| allowed_chars.contains(c))
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
    let n = value.chars().count();
    n >= min && n <= max
}
