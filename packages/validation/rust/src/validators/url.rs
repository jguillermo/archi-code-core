use url::Url;
use once_cell::sync::Lazy;
use regex::Regex;

// ─── Compiled regexes ────────────────────────────────────────────────────────

static MEDIA_TYPE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[a-zA-Z]+/[a-zA-Z0-9\.\-\+_]+$").unwrap()
});
static DATA_ATTRIBUTE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[a-zA-Z\-]+=[a-zA-Z0-9\-]+$").unwrap()
});
static MAGNET_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?:^magnet:\?|[^?&]&)xt(?:\.1)?=urn:(?:(?:aich|bitprint|btih|ed2k|ed2khash|kzhash|md5|sha1|tree:tiger):[a-zA-Z0-9]{32}(?:[a-zA-Z0-9]{8})?|btmh:1220[a-zA-Z0-9]{64})(?:$|&)").unwrap()
});
static MAILTO_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^mailto:[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$").unwrap()
});

// ─── URL ─────────────────────────────────────────────────────────────────────

pub fn is_url(value: &str) -> bool {
    Url::parse(value).is_ok()
}

pub fn is_url_with_scheme(value: &str, scheme: &str) -> bool {
    Url::parse(value)
        .map(|u| u.scheme() == scheme)
        .unwrap_or(false)
}

// ─── Data URI ────────────────────────────────────────────────────────────────

/// isDataURI — validates data: URIs (e.g. "data:image/png;base64,abc123")
pub fn is_data_uri(value: &str) -> bool {
    let mut data = value.splitn(2, ',');
    let header = match data.next() {
        Some(h) => h.trim(),
        None => return false,
    };
    if data.next().is_none() {
        return false; // no comma found
    }
    if !header.starts_with("data:") {
        return false;
    }
    let rest = &header[5..]; // remove "data:"
    let parts: Vec<&str> = rest.split(';').collect();
    let media_type = parts[0];
    // empty media type is allowed (default is text/plain)
    if !media_type.is_empty() && !MEDIA_TYPE_RE.is_match(media_type) {
        return false;
    }
    // check attributes (e.g. charset=utf-8, base64)
    for attr in &parts[1..] {
        if *attr != "base64" && !DATA_ATTRIBUTE_RE.is_match(attr) {
            return false;
        }
    }
    true
}

// ─── Magnet URI ──────────────────────────────────────────────────────────────

pub fn is_magnet_uri(value: &str) -> bool {
    if !value.starts_with("magnet:?") {
        return false;
    }
    MAGNET_RE.is_match(value)
}

// ─── Mailto URI ──────────────────────────────────────────────────────────────

pub fn is_mailto_uri(value: &str) -> bool {
    MAILTO_RE.is_match(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_url() {
        assert!(is_url("https://example.com"));
        assert!(is_url("http://example.com/path?query=1"));
        assert!(!is_url("not a url"));
        assert!(!is_url("example.com"));
    }

    #[test]
    fn test_url_with_scheme() {
        assert!(is_url_with_scheme("https://example.com", "https"));
        assert!(!is_url_with_scheme("https://example.com", "http"));
    }

    #[test]
    fn test_data_uri() {
        assert!(is_data_uri("data:image/png;base64,abc123"));
        assert!(is_data_uri("data:text/plain,hello"));
        assert!(is_data_uri("data:,"));
        assert!(!is_data_uri("not-a-data-uri"));
        assert!(!is_data_uri("http://example.com"));
    }

    #[test]
    fn test_magnet_uri() {
        assert!(is_magnet_uri(
            "magnet:?xt=urn:btih:c12fe1c06bba254a9dc9f519b335aa7c1367a88a"
        ));
        assert!(!is_magnet_uri("http://example.com"));
    }

    #[test]
    fn test_mailto_uri() {
        assert!(is_mailto_uri("mailto:user@example.com"));
        assert!(!is_mailto_uri("user@example.com"));
        assert!(!is_mailto_uri("http://example.com"));
    }
}
