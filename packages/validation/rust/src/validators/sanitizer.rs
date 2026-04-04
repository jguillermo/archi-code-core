use regex::Regex;

// ─── Trim ─────────────────────────────────────────────────────────────────────

/// ltrim — trim left whitespace (or specific chars)
pub fn ltrim(value: &str, chars: Option<&str>) -> String {
    match chars {
        None => value.trim_start().to_string(),
        Some(ch) => {
            let char_set: Vec<char> = ch.chars().collect();
            value.trim_start_matches(|c| char_set.contains(&c)).to_string()
        }
    }
}

/// rtrim — trim right whitespace (or specific chars)
pub fn rtrim(value: &str, chars: Option<&str>) -> String {
    match chars {
        None => value.trim_end().to_string(),
        Some(ch) => {
            let char_set: Vec<char> = ch.chars().collect();
            value.trim_end_matches(|c| char_set.contains(&c)).to_string()
        }
    }
}

/// trim — trim both sides
pub fn trim(value: &str, chars: Option<&str>) -> String {
    rtrim(&ltrim(value, chars), chars)
}

// ─── HTML escaping ───────────────────────────────────────────────────────────

/// escape — HTML entity escaping
pub fn escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('/', "&#x2F;")
        .replace('\\', "&#x5C;")
        .replace('`', "&#96;")
}

/// unescape — reverse HTML entity escaping
pub fn unescape(value: &str) -> String {
    value
        .replace("&quot;", "\"")
        .replace("&#x27;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&#x2F;", "/")
        .replace("&#x5C;", "\\")
        .replace("&#96;", "`")
        .replace("&amp;", "&") // must be last
}

// ─── Strip low ───────────────────────────────────────────────────────────────

/// stripLow — remove control characters (0x00–0x1F, 0x7F)
/// keep_new_lines: if true, preserve \n and \r
pub fn strip_low(value: &str, keep_new_lines: bool) -> String {
    value.chars().filter(|&c| {
        let cp = c as u32;
        if keep_new_lines && (c == '\n' || c == '\r') {
            return true;
        }
        !(cp <= 0x1F || cp == 0x7F)
    }).collect()
}

// ─── Whitelist / Blacklist ────────────────────────────────────────────────────

/// whitelist — keep only chars that appear in allowed_chars
pub fn whitelist(value: &str, allowed_chars: &str) -> String {
    if let Ok(re) = Regex::new(&format!("[^{}]+", regex::escape(allowed_chars))) {
        re.replace_all(value, "").to_string()
    } else {
        value.chars().filter(|c| {
            let mut buf = [0u8; 4];
            allowed_chars.contains(c.encode_utf8(&mut buf) as &str)
        }).collect()
    }
}

/// blacklist — remove chars that appear in chars_to_remove
pub fn blacklist(value: &str, chars_to_remove: &str) -> String {
    value.chars().filter(|c| {
        let mut buf = [0u8; 4];
        !chars_to_remove.contains(c.encode_utf8(&mut buf) as &str)
    }).collect()
}

// ─── Normalize email ─────────────────────────────────────────────────────────

/// normalizeEmail — basic normalization: lowercase, remove dots/subaddress for gmail
pub fn normalize_email(value: &str) -> Option<String> {
    let parts: Vec<&str> = value.splitn(2, '@').collect();
    if parts.len() != 2 {
        return None;
    }
    let (user, domain) = (parts[0], parts[1].to_lowercase());

    let normalized_user = if domain == "gmail.com" || domain == "googlemail.com" {
        let user_lower = user.to_lowercase();
        // Remove subaddress (+...)
        let base = user_lower.split('+').next().unwrap_or(&user_lower);
        // Remove dots
        base.replace('.', "")
    } else {
        user.to_lowercase()
    };

    let final_domain = if domain == "googlemail.com" {
        "gmail.com".to_string()
    } else {
        domain
    };

    Some(format!("{}@{}", normalized_user, final_domain))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trim() {
        assert_eq!(ltrim("  hello  ", None), "hello  ");
        assert_eq!(rtrim("  hello  ", None), "  hello");
        assert_eq!(trim("  hello  ", None), "hello");
        assert_eq!(ltrim("xxhello", Some("x")), "hello");
        assert_eq!(rtrim("helloxx", Some("x")), "hello");
    }

    #[test]
    fn test_escape_unescape() {
        let s = r#"<script>"alert('xss')"</script>"#;
        let escaped = escape(s);
        assert!(escaped.contains("&lt;"));
        assert!(escaped.contains("&gt;"));
        assert_eq!(unescape(&escaped), s);
    }

    #[test]
    fn test_strip_low() {
        let s = "hello\x00world\x1Fend";
        assert_eq!(strip_low(s, false), "helloworldend");
        let s2 = "hello\nworld";
        assert_eq!(strip_low(s2, true), "hello\nworld");
        assert_eq!(strip_low(s2, false), "helloworld");
    }

    #[test]
    fn test_whitelist_blacklist() {
        assert_eq!(whitelist("abc123!", "abc"), "abc");
        assert_eq!(blacklist("abc123", "123"), "abc");
    }

    #[test]
    fn test_normalize_email() {
        assert_eq!(normalize_email("Test.User+tag@gmail.com"), Some("testuser@gmail.com".to_string()));
        assert_eq!(normalize_email("user@googlemail.com"), Some("user@gmail.com".to_string()));
        assert_eq!(normalize_email("User@Example.COM"), Some("user@example.com".to_string()));
        assert_eq!(normalize_email("invalid"), None);
    }
}
