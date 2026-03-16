use once_cell::sync::Lazy;
use regex::Regex;

// ─── Compiled regexes (compiled once, reused) ────────────────────────────────

static HEX_COLOR_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$").unwrap());

static BASE64_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[A-Za-z0-9+/]*={0,2}$").unwrap());

static SLUG_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-z0-9]+(?:-[a-z0-9]+)*$").unwrap());

// ─── Credit card (Luhn algorithm) ─────────────────────────────────────────────

pub fn is_credit_card(value: &str) -> bool {
    let digits: Vec<u32> = value
        .chars()
        .filter(|c| c.is_ascii_digit())
        .filter_map(|c| c.to_digit(10))
        .collect();

    if digits.len() < 13 || digits.len() > 19 {
        return false;
    }

    let sum: u32 = digits
        .iter()
        .rev()
        .enumerate()
        .map(|(i, &d)| {
            if i % 2 == 1 {
                let doubled = d * 2;
                if doubled > 9 { doubled - 9 } else { doubled }
            } else {
                d
            }
        })
        .sum();

    sum % 10 == 0
}

// ─── JSON ─────────────────────────────────────────────────────────────────────

pub fn is_json(value: &str) -> bool {
    serde_json::from_str::<serde_json::Value>(value).is_ok()
}

// ─── Hex color ───────────────────────────────────────────────────────────────

pub fn is_hex_color(value: &str) -> bool {
    HEX_COLOR_RE.is_match(value)
}

// ─── Base64 ──────────────────────────────────────────────────────────────────

pub fn is_base64(value: &str) -> bool {
    if value.is_empty() {
        return false;
    }
    // Length must be a multiple of 4 (with padding)
    if value.len() % 4 != 0 {
        return false;
    }
    BASE64_RE.is_match(value)
}

// ─── Slug ────────────────────────────────────────────────────────────────────

pub fn is_slug(value: &str) -> bool {
    !value.is_empty() && SLUG_RE.is_match(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_credit_card_luhn() {
        // Valid Luhn numbers
        assert!(is_credit_card("4532015112830366")); // Visa
        assert!(is_credit_card("5425233430109903")); // Mastercard
        assert!(is_credit_card("374251018720955")); // Amex
        assert!(!is_credit_card("1234567890123456"));
        assert!(!is_credit_card("not-a-card"));
    }

    #[test]
    fn test_json() {
        assert!(is_json(r#"{"key": "value"}"#));
        assert!(is_json(r#"[1, 2, 3]"#));
        assert!(is_json("42"));
        assert!(is_json("\"string\""));
        assert!(!is_json("{invalid}"));
        assert!(!is_json(""));
    }

    #[test]
    fn test_hex_color() {
        assert!(is_hex_color("#fff"));
        assert!(is_hex_color("#FFF"));
        assert!(is_hex_color("#ffffff"));
        assert!(is_hex_color("#AABBCC"));
        assert!(!is_hex_color("fff"));    // missing #
        assert!(!is_hex_color("#ffff"));  // 4 chars
        assert!(!is_hex_color("#gggggg")); // invalid chars
    }

    #[test]
    fn test_base64() {
        assert!(is_base64("SGVsbG8gV29ybGQ="));
        assert!(is_base64("dGVzdA=="));
        assert!(!is_base64("not-base64!"));
        assert!(!is_base64(""));
    }

    #[test]
    fn test_slug() {
        assert!(is_slug("hello-world"));
        assert!(is_slug("my-article-title"));
        assert!(is_slug("simple"));
        assert!(!is_slug("Hello-World")); // uppercase not allowed
        assert!(!is_slug("-starts-with-dash"));
        assert!(!is_slug("has spaces"));
    }
}
