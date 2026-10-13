use base64::Engine;
use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};

use crate::error::{CryptoError, CryptoResult};

pub fn to_base64url(bytes: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(bytes)
}

pub fn from_base64url(text: &str, what: &str) -> CryptoResult<Vec<u8>> {
    URL_SAFE_NO_PAD
        .decode(text)
        .map_err(|_| CryptoError::malformed(format!("Invalid {what}: not base64url.")))
}

pub fn to_base64(bytes: &[u8]) -> String {
    STANDARD.encode(bytes)
}

fn sextet(unit: char) -> Option<u32> {
    match unit {
        'A'..='Z' => Some(unit as u32 - 'A' as u32),
        'a'..='z' => Some(unit as u32 - 'a' as u32 + 26),
        '0'..='9' => Some(unit as u32 - '0' as u32 + 52),
        '+' | '-' => Some(62),
        '/' | '_' => Some(63),
        _ => None,
    }
}

pub fn from_base64_lenient(text: &str) -> Vec<u8> {
    let mut sextets = Vec::with_capacity(text.len());
    for unit in text.chars() {
        if unit == '=' || (unit as u32) > 0xFFFF {
            break;
        }
        if let Some(value) = sextet(unit) {
            sextets.push(value);
        }
    }
    let mut bytes = Vec::with_capacity(sextets.len() * 3 / 4);
    for chunk in sextets.chunks(4) {
        let mut buffer = 0u32;
        for (index, value) in chunk.iter().enumerate() {
            buffer |= value << (18 - 6 * index);
        }
        let produced = (chunk.len() * 6) / 8;
        for index in 0..produced {
            bytes.push((buffer >> (16 - 8 * index)) as u8);
        }
    }
    bytes
}

pub fn random_bytes(length: usize) -> CryptoResult<Vec<u8>> {
    let mut bytes = vec![0u8; length];
    getrandom::getrandom(&mut bytes)
        .map_err(|error| CryptoError::unsupported(format!("No secure random source: {error}.")))?;
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    #[test]
    fn round_trips_base64url_without_padding() {
        let encoded = to_base64url(&[251, 255, 0]);
        assert_eq!(encoded, "-_8A");
        assert_eq!(from_base64url(&encoded, "data").unwrap(), vec![251, 255, 0]);
    }

    #[test]
    fn rejects_text_that_is_not_base64url() {
        let error = from_base64url("a+b/", "nonce").unwrap_err();
        assert_eq!(error.message, "Invalid nonce: not base64url.");
    }

    #[test]
    fn encodes_standard_base64_with_padding() {
        assert_eq!(to_base64(b"hello"), "aGVsbG8=");
    }

    #[test]
    fn decodes_base64_like_node_buffer() {
        let fixtures: Value =
            serde_json::from_str(include_str!("../../test/fixtures/legacy.json")).unwrap();
        for case in fixtures["base64Cases"].as_array().unwrap() {
            let input = case["input"].as_str().unwrap();
            let expected: Vec<u8> = case["bytes"]
                .as_array()
                .unwrap()
                .iter()
                .map(|byte| byte.as_u64().unwrap() as u8)
                .collect();
            assert_eq!(from_base64_lenient(input), expected, "input {input:?}");
        }
    }

    #[test]
    fn fills_random_bytes() {
        let first = random_bytes(32).unwrap();
        let second = random_bytes(32).unwrap();
        assert_eq!(first.len(), 32);
        assert_ne!(first, second);
    }
}
