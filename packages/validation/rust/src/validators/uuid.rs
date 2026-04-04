use uuid::{Uuid, Version};
use once_cell::sync::Lazy;
use regex::Regex;

static ULID_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$").unwrap()
});

// ─── UUID ────────────────────────────────────────────────────────────────────

pub fn is_uuid(value: &str) -> bool {
    Uuid::parse_str(value).is_ok()
}

pub fn is_uuid_v4(value: &str) -> bool {
    Uuid::parse_str(value)
        .map(|u| u.get_version() == Some(Version::Random))
        .unwrap_or(false)
}

pub fn is_uuid_v7(value: &str) -> bool {
    Uuid::parse_str(value)
        .map(|u| u.get_version() == Some(Version::SortRand))
        .unwrap_or(false)
}

// ─── ULID ────────────────────────────────────────────────────────────────────

/// isULID — Universally Unique Lexicographically Sortable Identifier
pub fn is_ulid(value: &str) -> bool {
    ULID_RE.is_match(value)
}

// ─── MongoDB ObjectId ─────────────────────────────────────────────────────────

/// isMongoId — 24 hex character string
pub fn is_mongo_id(value: &str) -> bool {
    value.len() == 24 && value.chars().all(|c| c.is_ascii_hexdigit())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_uuid() {
        assert!(is_uuid("550e8400-e29b-41d4-a716-446655440000"));
        assert!(!is_uuid("not-a-uuid"));
        assert!(!is_uuid(""));
    }

    #[test]
    fn test_uuid_v4() {
        // v4 has version nibble = 4 and variant = 10xx
        assert!(is_uuid_v4("550e8400-e29b-41d4-a716-446655440000"));
        assert!(!is_uuid_v4("6ba7b810-9dad-11d1-80b4-00c04fd430c8")); // v1
    }

    #[test]
    fn test_ulid() {
        assert!(is_ulid("01ARZ3NDEKTSV4RRFFQ69G5FAV"));
        assert!(!is_ulid("not-a-ulid"));
        assert!(!is_ulid(""));
    }

    #[test]
    fn test_mongo_id() {
        assert!(is_mongo_id("507f1f77bcf86cd799439011"));
        assert!(!is_mongo_id("507f1f77bcf86cd79943901")); // 23 chars
        assert!(!is_mongo_id("507f1f77bcf86cd79943901g")); // invalid char
    }
}
