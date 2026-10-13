use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;

use crate::error::{CryptoError, CryptoResult};

pub fn to_base64url(bytes: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(bytes)
}

pub fn from_base64url(text: &str, what: &str) -> CryptoResult<Vec<u8>> {
    URL_SAFE_NO_PAD
        .decode(text)
        .map_err(|_| CryptoError::malformed(format!("Invalid {what}: not base64url.")))
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
    fn fills_random_bytes() {
        let first = random_bytes(32).unwrap();
        let second = random_bytes(32).unwrap();
        assert_eq!(first.len(), 32);
        assert_ne!(first, second);
    }
}
