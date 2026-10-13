use blake2::Blake2b;
use blake2::digest::consts::U32;
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256, Sha384, Sha512};

use crate::error::{CryptoError, CryptoResult};
use crate::level::{Algorithm, Level, resolve};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DigestAlgorithm {
    Sha256,
    Sha384,
    Sha512,
    Blake2b,
}

impl Algorithm for DigestAlgorithm {
    fn parse(value: &str) -> CryptoResult<Self> {
        match value {
            "sha256" => Ok(DigestAlgorithm::Sha256),
            "sha384" => Ok(DigestAlgorithm::Sha384),
            "sha512" => Ok(DigestAlgorithm::Sha512),
            "blake2b" => Ok(DigestAlgorithm::Blake2b),
            other => Err(CryptoError::unsupported(format!(
                "Unsupported hash algorithm: {other}. Use sha256, sha384, sha512 or blake2b."
            ))),
        }
    }

    fn name(self) -> &'static str {
        match self {
            DigestAlgorithm::Sha256 => "sha256",
            DigestAlgorithm::Sha384 => "sha384",
            DigestAlgorithm::Sha512 => "sha512",
            DigestAlgorithm::Blake2b => "blake2b",
        }
    }

    fn for_level(level: Level) -> Self {
        match level {
            Level::Basic | Level::Standard => DigestAlgorithm::Sha256,
            Level::Strong => DigestAlgorithm::Sha384,
            Level::Cnsa => DigestAlgorithm::Sha512,
        }
    }
}

pub fn digest_bytes(algorithm: DigestAlgorithm, data: &[u8]) -> Vec<u8> {
    match algorithm {
        DigestAlgorithm::Sha256 => Sha256::digest(data).to_vec(),
        DigestAlgorithm::Sha384 => Sha384::digest(data).to_vec(),
        DigestAlgorithm::Sha512 => Sha512::digest(data).to_vec(),
        DigestAlgorithm::Blake2b => Blake2b::<U32>::digest(data).to_vec(),
    }
}

pub fn digest(data: &[u8], level: Option<&str>, algorithm: Option<&str>) -> CryptoResult<String> {
    let algorithm = resolve::<DigestAlgorithm>(level, algorithm)?;
    Ok(hex::encode(digest_bytes(algorithm, data)))
}

fn hmac_with<M: Mac + hmac::digest::KeyInit>(key: &[u8], data: &[u8]) -> Vec<u8> {
    let mut mac = <M as hmac::digest::KeyInit>::new_from_slice(key)
        .unwrap_or_else(|_| unreachable!("HMAC accepts keys of any length"));
    mac.update(data);
    mac.finalize().into_bytes().to_vec()
}

pub fn hmac_bytes(algorithm: DigestAlgorithm, key: &[u8], data: &[u8]) -> CryptoResult<Vec<u8>> {
    match algorithm {
        DigestAlgorithm::Sha256 => Ok(hmac_with::<Hmac<Sha256>>(key, data)),
        DigestAlgorithm::Sha384 => Ok(hmac_with::<Hmac<Sha384>>(key, data)),
        DigestAlgorithm::Sha512 => Ok(hmac_with::<Hmac<Sha512>>(key, data)),
        DigestAlgorithm::Blake2b => Err(CryptoError::unsupported(
            "HMAC supports sha256, sha384 and sha512.",
        )),
    }
}

pub fn hmac(
    data: &[u8],
    key: &str,
    level: Option<&str>,
    algorithm: Option<&str>,
) -> CryptoResult<String> {
    if key.is_empty() {
        return Err(CryptoError::invalid_key("HMAC key must not be empty."));
    }
    let algorithm = resolve::<DigestAlgorithm>(level, algorithm)?;
    Ok(hex::encode(hmac_bytes(algorithm, key.as_bytes(), data)?))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn digests_with_known_vectors() {
        assert_eq!(
            digest(b"abc", None, Some("sha256")).unwrap(),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        assert_eq!(
            digest(b"abc", None, Some("sha384")).unwrap(),
            "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7"
        );
        assert_eq!(
            digest(b"abc", None, Some("sha512")).unwrap(),
            "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f"
        );
        assert_eq!(digest(b"abc", None, Some("blake2b")).unwrap().len(), 64);
    }

    #[test]
    fn picks_the_digest_of_each_level() {
        let lengths = [
            ("basic", 64),
            ("standard", 64),
            ("strong", 96),
            ("cnsa", 128),
        ];
        for (level, length) in lengths {
            assert_eq!(digest(b"abc", Some(level), None).unwrap().len(), length);
        }
    }

    #[test]
    fn computes_hmac_with_rfc_4231_vector() {
        let key = "Jefe";
        assert_eq!(
            hmac(b"what do ya want for nothing?", key, None, Some("sha256")).unwrap(),
            "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843"
        );
        assert_eq!(
            hmac(b"what do ya want for nothing?", key, Some("cnsa"), None)
                .unwrap()
                .len(),
            128
        );
        assert_eq!(hmac(b"x", key, Some("strong"), None).unwrap().len(), 96);
    }

    #[test]
    fn rejects_hmac_without_key_or_with_blake2b() {
        assert!(hmac(b"x", "", None, None).is_err());
        assert!(hmac(b"x", "key", None, Some("blake2b")).is_err());
    }

    #[test]
    fn rejects_an_unknown_digest() {
        assert!(digest(b"x", None, Some("md5")).is_err());
    }
}
