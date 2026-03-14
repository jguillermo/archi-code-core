pub fn is_email(value: &str) -> bool {
    use validator::ValidateEmail;
    value.validate_email()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_emails() {
        assert!(is_email("user@example.com"));
        assert!(is_email("user.name+tag@example.co.uk"));
        assert!(is_email("user@subdomain.example.com"));
    }

    #[test]
    fn test_invalid_emails() {
        assert!(!is_email("not-an-email"));
        assert!(!is_email("@example.com"));
        assert!(!is_email("user@"));
        assert!(!is_email(""));
        assert!(!is_email("user @example.com"));
    }
}
