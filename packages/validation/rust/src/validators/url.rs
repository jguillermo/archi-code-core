use once_cell::sync::Lazy;
use regex::Regex;
use url::Url;

static MEDIA_TYPE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[a-zA-Z]+/[a-zA-Z0-9.\-+_]+$").unwrap());
static DATA_ATTR_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[a-zA-Z\-]+=[a-zA-Z0-9\-]+$").unwrap());
static MAGNET_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?:^magnet:\?|[^?&]&)xt(?:\.1)?=urn:(?:(?:aich|bitprint|btih|ed2k|ed2khash|kzhash|md5|sha1|tree:tiger):[a-zA-Z0-9]{32}(?:[a-zA-Z0-9]{8})?|btmh:1220[a-zA-Z0-9]{64})(?:$|&)"
    ).unwrap()
});
static MAILTO_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^mailto:[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$").unwrap()
});

pub fn is_url(value: &str) -> bool {
    match Url::parse(value) {
        Ok(u) => !u.scheme().is_empty() && u.has_host(),
        Err(_) => false,
    }
}

pub fn is_url_with_scheme(value: &str, scheme: &str) -> bool {
    Url::parse(value)
        .map(|u| u.scheme() == scheme)
        .unwrap_or(false)
}

pub fn is_data_uri(value: &str) -> bool {
    let mut parts = value.splitn(2, ',');
    let header = match parts.next() {
        Some(h) => h.trim(),
        None => return false,
    };
    if parts.next().is_none() {
        return false;
    }
    if !header.starts_with("data:") {
        return false;
    }
    let rest = &header[5..];
    let attrs: Vec<&str> = rest.split(';').collect();
    let media_type = attrs[0];
    if !media_type.is_empty() && !MEDIA_TYPE_RE.is_match(media_type) {
        return false;
    }
    for attr in &attrs[1..] {
        if *attr != "base64" && !DATA_ATTR_RE.is_match(attr) {
            return false;
        }
    }
    true
}

pub fn is_magnet_uri(value: &str) -> bool {
    if !value.starts_with("magnet:?") {
        return false;
    }
    MAGNET_RE.is_match(value)
}

pub fn is_mailto_uri(value: &str) -> bool {
    MAILTO_RE.is_match(value)
}
