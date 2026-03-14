use uuid::{Uuid, Version};

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_uuid() {
        assert!(is_uuid("550e8400-e29b-41d4-a716-446655440000"));
        assert!(is_uuid("6ba7b810-9dad-11d1-80b4-00c04fd430c8"));
    }

    #[test]
    fn test_invalid_uuid() {
        assert!(!is_uuid("not-a-uuid"));
        assert!(!is_uuid(""));
        assert!(!is_uuid("550e8400-e29b-41d4-a716"));
    }

    #[test]
    fn test_uuid_v4() {
        assert!(is_uuid_v4("550e8400-e29b-41d4-a716-446655440000"));
        assert!(!is_uuid_v4("6ba7b810-9dad-11d1-80b4-00c04fd430c8")); // v1
    }
}
