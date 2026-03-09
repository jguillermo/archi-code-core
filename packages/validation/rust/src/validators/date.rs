use chrono::{NaiveDate, NaiveTime, DateTime};

pub fn is_date(value: &str) -> bool {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").is_ok()
}

pub fn is_datetime(value: &str) -> bool {
    // Try ISO 8601 / RFC 3339 formats
    DateTime::parse_from_rfc3339(value).is_ok()
        || DateTime::parse_from_str(value, "%Y-%m-%dT%H:%M:%S%.f%z").is_ok()
        || value
            .parse::<chrono::DateTime<chrono::Utc>>()
            .is_ok()
}

pub fn is_time(value: &str) -> bool {
    NaiveTime::parse_from_str(value, "%H:%M:%S").is_ok()
        || NaiveTime::parse_from_str(value, "%H:%M").is_ok()
        || NaiveTime::parse_from_str(value, "%H:%M:%S%.f").is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_date() {
        assert!(is_date("2024-01-15"));
        assert!(is_date("2000-12-31"));
        assert!(!is_date("2024-13-01")); // invalid month
        assert!(!is_date("not-a-date"));
        assert!(!is_date("15/01/2024")); // wrong format
    }

    #[test]
    fn test_datetime() {
        assert!(is_datetime("2024-01-15T10:30:00Z"));
        assert!(is_datetime("2024-01-15T10:30:00+05:00"));
        assert!(!is_datetime("not-a-datetime"));
    }

    #[test]
    fn test_time() {
        assert!(is_time("10:30:00"));
        assert!(is_time("10:30"));
        assert!(!is_time("25:00:00")); // invalid hour
        assert!(!is_time("not-a-time"));
    }
}
