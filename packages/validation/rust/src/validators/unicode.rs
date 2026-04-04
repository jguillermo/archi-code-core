/// isFullWidth — contains full-width Unicode characters
/// Full-width: chars outside ASCII printable + halfwidth katakana ranges
pub fn is_full_width(value: &str) -> bool {
    value.chars().any(|c| {
        let cp = c as u32;
        // NOT in ASCII printable (0x20-0x7E) and NOT in halfwidth ranges
        !(0x0020..=0x007E).contains(&cp)
            && !(0xFF61..=0xFF9F).contains(&cp)
            && !(0xFFA0..=0xFFDC).contains(&cp)
            && !(0xFFE8..=0xFFEE).contains(&cp)
    })
}

/// isHalfWidth — contains half-width characters (ASCII + halfwidth katakana)
pub fn is_half_width(value: &str) -> bool {
    value.chars().any(|c| {
        let cp = c as u32;
        (0x0020..=0x007E).contains(&cp)
            || (0xFF61..=0xFF9F).contains(&cp)
            || (0xFFA0..=0xFFDC).contains(&cp)
            || (0xFFE8..=0xFFEE).contains(&cp)
    })
}

/// isVariableWidth — contains both full-width and half-width characters
pub fn is_variable_width(value: &str) -> bool {
    is_full_width(value) && is_half_width(value)
}

/// isMultibyte — contains any non-ASCII (multi-byte in UTF-8) character
pub fn is_multibyte(value: &str) -> bool {
    value.chars().any(|c| c as u32 > 0x7F)
}

/// isSurrogatePair — in Rust strings are valid UTF-8 (no surrogate pairs).
/// This checks if the string contains chars from the supplementary planes
/// (U+10000+), which would be surrogate pairs in UTF-16/JS.
pub fn is_surrogate_pair(value: &str) -> bool {
    value.chars().any(|c| c as u32 >= 0x10000)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_full_width() {
        assert!(is_full_width("Ａ")); // U+FF21 fullwidth A
        assert!(is_full_width("中文"));
        assert!(!is_full_width("abc"));
    }

    #[test]
    fn test_half_width() {
        assert!(is_half_width("abc"));
        assert!(is_half_width("abc中文")); // has some half-width
        assert!(!is_half_width("中文"));
    }

    #[test]
    fn test_variable_width() {
        assert!(is_variable_width("Ａabc")); // mixed
        assert!(!is_variable_width("abc")); // only half
        assert!(!is_variable_width("中文")); // only full (no half-width)
    }

    #[test]
    fn test_multibyte() {
        assert!(is_multibyte("中文"));
        assert!(is_multibyte("café"));
        assert!(!is_multibyte("ascii"));
    }

    #[test]
    fn test_surrogate_pair() {
        // 𠮷 is U+20BB7, in supplementary plane
        assert!(is_surrogate_pair("𠮷"));
        assert!(!is_surrogate_pair("abc"));
        assert!(!is_surrogate_pair("中文")); // BMP chars
    }
}
