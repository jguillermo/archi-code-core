use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use once_cell::sync::Lazy;
use regex::Regex;

// ─── Compiled regexes ────────────────────────────────────────────────────────
// Note: Rust's regex crate does not support backreferences.
// MAC-48 with colon separator: xx:xx:xx:xx:xx:xx
static MAC48_COLON_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[0-9a-fA-F]{2}(:[0-9a-fA-F]{2}){5}$").unwrap()
});
// MAC-48 with dash separator: xx-xx-xx-xx-xx-xx
static MAC48_DASH_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[0-9a-fA-F]{2}(-[0-9a-fA-F]{2}){5}$").unwrap()
});
// MAC-48 with space separator
static MAC48_SPACE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[0-9a-fA-F]{2}( [0-9a-fA-F]{2}){5}$").unwrap()
});
// MAC-48 no separator: 12 hex chars
static MAC48_NO_SEP_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[0-9a-fA-F]{12}$").unwrap()
});
// MAC-48 dot-notation: xxxx.xxxx.xxxx
static MAC48_DOTS_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[0-9a-fA-F]{4}\.[0-9a-fA-F]{4}\.[0-9a-fA-F]{4}$").unwrap()
});
// MAC-64 with colon
static MAC64_COLON_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[0-9a-fA-F]{2}(:[0-9a-fA-F]{2}){7}$").unwrap()
});
// MAC-64 no separator
static MAC64_NO_SEP_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[0-9a-fA-F]{16}$").unwrap()
});

// ─── IP ──────────────────────────────────────────────────────────────────────

pub fn is_ip(value: &str) -> bool {
    value.parse::<IpAddr>().is_ok()
}

pub fn is_ipv4(value: &str) -> bool {
    value.parse::<Ipv4Addr>().is_ok()
}

pub fn is_ipv6(value: &str) -> bool {
    value.parse::<Ipv6Addr>().is_ok()
}

/// isIPRange — CIDR notation (e.g. "192.168.0.0/24")
pub fn is_ip_range(value: &str, version: Option<u8>) -> bool {
    let parts: Vec<&str> = value.split('/').collect();
    if parts.len() != 2 {
        return false;
    }
    let subnet_str = parts[1];
    // No leading zeros allowed (except "0")
    if subnet_str.len() > 1 && subnet_str.starts_with('0') {
        return false;
    }
    let subnet: u32 = match subnet_str.parse() {
        Ok(n) => n,
        Err(_) => return false,
    };

    match version {
        Some(4) => {
            if subnet > 32 { return false; }
            parts[0].parse::<Ipv4Addr>().is_ok()
        }
        Some(6) => {
            if subnet > 128 { return false; }
            parts[0].parse::<Ipv6Addr>().is_ok()
        }
        _ => {
            (subnet <= 32 && parts[0].parse::<Ipv4Addr>().is_ok())
                || (subnet <= 128 && parts[0].parse::<Ipv6Addr>().is_ok())
        }
    }
}

// ─── FQDN ────────────────────────────────────────────────────────────────────

/// isFQDN — fully qualified domain name
pub fn is_fqdn(value: &str) -> bool {
    let s = if value.ends_with('.') { &value[..value.len() - 1] } else { value };
    let parts: Vec<&str> = s.split('.').collect();
    if parts.len() < 2 {
        return false;
    }
    let tld = parts[parts.len() - 1];
    // TLD must be 2+ letters and not all digits
    if tld.len() < 2 || tld.chars().all(|c| c.is_ascii_digit()) {
        return false;
    }
    parts.iter().all(|part| {
        !part.is_empty()
            && part.len() <= 63
            && !part.starts_with('-')
            && !part.ends_with('-')
            && part.chars().all(|c| c.is_alphanumeric() || c == '-')
    })
}

// ─── MAC Address ─────────────────────────────────────────────────────────────

pub fn is_mac_address(value: &str) -> bool {
    MAC48_COLON_RE.is_match(value)
        || MAC48_DASH_RE.is_match(value)
        || MAC48_SPACE_RE.is_match(value)
        || MAC48_NO_SEP_RE.is_match(value)
        || MAC48_DOTS_RE.is_match(value)
        || MAC64_COLON_RE.is_match(value)
        || MAC64_NO_SEP_RE.is_match(value)
}

pub fn is_mac_address_eui48(value: &str) -> bool {
    MAC48_COLON_RE.is_match(value)
        || MAC48_DASH_RE.is_match(value)
        || MAC48_DOTS_RE.is_match(value)
}

pub fn is_mac_address_eui64(value: &str) -> bool {
    MAC64_COLON_RE.is_match(value)
}

// ─── Port (moved here from number.rs for logical grouping) ───────────────────

pub fn is_port(value: &str) -> bool {
    value.parse::<u16>().map(|n| n >= 1).unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ip() {
        assert!(is_ip("192.168.1.1"));
        assert!(is_ip("::1"));
        assert!(!is_ip("not-an-ip"));
    }

    #[test]
    fn test_ipv4() {
        assert!(is_ipv4("192.168.1.1"));
        assert!(!is_ipv4("::1"));
    }

    #[test]
    fn test_ipv6() {
        assert!(is_ipv6("::1"));
        assert!(!is_ipv6("192.168.1.1"));
    }

    #[test]
    fn test_ip_range() {
        assert!(is_ip_range("192.168.0.0/24", None));
        assert!(is_ip_range("::1/128", None));
        assert!(!is_ip_range("192.168.0.0", None));
        assert!(!is_ip_range("192.168.0.0/33", Some(4)));
    }

    #[test]
    fn test_fqdn() {
        assert!(is_fqdn("example.com"));
        assert!(is_fqdn("sub.example.co.uk"));
        assert!(!is_fqdn("localhost"));
        assert!(!is_fqdn("-example.com"));
    }

    #[test]
    fn test_mac() {
        assert!(is_mac_address("01:02:03:04:05:06"));
        assert!(is_mac_address("01-02-03-04-05-06"));
        assert!(is_mac_address("0102.0304.0506"));
        assert!(is_mac_address("010203040506"));
        assert!(!is_mac_address("not-a-mac"));
    }

    #[test]
    fn test_port() {
        assert!(is_port("80"));
        assert!(is_port("65535"));
        assert!(!is_port("0"));
        assert!(!is_port("65536"));
    }
}
