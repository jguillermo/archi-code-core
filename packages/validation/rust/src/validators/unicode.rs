/// isFullWidth — contains any full-width (Unicode FF01–FF60 or FFE0–FFE6) character
pub fn is_full_width(value: &str) -> bool {
    value.chars().any(|c| {
        let cp = c as u32;
        (0xFF01..=0xFF60).contains(&cp) || (0xFFE0..=0xFFE6).contains(&cp)
    })
}

/// isHalfWidth — contains any half-width character (outside full-width ranges)
pub fn is_half_width(value: &str) -> bool {
    value.chars().any(|c| {
        let cp = c as u32;
        (0x0020..=0x007E).contains(&cp)
            || (0xFF61..=0xFFDC).contains(&cp)
            || (0xFFE8..=0xFFEE).contains(&cp)
    })
}

/// isVariableWidth — contains both full-width and half-width characters
pub fn is_variable_width(value: &str) -> bool {
    is_full_width(value) && is_half_width(value)
}

/// isMultibyte — contains any character with code point > 127
pub fn is_multibyte(value: &str) -> bool {
    value.chars().any(|c| c as u32 > 0x007F)
}

/// isSurrogatePair — the string contains a surrogate pair encoded as UTF-16
/// In Rust strings (UTF-8) we detect chars in the supplementary planes (U+10000+)
pub fn is_surrogate_pair(value: &str) -> bool {
    value.chars().any(|c| c as u32 >= 0x10000)
}
