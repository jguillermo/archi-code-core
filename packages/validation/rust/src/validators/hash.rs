use once_cell::sync::Lazy;
use regex::Regex;

static MD5_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-f0-9]{32}$").unwrap());
static SHA1_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-f0-9]{40}$").unwrap());
static SHA256_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-f0-9]{64}$").unwrap());
static SHA384_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-f0-9]{96}$").unwrap());
static SHA512_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-f0-9]{128}$").unwrap());
static TIGER128_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-f0-9]{32}$").unwrap());
static TIGER160_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-f0-9]{40}$").unwrap());
static TIGER192_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-f0-9]{48}$").unwrap());
static CRC32_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-f0-9]{8}$").unwrap());
// JWT: 3 base64url parts separated by dots
static JWT_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$").unwrap());

pub fn is_md5(value: &str) -> bool {
    MD5_RE.is_match(value)
}

pub fn is_hash(value: &str, algorithm: &str) -> bool {
    let re = match algorithm.to_lowercase().as_str() {
        "md5" | "md4" | "ripemd128" | "tiger128" => &*MD5_RE,
        "sha1" | "ripemd160" | "tiger160" => &*SHA1_RE,
        "tiger192" => &*TIGER192_RE,
        "sha256" => &*SHA256_RE,
        "sha384" => &*SHA384_RE,
        "sha512" => &*SHA512_RE,
        "crc32" | "crc32b" => &*CRC32_RE,
        _ => return false,
    };
    // Use per-algorithm re for tiger128/160 (same length as MD5/SHA1)
    match algorithm.to_lowercase().as_str() {
        "tiger128" => TIGER128_RE.is_match(value),
        "tiger160" => TIGER160_RE.is_match(value),
        _ => re.is_match(value),
    }
}

pub fn is_jwt(value: &str) -> bool {
    JWT_RE.is_match(value)
}
