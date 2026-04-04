use once_cell::sync::Lazy;
use regex::Regex;

static NORMALIZE_EMAIL_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\.").unwrap());

pub fn ltrim(value: &str, chars: Option<&str>) -> String {
    match chars {
        None => value.trim_start().to_string(),
        Some(c) => {
            let set: std::collections::HashSet<char> = c.chars().collect();
            value.trim_start_matches(|ch| set.contains(&ch)).to_string()
        }
    }
}

pub fn rtrim(value: &str, chars: Option<&str>) -> String {
    match chars {
        None => value.trim_end().to_string(),
        Some(c) => {
            let set: std::collections::HashSet<char> = c.chars().collect();
            value.trim_end_matches(|ch| set.contains(&ch)).to_string()
        }
    }
}

pub fn trim(value: &str, chars: Option<&str>) -> String {
    match chars {
        None => value.trim().to_string(),
        Some(c) => {
            let set: std::collections::HashSet<char> = c.chars().collect();
            value
                .trim_start_matches(|ch| set.contains(&ch))
                .trim_end_matches(|ch| set.contains(&ch))
                .to_string()
        }
    }
}

pub fn escape(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for c in value.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#x27;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '/' => out.push_str("&#x2F;"),
            '\\' => out.push_str("&#x5C;"),
            '`' => out.push_str("&#96;"),
            _ => out.push(c),
        }
    }
    out
}

pub fn unescape(value: &str) -> String {
    value
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#x27;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&#x2F;", "/")
        .replace("&#x5C;", "\\")
        .replace("&#96;", "`")
}

pub fn strip_low(value: &str, keep_new_lines: bool) -> String {
    value
        .chars()
        .filter(|&c| {
            let cp = c as u32;
            if keep_new_lines && (c == '\n' || c == '\r') {
                return true;
            }
            !(cp < 0x20 || cp == 0x7F)
        })
        .collect()
}

pub fn whitelist(value: &str, chars: &str) -> String {
    value.chars().filter(|&c| chars.contains(c)).collect()
}

pub fn blacklist(value: &str, chars: &str) -> String {
    value.chars().filter(|&c| !chars.contains(c)).collect()
}

/// normalizeEmail — basic normalization: lowercase, remove dots in Gmail local part
pub fn normalize_email(value: &str) -> Option<String> {
    let at = value.rfind('@')?;
    let local = &value[..at];
    let domain = value[at + 1..].to_lowercase();

    let normalized_local = if domain == "gmail.com" || domain == "googlemail.com" {
        // Remove dots and lowercase
        let local_lower = local.to_lowercase();
        let without_dots = NORMALIZE_EMAIL_RE.replace_all(&local_lower, "").to_string();
        // Remove everything after +
        without_dots
            .split('+')
            .next()
            .unwrap_or("")
            .to_string()
    } else {
        local.to_lowercase()
    };

    if normalized_local.is_empty() {
        return None;
    }

    Some(format!("{}@{}", normalized_local, domain))
}
