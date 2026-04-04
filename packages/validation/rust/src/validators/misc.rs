use once_cell::sync::Lazy;
use regex::Regex;
use semver::Version;

// ─── Compiled regexes ────────────────────────────────────────────────────────

static HEX_COLOR_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$").unwrap()
});
static RGB_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^rgb\((([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5]),){2}([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\)$").unwrap()
});
static RGBA_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^rgba\((([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5]),){3}(0?\.\d\d?|1(\.0)?|0(\.0)?)\)$").unwrap()
});
static HSL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)^hsla?\((\+|-)?([0-9]+(\.[0-9]+)?(e(\+|-)?[0-9]+)?)(deg|grad|rad|turn)?(,(\+|-)?([0-9]+(\.[0-9]+)?(e(\+|-)?[0-9]+)?)%){2}(,((\+|-)?([0-9]+(\.[0-9]+)?(e(\+|-)?[0-9]+)?)%?))?\)$").unwrap()
});
static BASE64_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[A-Za-z0-9+/]*={0,2}$").unwrap()
});
static BASE64_URL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[A-Za-z0-9\-_]*$").unwrap()
});
static BASE32_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[A-Z2-7]+=*$").unwrap()
});
static BASE32_CROCKFORD_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[A-HJKMNP-TV-Z0-9]+$").unwrap()
});
static BASE58_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[A-HJ-NP-Za-km-z1-9]*$").unwrap()
});
static SLUG_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[a-z0-9]+(?:-[a-z0-9]+)*$").unwrap()
});
static MIME_TYPE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)^(application|audio|font|image|message|model|multipart|text|video)/[a-zA-Z0-9\.\-\+_]{1,100}$").unwrap()
});
static LAT_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^\(?[+-]?(90(\.0+)?|[1-8]?\d(\.\d+)?)$").unwrap()
});
static LONG_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^\s?[+-]?(180(\.0+)?|1[0-7]\d(\.\d+)?|\d{1,2}(\.\d+)?)\)?$").unwrap()
});
static LOCALE_RE: Lazy<Regex> = Lazy::new(|| {
    // BCP 47 simplified pattern compatible with Rust regex (no lookaheads)
    Regex::new(r"^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*$|^x(-[a-zA-Z0-9]{1,8})+$|^i-[a-zA-Z]+$").unwrap()
});

// ─── Credit card (Luhn) ───────────────────────────────────────────────────────

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

// ─── Colors ──────────────────────────────────────────────────────────────────

pub fn is_hex_color(value: &str) -> bool {
    HEX_COLOR_RE.is_match(value)
}

pub fn is_rgb_color(value: &str) -> bool {
    RGB_RE.is_match(value) || RGBA_RE.is_match(value)
}

pub fn is_hsl(value: &str) -> bool {
    // Normalize multiple spaces before testing
    let normalized = value.split_whitespace().collect::<Vec<_>>().join(" ");
    HSL_RE.is_match(&normalized)
}

// ─── Encodings ───────────────────────────────────────────────────────────────

pub fn is_base64(value: &str) -> bool {
    if value.is_empty() {
        return false;
    }
    if value.len() % 4 != 0 {
        return false;
    }
    BASE64_RE.is_match(value)
}

pub fn is_base64_url_safe(value: &str) -> bool {
    !value.is_empty() && BASE64_URL_RE.is_match(value)
}

pub fn is_base32(value: &str) -> bool {
    !value.is_empty() && value.len() % 8 == 0 && BASE32_RE.is_match(value)
}

pub fn is_base32_crockford(value: &str) -> bool {
    !value.is_empty() && BASE32_CROCKFORD_RE.is_match(value)
}

pub fn is_base58(value: &str) -> bool {
    !value.is_empty() && BASE58_RE.is_match(value)
}

// ─── Slug ────────────────────────────────────────────────────────────────────

pub fn is_slug(value: &str) -> bool {
    !value.is_empty() && SLUG_RE.is_match(value)
}

// ─── SemVer ──────────────────────────────────────────────────────────────────

/// isSemVer — uses the `semver` crate for strict parsing
pub fn is_sem_ver(value: &str) -> bool {
    Version::parse(value).is_ok()
}

// ─── MIME type ───────────────────────────────────────────────────────────────

pub fn is_mime_type(value: &str) -> bool {
    MIME_TYPE_RE.is_match(value)
}

// ─── Lat/Long ────────────────────────────────────────────────────────────────

/// isLatLong — "lat,long" format (e.g. "40.6943,-74.0059")
pub fn is_lat_long(value: &str) -> bool {
    if !value.contains(',') {
        return false;
    }
    let pair: Vec<&str> = value.splitn(2, ',').collect();
    if pair.len() != 2 {
        return false;
    }
    // Handle optional surrounding parens
    let (lat_str, long_str) = (pair[0], pair[1]);
    if (lat_str.starts_with('(') && !long_str.ends_with(')'))
        || (long_str.ends_with(')') && !lat_str.starts_with('('))
    {
        return false;
    }
    LAT_RE.is_match(lat_str) && LONG_RE.is_match(long_str)
}

// ─── Locale ──────────────────────────────────────────────────────────────────

pub fn is_locale(value: &str) -> bool {
    LOCALE_RE.is_match(value)
}

// ─── ISO 6346 (shipping containers) ─────────────────────────────────────────

static ISO6346_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[A-Z]{3}[UJZ][0-9]{6,7}$").unwrap()
});

/// isISO6346 — ISO 6346 shipping container ID with optional check digit
pub fn is_iso6346(value: &str) -> bool {
    let upper = value.to_uppercase();
    if !ISO6346_RE.is_match(&upper) {
        return false;
    }
    // If 11 chars (4 letters + 6 digits + 1 check digit), validate check digit
    if upper.len() == 11 {
        let chars: Vec<char> = upper.chars().collect();
        let mut sum: u64 = 0;
        for (i, &c) in chars[..10].iter().enumerate() {
            let val: u64 = if c.is_ascii_alphabetic() {
                let code = c as u64 - 55; // 'A'=10
                if code < 11 { code }
                else if code < 22 { code + 1 }
                else if code < 33 { code + 2 }
                else { code + 3 }
            } else {
                c.to_digit(10).unwrap_or(0) as u64
            };
            sum += val * (1 << i);
        }
        let mut check = sum % 11;
        if check == 10 { check = 0; }
        let last = chars[10].to_digit(10).unwrap_or(255) as u64;
        return check == last;
    }
    true
}

pub fn is_freight_container_id(value: &str) -> bool {
    is_iso6346(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_credit_card() {
        assert!(is_credit_card("4532015112830366"));
        assert!(is_credit_card("5425233430109903"));
        assert!(!is_credit_card("1234567890123456"));
    }

    #[test]
    fn test_json() {
        assert!(is_json(r#"{"key": "value"}"#));
        assert!(is_json("[1,2,3]"));
        assert!(!is_json("{invalid}"));
    }

    #[test]
    fn test_colors() {
        assert!(is_hex_color("#fff"));
        assert!(is_hex_color("#ffffff"));
        assert!(is_hex_color("#ffffffff")); // with alpha
        assert!(!is_hex_color("fff"));
        assert!(is_rgb_color("rgb(255,0,0)"));
        assert!(is_rgb_color("rgba(255,0,0,0.5)"));
        assert!(!is_rgb_color("rgb(256,0,0)"));
        assert!(is_hsl("hsl(360,100%,50%)"));
    }

    #[test]
    fn test_encodings() {
        assert!(is_base64("SGVsbG8gV29ybGQ="));
        assert!(is_base64("dGVzdA=="));
        assert!(!is_base64("not-base64!"));
        assert!(is_base32("MFRA===="));
        assert!(is_base58("2NEpo7TZRRrLZSi2U"));
    }

    #[test]
    fn test_slug() {
        assert!(is_slug("hello-world"));
        assert!(!is_slug("Hello-World"));
        assert!(!is_slug("-start"));
    }

    #[test]
    fn test_semver() {
        assert!(is_sem_ver("1.0.0"));
        assert!(is_sem_ver("2.3.4-alpha.1"));
        assert!(!is_sem_ver("1.0"));
        assert!(!is_sem_ver("not-semver"));
    }

    #[test]
    fn test_mime_type() {
        assert!(is_mime_type("image/png"));
        assert!(is_mime_type("application/json"));
        assert!(!is_mime_type("invalid"));
    }

    #[test]
    fn test_lat_long() {
        assert!(is_lat_long("40.6943,-74.0059"));
        assert!(is_lat_long("(40.6943,-74.0059)"));
        assert!(!is_lat_long("91.0,-74.0"));
        assert!(!is_lat_long("not-a-coord"));
    }

    #[test]
    fn test_locale() {
        assert!(is_locale("en"));
        assert!(is_locale("en-US"));
        assert!(is_locale("zh-Hans-CN"));
        assert!(!is_locale("not a locale"));
    }
}
