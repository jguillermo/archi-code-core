use once_cell::sync::Lazy;
use regex::Regex;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

// IPv4: strict — no leading zeros
static IPV4_RE: Lazy<Regex> = Lazy::new(|| {
    let seg = "(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])";
    Regex::new(&format!(r"^({seg}[.]){{3}}{seg}$")).unwrap()
});

// IPv6: full RFC-compliant regex (same logic as the TypeScript source)
static IPV6_RE: Lazy<Regex> = Lazy::new(|| {
    let seg = "(?:[0-9a-fA-F]{1,4})";
    let ipv4 = r"(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(?:[.](?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])){3}";
    let pattern = format!(
        r"^(?:{seg}:){{7}}(?:{seg}|:)\
|(?:{seg}:){{6}}(?:{ipv4}|:{seg}|:)\
|(?:{seg}:){{5}}(?::{ipv4}|(?::{seg}){{1,2}}|:)\
|(?:{seg}:){{4}}(?:(?::{seg}){{0,1}}:{ipv4}|(?::{seg}){{1,3}}|:)\
|(?:{seg}:){{3}}(?:(?::{seg}){{0,2}}:{ipv4}|(?::{seg}){{1,4}}|:)\
|(?:{seg}:){{2}}(?:(?::{seg}){{0,3}}:{ipv4}|(?::{seg}){{1,5}}|:)\
|(?:{seg}:){{1}}(?:(?::{seg}){{0,4}}:{ipv4}|(?::{seg}){{1,6}}|:)\
|(?::(?:(?::{seg}){{0,5}}:{ipv4}|(?::{seg}){{1,7}}|:))\
)(?:%[0-9a-zA-Z.{{1,}}])?$"
    );
    Regex::new(&pattern.replace('\n', "")).unwrap()
});

// MAC patterns
static MAC48_COLON_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[0-9a-fA-F]{2}(:[0-9a-fA-F]{2}){5}$").unwrap());
static MAC48_DASH_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[0-9a-fA-F]{2}(-[0-9a-fA-F]{2}){5}$").unwrap());
static MAC48_SPACE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[0-9a-fA-F]{2}( [0-9a-fA-F]{2}){5}$").unwrap());
static MAC48_NOSEP_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[0-9a-fA-F]{12}$").unwrap());
static MAC48_DOTS_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[0-9a-fA-F]{4}\.[0-9a-fA-F]{4}\.[0-9a-fA-F]{4}$").unwrap());
static MAC64_COLON_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[0-9a-fA-F]{2}(:[0-9a-fA-F]{2}){7}$").unwrap());
static MAC64_NOSEP_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[0-9a-fA-F]{16}$").unwrap());

pub fn is_ipv4(value: &str) -> bool {
    IPV4_RE.is_match(value)
}

pub fn is_ipv6(value: &str) -> bool {
    // Strip zone id for std parse, but validate with regex for full compatibility
    IPV6_RE.is_match(value)
}

pub fn is_ip(value: &str) -> bool {
    is_ipv4(value) || is_ipv6(value)
}

pub fn is_ip_range(value: &str, version: Option<u8>) -> bool {
    let parts: Vec<&str> = value.split('/').collect();
    if parts.len() != 2 {
        return false;
    }
    let subnet_str = parts[1];
    if subnet_str.len() > 1 && subnet_str.starts_with('0') {
        return false;
    }
    let subnet: u32 = match subnet_str.parse() {
        Ok(n) => n,
        Err(_) => return false,
    };
    match version {
        Some(4) => subnet <= 32 && parts[0].parse::<Ipv4Addr>().is_ok(),
        Some(6) => subnet <= 128 && parts[0].parse::<Ipv6Addr>().is_ok(),
        _ => {
            (subnet <= 32 && parts[0].parse::<Ipv4Addr>().is_ok())
                || (subnet <= 128 && parts[0].parse::<Ipv6Addr>().is_ok())
        }
    }
}

pub fn is_mac_address(value: &str) -> bool {
    MAC48_COLON_RE.is_match(value)
        || MAC48_DASH_RE.is_match(value)
        || MAC48_SPACE_RE.is_match(value)
        || MAC48_NOSEP_RE.is_match(value)
        || MAC48_DOTS_RE.is_match(value)
        || MAC64_COLON_RE.is_match(value)
        || MAC64_NOSEP_RE.is_match(value)
}

/// isFQDN — fully qualified domain name
pub fn is_fqdn_opts(value: &str, allow_numeric_tld: bool) -> bool {
    is_fqdn(value, allow_numeric_tld)
}

pub fn is_fqdn(value: &str, allow_numeric_tld: bool) -> bool {
    let s = if value.ends_with('.') {
        &value[..value.len() - 1]
    } else {
        value
    };
    let parts: Vec<&str> = s.split('.').collect();
    if parts.len() < 2 {
        return false;
    }
    let tld = parts[parts.len() - 1];
    // TLD must be at least 2 chars
    if tld.len() < 2 {
        return false;
    }
    // Numeric TLD check
    if !allow_numeric_tld && tld.chars().all(|c| c.is_ascii_digit()) {
        return false;
    }
    // TLD must match alpha pattern (unless numeric allowed)
    if !allow_numeric_tld {
        let tld_re = Regex::new(
            r"^([a-z\u{00A1}-\u{00A8}\u{00AA}-\u{D7FF}\u{F900}-\u{FDCF}\u{FDF0}-\u{FFEF}]{2,}|xn[a-z0-9\-]{2,})$"
        );
        if let Ok(re) = tld_re {
            if !re.is_match(&tld.to_lowercase()) {
                return false;
            }
        }
    }
    parts.iter().all(|part| {
        if part.len() > 63 {
            return false;
        }
        if part.is_empty() {
            return false;
        }
        if part.starts_with('-') || part.ends_with('-') {
            return false;
        }
        part.chars()
            .all(|c| c.is_alphanumeric() || c == '-' || c == '_')
    })
}

pub fn is_port(value: &str) -> bool {
    value.parse::<u16>().map(|n| n >= 1).unwrap_or(false)
}

// Keep for compatibility
pub fn is_ip_v4(value: &str) -> bool {
    is_ipv4(value)
}

pub fn is_ip_v6(value: &str) -> bool {
    is_ipv6(value)
}

#[allow(dead_code)]
fn _ipv4_strict(value: &str) -> bool {
    value.parse::<Ipv4Addr>().is_ok()
}

#[allow(dead_code)]
fn _ipv6_strict(value: &str) -> bool {
    value.parse::<IpAddr>().map(|a| a.is_ipv6()).unwrap_or(false)
}
