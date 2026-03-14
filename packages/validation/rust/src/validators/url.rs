use url::Url;

pub fn is_url(value: &str) -> bool {
    Url::parse(value).is_ok()
}

pub fn is_url_with_scheme(value: &str, scheme: &str) -> bool {
    Url::parse(value)
        .map(|u| u.scheme() == scheme)
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_urls() {
        assert!(is_url("https://example.com"));
        assert!(is_url("http://example.com/path?query=1"));
        assert!(is_url("ftp://files.example.com"));
    }

    #[test]
    fn test_invalid_urls() {
        assert!(!is_url("not a url"));
        assert!(!is_url("example.com")); // missing scheme
        assert!(!is_url(""));
    }

    #[test]
    fn test_url_with_scheme() {
        assert!(is_url_with_scheme("https://example.com", "https"));
        assert!(!is_url_with_scheme("https://example.com", "http"));
        assert!(is_url_with_scheme("http://example.com", "http"));
    }
}
