use once_cell::sync::Lazy;
use regex::Regex;
use uuid::{Uuid, Version};

static ULID_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$").unwrap());

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

pub fn is_ulid(value: &str) -> bool {
    ULID_RE.is_match(value)
}

/// isMongoId — 24-char hex string
pub fn is_mongo_id(value: &str) -> bool {
    value.len() == 24 && value.chars().all(|c| c.is_ascii_hexdigit())
}
