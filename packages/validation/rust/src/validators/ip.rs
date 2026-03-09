use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

pub fn is_ip(value: &str) -> bool {
    value.parse::<IpAddr>().is_ok()
}

pub fn is_ipv4(value: &str) -> bool {
    value.parse::<Ipv4Addr>().is_ok()
}

pub fn is_ipv6(value: &str) -> bool {
    value.parse::<Ipv6Addr>().is_ok()
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
        assert!(is_ipv4("0.0.0.0"));
        assert!(!is_ipv4("::1"));
    }

    #[test]
    fn test_ipv6() {
        assert!(is_ipv6("::1"));
        assert!(is_ipv6("2001:db8::1"));
        assert!(!is_ipv6("192.168.1.1"));
    }
}
