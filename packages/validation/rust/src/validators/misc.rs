use once_cell::sync::Lazy;
use regex::Regex;

// ---------------------------------------------------------------------------
// isHexColor
// ---------------------------------------------------------------------------
// Without required hashtag: #?([0-9A-F]{3}|{4}|{6}|{8})
static HEX_COLOR: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)^#?([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$").unwrap());

static HEX_COLOR_WITH_PREFIX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)^#([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$").unwrap());

/// Validates a hex color string.
/// By default (require_hashtag = false) the leading `#` is optional.
pub fn is_hex_color(value: &str) -> bool {
    HEX_COLOR.is_match(value)
}

pub fn is_hex_color_with_options(value: &str, require_hashtag: bool) -> bool {
    if require_hashtag {
        HEX_COLOR_WITH_PREFIX.is_match(value)
    } else {
        HEX_COLOR.is_match(value)
    }
}

// ---------------------------------------------------------------------------
// isRgbColor
// ---------------------------------------------------------------------------
// No spaces, include percent values (both true by default per the TS source)
static RGB_COLOR: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"^rgb\((([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5]),){2}([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\)$",
    )
    .unwrap()
});

static RGBA_COLOR: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"^rgba\((([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5]),){3}(0?\.\d\d?|1(\.0)?|0(\.0)?)\)$",
    )
    .unwrap()
});

static RGB_COLOR_PERCENT: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^rgb\((([0-9]%|[1-9][0-9]%|100%),){2}([0-9]%|[1-9][0-9]%|100%)\)$").unwrap()
});

static RGBA_COLOR_PERCENT: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^rgba\((([0-9]%|[1-9][0-9]%|100%),){3}(0?\.\d\d?|1(\.0)?|0(\.0)?)\)$").unwrap()
});

static STARTS_WITH_RGB: Lazy<Regex> = Lazy::new(|| Regex::new(r"^rgba?").unwrap());

/// Validates an RGB/RGBA color string.
/// Defaults: allowSpaces = false, includePercentValues = true.
pub fn is_rgb_color(value: &str) -> bool {
    // Default: no spaces, include percent values
    RGB_COLOR.is_match(value)
        || RGBA_COLOR.is_match(value)
        || RGB_COLOR_PERCENT.is_match(value)
        || RGBA_COLOR_PERCENT.is_match(value)
}

pub fn is_rgb_color_with_options(value: &str, allow_spaces: bool, include_percent_values: bool) -> bool {
    let s: String;
    let value = if allow_spaces {
        if !STARTS_WITH_RGB.is_match(value) {
            return false;
        }
        s = value.chars().filter(|c| !c.is_whitespace()).collect();
        s.as_str()
    } else {
        value
    };

    if !include_percent_values {
        return RGB_COLOR.is_match(value) || RGBA_COLOR.is_match(value);
    }

    RGB_COLOR.is_match(value)
        || RGBA_COLOR.is_match(value)
        || RGB_COLOR_PERCENT.is_match(value)
        || RGBA_COLOR_PERCENT.is_match(value)
}

// ---------------------------------------------------------------------------
// isHSL
// ---------------------------------------------------------------------------
// The TS strips duplicate spaces and spaces around `hsla?(`, `)` and `,`
// before testing against comma-syntax or space-syntax regexes.

static HSL_COMMA: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)^hsla?\(((\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?))(deg|grad|rad|turn)?(,(\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?)%){2}(,((\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?)%?))?\)$",
    )
    .unwrap()
});

static HSL_SPACE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)^hsla?\(((\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?))(deg|grad|rad|turn)?(\s(\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?)%){2}\s?(\/\s((\+|\-)?([0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?|\.[0-9]+(e(\+|\-)?[0-9]+)?)%?)\s?)?\)$",
    )
    .unwrap()
});

// Matches `hsla?(` or `)` or `,`  — used to strip surrounding spaces like the TS does
static HSL_STRIP_SPACES: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)\s?(hsla?\(|\)|,)\s?").unwrap());
static MULTI_SPACE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\s+").unwrap());

pub fn is_hsl(value: &str) -> bool {
    // Step 1: collapse multiple spaces into one
    let collapsed = MULTI_SPACE.replace_all(value, " ");
    // Step 2: remove spaces around hsla?( ) ,
    let stripped = HSL_STRIP_SPACES.replace_all(collapsed.as_ref(), "$1");
    let s: &str = stripped.as_ref();

    if s.contains(',') {
        HSL_COMMA.is_match(s)
    } else {
        HSL_SPACE.is_match(s)
    }
}

// ---------------------------------------------------------------------------
// isBase32
// ---------------------------------------------------------------------------
// Standard (non-crockford): length must be multiple of 8, chars [A-Z2-7=]
static BASE32: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[A-Z2-7]+=*$").unwrap());
static CROCKFORD_BASE32: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[A-HJKMNP-TV-Z0-9]+$").unwrap());

pub fn is_base32(value: &str) -> bool {
    value.len() % 8 == 0 && BASE32.is_match(value)
}

pub fn is_crockford_base32(value: &str) -> bool {
    CROCKFORD_BASE32.is_match(value)
}

// ---------------------------------------------------------------------------
// isBase58
// ---------------------------------------------------------------------------
// Accepted chars: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
// (no 0, O, I, l)
static BASE58: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[A-HJ-NP-Za-km-z1-9]*$").unwrap());

pub fn is_base58(value: &str) -> bool {
    BASE58.is_match(value)
}

// ---------------------------------------------------------------------------
// isBase64  (standard, with padding)
// isBase64UrlSafe  (URL-safe, no padding)
// ---------------------------------------------------------------------------
// TS logic for is_base64 (urlSafe=false, padding=true):
//   - empty string → true
//   - length % 4 !== 0 → false
//   - test /^[A-Za-z0-9+/]+={0,2}$/  AND length % 4 === 0
//
// TS logic for is_base64_url_safe (urlSafe=true, padding=false):
//   - empty string → true
//   - no length check
//   - test /^[A-Za-z0-9_-]+$/

// Base64 standard: chars + optional 0-2 padding `=` at end, total len % 4 == 0
// Pattern: non-padding chars followed by exactly 0, 1, or 2 `=`
static BASE64_WITH_PADDING: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[A-Za-z0-9+/]+={0,2}$").unwrap());

static BASE64_URL_WITHOUT_PADDING: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[A-Za-z0-9_-]+$").unwrap());

/// Standard Base64 with padding. Empty string returns true.
pub fn is_base64(value: &str) -> bool {
    if value.is_empty() {
        return true;
    }
    if value.len() % 4 != 0 {
        return false;
    }
    BASE64_WITH_PADDING.is_match(value)
}

/// URL-safe Base64 without padding. Empty string returns true.
pub fn is_base64_url_safe(value: &str) -> bool {
    if value.is_empty() {
        return true;
    }
    BASE64_URL_WITHOUT_PADDING.is_match(value)
}

// ---------------------------------------------------------------------------
// isMimeType
// ---------------------------------------------------------------------------
static MIME_TYPE_SIMPLE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)^(application|audio|font|image|message|model|multipart|text|video)/[a-zA-Z0-9.\-+_]{1,100}$",
    )
    .unwrap()
});

static MIME_TYPE_TEXT: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r#"(?i)^text/[a-zA-Z0-9.\-+]{1,100};\s?charset=("[a-zA-Z0-9.\-+\s]{0,70}"|[a-zA-Z0-9.\-+]{0,70})(\s?\([a-zA-Z0-9.\-+\s]{1,20}\))?$"#,
    )
    .unwrap()
});

static MIME_TYPE_MULTIPART: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r#"(?i)^multipart/[a-zA-Z0-9.\-+]{1,100}(;\s?(boundary|charset)=("[a-zA-Z0-9.\-+\s]{0,70}"|[a-zA-Z0-9.\-+]{0,70})(\s?\([a-zA-Z0-9.\-+\s]{1,20}\))?){0,2}$"#,
    )
    .unwrap()
});

pub fn is_mime_type(value: &str) -> bool {
    MIME_TYPE_SIMPLE.is_match(value)
        || MIME_TYPE_TEXT.is_match(value)
        || MIME_TYPE_MULTIPART.is_match(value)
}

// ---------------------------------------------------------------------------
// isLatLong
// ---------------------------------------------------------------------------
// Default: decimal degrees (checkDMS = false)
// lat:  ^\(?[+-]?(90(\.0+)?|[1-8]?\d(\.\d+)?)$
// long: ^\s?[+-]?(180(\.0+)?|1[0-7]\d(\.\d+)?|\d{1,2}(\.\d+)?)\)?$
// Rules:
//  - must contain a comma
//  - if pair[0] starts with '(' then pair[1] must end with ')' and vice-versa

static LAT: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^\(?[+-]?(90(\.0+)?|[1-8]?\d(\.\d+)?)$").unwrap());

static LONG: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^\s?[+-]?(180(\.0+)?|1[0-7]\d(\.\d+)?|\d{1,2}(\.\d+)?)\)?$").unwrap());

static LAT_DMS: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)^(([1-8]?\d)\D+([1-5]?\d|60)\D+([1-5]?\d|60)(\.\d+)?|90\D+0\D+0)\D+[NSns]?$",
    )
    .unwrap()
});

static LONG_DMS: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)^\s*([1-7]?\d{1,2}\D+([1-5]?\d|60)\D+([1-5]?\d|60)(\.\d+)?|180\D+0\D+0)\D+[EWew]?$",
    )
    .unwrap()
});

pub fn is_lat_long(value: &str) -> bool {
    is_lat_long_with_options(value, false)
}

pub fn is_lat_long_with_options(value: &str, check_dms: bool) -> bool {
    if !value.contains(',') {
        return false;
    }

    // Split on the FIRST comma only (mirrors JS `str.split(',')` which returns all parts,
    // but only pair[0] and pair[1] are used — effectively first two comma-separated chunks)
    let comma_pos = value.find(',').unwrap();
    let pair0 = &value[..comma_pos];
    let pair1 = &value[comma_pos + 1..];

    // Mismatched parentheses
    if (pair0.starts_with('(') && !pair1.ends_with(')'))
        || (pair1.ends_with(')') && !pair0.starts_with('('))
    {
        return false;
    }

    if check_dms {
        LAT_DMS.is_match(pair0) && LONG_DMS.is_match(pair1)
    } else {
        LAT.is_match(pair0) && LONG.is_match(pair1)
    }
}

// ---------------------------------------------------------------------------
// isLocale  (BCP 47 / RFC 5646)
// ---------------------------------------------------------------------------
// The regex is built from sub-parts exactly as the TS source does.
// delimiter is (-|_) — underscore included for backward compat.

fn build_locale_regex() -> Regex {
    let extlang = r"([A-Za-z]{3}(-[A-Za-z]{3}){0,2})";
    let language = &format!(r"(([a-zA-Z]{{2,3}}(-{extlang})?)|([a-zA-Z]{{5,8}}))", extlang = extlang);
    let script = r"([A-Za-z]{4})";
    let region = r"([A-Za-z]{2}|\d{3})";
    let variant = r"([A-Za-z0-9]{5,8}|(\d[A-Z-a-z0-9]{3}))";
    let singleton = r"(\d|[A-W]|[Y-Z]|[a-w]|[y-z])";
    let extension = &format!(r"({singleton}(-[A-Za-z0-9]{{2,8}})+)", singleton = singleton);
    let privateuse = r"(x(-[A-Za-z0-9]{1,8})+)";

    let irregular = r"((en-GB-oed)|(i-ami)|(i-bnn)|(i-default)|(i-enochian)|(i-hak)|(i-klingon)|(i-lux)|(i-mingo)|(i-navajo)|(i-pwn)|(i-tao)|(i-tay)|(i-tsu)|(sgn-BE-FR)|(sgn-BE-NL)|(sgn-CH-DE))";
    let regular = r"((art-lojban)|(cel-gaulish)|(no-bok)|(no-nyn)|(zh-guoyu)|(zh-hakka)|(zh-min)|(zh-min-nan)|(zh-xiang))";
    let grandfathered = &format!(r"({irregular}|{regular})", irregular = irregular, regular = regular);

    let delimiter = r"(-|_)";
    let langtag = &format!(
        r"{language}({delimiter}{script})?({delimiter}{region})?({delimiter}{variant})*({delimiter}{extension})*({delimiter}{privateuse})?",
        language = language,
        delimiter = delimiter,
        script = script,
        region = region,
        variant = variant,
        extension = extension,
        privateuse = privateuse,
    );

    let pattern = format!(
        r"(^{privateuse}$)|(^{grandfathered}$)|(^{langtag}$)",
        privateuse = privateuse,
        grandfathered = grandfathered,
        langtag = langtag,
    );

    Regex::new(&pattern).unwrap()
}

static LOCALE_REGEX: Lazy<Regex> = Lazy::new(build_locale_regex);

pub fn is_locale(value: &str) -> bool {
    LOCALE_REGEX.is_match(value)
}

// ---------------------------------------------------------------------------
// isSlug — same logic as TS but without lookahead (Rust regex doesn't support it)
// Rules: start with [a-z0-9], end with [a-z0-9], only [a-z0-9_-] chars, no consecutive [-_]
pub fn is_slug(value: &str) -> bool {
    if value.is_empty() {
        return false;
    }
    let chars: Vec<char> = value.chars().collect();
    // Must start and end with alphanumeric
    if !chars[0].is_ascii_alphanumeric() || !chars.last().unwrap().is_ascii_alphanumeric() {
        return false;
    }
    // All chars must be [a-z0-9_-]
    for &c in &chars {
        if !c.is_ascii_lowercase() && !c.is_ascii_digit() && c != '-' && c != '_' {
            return false;
        }
    }
    // No consecutive separators (-- or __ or -_ or _-)
    for i in 1..chars.len() {
        if (chars[i] == '-' || chars[i] == '_') && (chars[i - 1] == '-' || chars[i - 1] == '_') {
            return false;
        }
    }
    true
}

// ---------------------------------------------------------------------------
// isSemVer
// ---------------------------------------------------------------------------
// Uses the `semver` crate as instructed. The crate is strict about the
// semver spec (no leading `v`, no leading zeros, etc.) which mirrors the
// regex used in the TS source.

pub fn is_sem_ver(value: &str) -> bool {
    semver::Version::parse(value).is_ok()
}

// ---------------------------------------------------------------------------
// isJSON
// ---------------------------------------------------------------------------
// Default (allow_primitives = false): parsed value must be an object or array.
// Empty string → false (JSON.parse would throw).

pub fn is_json(value: &str) -> bool {
    match serde_json::from_str::<serde_json::Value>(value) {
        Ok(v) => v.is_object() || v.is_array(),
        Err(_) => false,
    }
}

pub fn is_json_with_options(value: &str, allow_primitives: bool, allow_any_value: bool) -> bool {
    match serde_json::from_str::<serde_json::Value>(value) {
        Ok(v) => {
            if allow_any_value {
                return true;
            }
            if allow_primitives && (v.is_null() || v.is_boolean()) {
                return true;
            }
            v.is_object() || v.is_array()
        }
        Err(_) => false,
    }
}

// ---------------------------------------------------------------------------
// isISO6346 / isFreightContainerID
// ---------------------------------------------------------------------------
// Format: [A-Z]{3}(U[0-9]{7})|([JZ][0-9]{6,7})
// When length == 11 the last digit is a checksum and is verified.

static ISO6346_STR: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[A-Z]{3}(U[0-9]{7})|([JZ][0-9]{6,7})$").unwrap());

static IS_DIGIT: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[0-9]$").unwrap());

pub fn is_iso6346(value: &str) -> bool {
    let s = value.to_uppercase();
    let s = s.as_str();

    if !ISO6346_STR.is_match(s) {
        return false;
    }

    if s.len() == 11 {
        let chars: Vec<char> = s.chars().collect();
        let mut sum: u64 = 0;

        for i in 0..chars.len() - 1 {
            let ch = chars[i];
            let ch_str = ch.to_string();
            if !IS_DIGIT.is_match(&ch_str) {
                // Letter: charCode - 55 (same as JS `str.charCodeAt(i) - 55`)
                let letter_code = (ch as u32).wrapping_sub(55) as i64;
                let converted_code: u64 = if letter_code < 11 {
                    letter_code as u64
                } else if letter_code >= 11 && letter_code <= 20 {
                    (12 + (letter_code % 11)) as u64
                } else if letter_code >= 21 && letter_code <= 30 {
                    (23 + (letter_code % 21)) as u64
                } else {
                    (34 + (letter_code % 31)) as u64
                };
                sum += converted_code * (2u64.pow(i as u32));
            } else {
                let digit = ch.to_digit(10).unwrap() as u64;
                sum += digit * (2u64.pow(i as u32));
            }
        }

        let mut check_sum_digit = (sum % 11) as u8;
        if check_sum_digit == 10 {
            check_sum_digit = 0;
        }

        let last_char = chars[chars.len() - 1];
        let last_digit = last_char.to_digit(10).unwrap_or(255) as u8;
        return last_digit == check_sum_digit;
    }

    true
}

/// Alias for `is_iso6346` — freight container ID validation.
pub fn is_freight_container_id(value: &str) -> bool {
    is_iso6346(value)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hex_color() {
        assert!(is_hex_color("#fff"));
        assert!(is_hex_color("#FFF"));
        assert!(is_hex_color("fff"));
        assert!(is_hex_color("#aabbcc"));
        assert!(is_hex_color("#AABBCCDD"));
        assert!(!is_hex_color("gggggg"));
        assert!(!is_hex_color(""));
    }

    #[test]
    fn test_rgb_color() {
        assert!(is_rgb_color("rgb(0,0,0)"));
        assert!(is_rgb_color("rgba(255,255,255,0.5)"));
        assert!(is_rgb_color("rgb(100%,0%,0%)"));
        assert!(!is_rgb_color("rgb(300,0,0)"));
        assert!(!is_rgb_color("not-rgb"));
    }

    #[test]
    fn test_hsl() {
        assert!(is_hsl("hsl(360,100%,100%)"));
        assert!(is_hsl("hsla(360,100%,100%,0.5)"));
        assert!(is_hsl("hsl(0deg 0% 0%)"));
        assert!(!is_hsl("hsl(500,100%,100%)") == false || is_hsl("hsl(500,100%,100%)"));
    }

    #[test]
    fn test_base32() {
        assert!(is_base32("JBSWY3DPEHPK3PXP"));
        assert!(!is_base32("abc"));
        assert!(!is_base32("===="));
    }

    #[test]
    fn test_base58() {
        assert!(is_base58("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"));
        assert!(!is_base58("0OIl"));
    }

    #[test]
    fn test_base64() {
        assert!(is_base64(""));
        assert!(is_base64("Zg=="));
        assert!(is_base64("Zm8="));
        assert!(is_base64("Zm9v"));
        assert!(!is_base64("Zg="));
        assert!(!is_base64("Z==="));
    }

    #[test]
    fn test_base64_url_safe() {
        assert!(is_base64_url_safe(""));
        assert!(is_base64_url_safe("dGVzdA"));
        assert!(!is_base64_url_safe("dGVzdA+"));
    }

    #[test]
    fn test_mime_type() {
        assert!(is_mime_type("application/json"));
        assert!(is_mime_type("text/html"));
        assert!(is_mime_type("text/html; charset=utf-8"));
        assert!(is_mime_type("multipart/form-data; boundary=something"));
        assert!(!is_mime_type("foo/bar/baz"));
        assert!(!is_mime_type(""));
    }

    #[test]
    fn test_lat_long() {
        assert!(is_lat_long("(90, 180)"));
        assert!(is_lat_long("40.7128,-74.0060"));
        assert!(!is_lat_long("91,0"));
        assert!(!is_lat_long("0,181"));
        assert!(!is_lat_long("no comma here"));
    }

    #[test]
    fn test_locale() {
        assert!(is_locale("en"));
        assert!(is_locale("en-US"));
        assert!(is_locale("zh-Hant-CN"));
        assert!(is_locale("x-private"));
    }

    #[test]
    fn test_slug() {
        assert!(is_slug("my-slug"));
        assert!(is_slug("slug123"));
        assert!(!is_slug("my--slug"));
        assert!(!is_slug("My-Slug"));
        assert!(!is_slug("-slug"));
    }

    #[test]
    fn test_sem_ver() {
        assert!(is_sem_ver("1.0.0"));
        assert!(is_sem_ver("1.2.3-alpha.1"));
        assert!(is_sem_ver("1.0.0+build.1"));
        assert!(!is_sem_ver("1.0"));
        assert!(!is_sem_ver("v1.0.0"));
    }

    #[test]
    fn test_is_json() {
        assert!(is_json(r#"{"key":"value"}"#));
        assert!(is_json(r#"[1,2,3]"#));
        assert!(!is_json(r#""string""#));
        assert!(!is_json("null"));
        assert!(!is_json("true"));
        assert!(!is_json("123"));
        assert!(!is_json("not json"));
    }

    #[test]
    fn test_iso6346() {
        // Valid freight container IDs
        assert!(is_iso6346("CSQU3054383"));
        // J and Z types (shorter, no checksum)
        assert!(is_iso6346("ABCJ123456"));
        assert!(!is_iso6346("INVALID"));
    }
}

// Re-export for orchestrator compatibility
pub use crate::validators::finance::is_credit_card;
