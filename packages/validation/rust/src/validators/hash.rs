use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::HashMap;

// ─── Hash length map ─────────────────────────────────────────────────────────

static HASH_LENGTHS: Lazy<HashMap<&'static str, usize>> = Lazy::new(|| {
    let mut m = HashMap::new();
    m.insert("md5",        32);
    m.insert("md4",        32);
    m.insert("sha1",       40);
    m.insert("sha256",     64);
    m.insert("sha384",     96);
    m.insert("sha512",    128);
    m.insert("ripemd128",  32);
    m.insert("ripemd160",  40);
    m.insert("tiger128",   32);
    m.insert("tiger160",   40);
    m.insert("tiger192",   48);
    m.insert("crc32",       8);
    m.insert("crc32b",      8);
    m
});

static HEX_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[a-fA-F0-9]+$").unwrap()
});

static BASE64_URL_SAFE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[A-Za-z0-9\-_]+$").unwrap()
});

// ─── MD5 ─────────────────────────────────────────────────────────────────────

pub fn is_md5(value: &str) -> bool {
    value.len() == 32 && HEX_RE.is_match(value)
}

// ─── Generic hash ────────────────────────────────────────────────────────────

/// isHash — validates a hash string for a given algorithm
/// algorithm: "md5" | "md4" | "sha1" | "sha256" | "sha384" | "sha512" |
///            "ripemd128" | "ripemd160" | "tiger128" | "tiger160" | "tiger192" |
///            "crc32" | "crc32b"
pub fn is_hash(value: &str, algorithm: &str) -> bool {
    let expected_len = match HASH_LENGTHS.get(algorithm) {
        Some(&len) => len,
        None => return false,
    };
    value.len() == expected_len && HEX_RE.is_match(value)
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

/// isJWT — three base64url-safe segments separated by dots
pub fn is_jwt(value: &str) -> bool {
    let parts: Vec<&str> = value.split('.').collect();
    if parts.len() != 3 {
        return false;
    }
    parts.iter().all(|part| !part.is_empty() && BASE64_URL_SAFE_RE.is_match(part))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_md5() {
        assert!(is_md5("d41d8cd98f00b204e9800998ecf8427e"));
        assert!(!is_md5("not-an-md5"));
        assert!(!is_md5("d41d8cd98f00b204e9800998ecf8427")); // 31 chars
    }

    #[test]
    fn test_hash() {
        assert!(is_hash("d41d8cd98f00b204e9800998ecf8427e", "md5"));
        assert!(is_hash("da39a3ee5e6b4b0d3255bfef95601890afd80709", "sha1"));
        assert!(!is_hash("invalid", "sha1"));
        assert!(!is_hash("abc", "unknown_algo"));
    }

    #[test]
    fn test_jwt() {
        // A typical JWT has 3 base64url parts separated by dots
        assert!(is_jwt("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"));
        assert!(!is_jwt("not.a.valid jwt"));
        assert!(!is_jwt("onlytwoparts.here"));
    }
}
