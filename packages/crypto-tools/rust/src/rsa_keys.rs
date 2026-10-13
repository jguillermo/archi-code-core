use rand_core::OsRng;
use rsa::pkcs1::{DecodeRsaPrivateKey, DecodeRsaPublicKey};
use rsa::pkcs8::{
    DecodePrivateKey, DecodePublicKey, EncodePrivateKey, EncodePublicKey, LineEnding,
};
use rsa::traits::PublicKeyParts;
use rsa::{RsaPrivateKey, RsaPublicKey};
use serde::Serialize;

use crate::error::{CryptoError, CryptoResult};
use crate::level::{Level, explicit_level};

pub const SUPPORTED_BITS: [u32; 3] = [2048, 3072, 4096];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RsaHash {
    Sha256,
    Sha384,
    Sha512,
}

impl RsaHash {
    pub fn for_level(level: Level) -> Self {
        match level {
            Level::Basic | Level::Standard => RsaHash::Sha256,
            Level::Strong => RsaHash::Sha384,
            Level::Cnsa => RsaHash::Sha512,
        }
    }

    pub fn bits(self) -> &'static str {
        match self {
            RsaHash::Sha256 => "256",
            RsaHash::Sha384 => "384",
            RsaHash::Sha512 => "512",
        }
    }

    pub fn from_bits(bits: &str) -> Option<Self> {
        match bits {
            "256" => Some(RsaHash::Sha256),
            "384" => Some(RsaHash::Sha384),
            "512" => Some(RsaHash::Sha512),
            _ => None,
        }
    }
}

pub fn bits_for_level(level: Level) -> u32 {
    match level {
        Level::Basic => 2048,
        Level::Standard => 3072,
        Level::Strong | Level::Cnsa => 4096,
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyPair {
    pub public_key: String,
    pub private_key: String,
}

pub fn generate(level: Option<&str>, bits: Option<u32>) -> CryptoResult<KeyPair> {
    let level = explicit_level(level)?;
    let bits = match (level, bits) {
        (_, Some(bits)) if !SUPPORTED_BITS.contains(&bits) => {
            return Err(CryptoError::unsupported(format!(
                "Unsupported RSA size: {bits}. Use 2048, 3072 or 4096."
            )));
        }
        (Some(level), Some(bits)) if bits < bits_for_level(level) => {
            return Err(CryptoError::unsupported(format!(
                "RSA size {bits} is below the {} bits of level {}.",
                bits_for_level(level),
                level.name()
            )));
        }
        (_, Some(bits)) => bits,
        (level, None) => bits_for_level(level.unwrap_or(Level::Standard)),
    };
    let private = RsaPrivateKey::new(&mut OsRng, bits as usize).map_err(|error| {
        CryptoError::invalid_input(format!("RSA key generation failed: {error}."))
    })?;
    let public = RsaPublicKey::from(&private);
    let private_key = private
        .to_pkcs8_pem(LineEnding::LF)
        .map_err(|_| CryptoError::invalid_input("Could not encode the private key."))?
        .to_string();
    let public_key = public
        .to_public_key_pem(LineEnding::LF)
        .map_err(|_| CryptoError::invalid_input("Could not encode the public key."))?;
    Ok(KeyPair {
        public_key,
        private_key,
    })
}

pub fn parse_private(pem: &str) -> CryptoResult<RsaPrivateKey> {
    RsaPrivateKey::from_pkcs8_pem(pem)
        .or_else(|_| RsaPrivateKey::from_pkcs1_pem(pem))
        .map_err(|_| {
            CryptoError::invalid_key("Invalid RSA private key: expected a PKCS#8 or PKCS#1 PEM.")
        })
}

pub fn parse_public(pem: &str) -> CryptoResult<RsaPublicKey> {
    RsaPublicKey::from_public_key_pem(pem)
        .or_else(|_| RsaPublicKey::from_pkcs1_pem(pem))
        .map_err(|_| {
            CryptoError::invalid_key("Invalid RSA public key: expected an SPKI or PKCS#1 PEM.")
        })
}

pub fn check_size(key: &RsaPublicKey, level: Option<Level>) -> CryptoResult<()> {
    let bits = key.size() as u32 * 8;
    let minimum = level.map(bits_for_level).unwrap_or(SUPPORTED_BITS[0]);
    if bits < minimum {
        let reason = match level {
            Some(level) => format!("level {}", level.name()),
            None => "this package".to_string(),
        };
        return Err(CryptoError::invalid_key(format!(
            "RSA key of {bits} bits is below the {minimum} bits required by {reason}."
        )));
    }
    Ok(())
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use std::sync::OnceLock;

    pub fn pair_2048() -> &'static KeyPair {
        static PAIR: OnceLock<KeyPair> = OnceLock::new();
        PAIR.get_or_init(|| generate(Some("basic"), None).unwrap())
    }

    pub fn pair_4096() -> &'static KeyPair {
        static PAIR: OnceLock<KeyPair> = OnceLock::new();
        PAIR.get_or_init(|| generate(Some("cnsa"), None).unwrap())
    }

    #[test]
    fn generates_pem_key_pairs_of_the_level_size() {
        let pair = pair_2048();
        assert!(pair.private_key.starts_with("-----BEGIN PRIVATE KEY-----"));
        assert!(pair.public_key.starts_with("-----BEGIN PUBLIC KEY-----"));
        let public = parse_public(&pair.public_key).unwrap();
        assert_eq!(public.size() * 8, 2048);
        assert_eq!(
            parse_public(&pair_4096().public_key).unwrap().size() * 8,
            4096
        );
        assert_eq!(
            RsaPublicKey::from(&parse_private(&pair.private_key).unwrap()),
            public
        );
    }

    #[test]
    fn maps_levels_to_sizes_and_hashes() {
        assert_eq!(bits_for_level(Level::Basic), 2048);
        assert_eq!(bits_for_level(Level::Standard), 3072);
        assert_eq!(bits_for_level(Level::Strong), 4096);
        assert_eq!(RsaHash::for_level(Level::Strong), RsaHash::Sha384);
        assert_eq!(RsaHash::from_bits("512"), Some(RsaHash::Sha512));
        assert_eq!(RsaHash::from_bits("1"), None);
    }

    #[test]
    fn validates_the_requested_size() {
        assert!(generate(None, Some(1024)).is_err());
        assert!(generate(Some("cnsa"), Some(2048)).is_err());
        assert!(generate(Some("nope"), None).is_err());
    }

    #[test]
    fn reads_pkcs1_keys_too() {
        use rsa::pkcs1::{EncodeRsaPrivateKey, EncodeRsaPublicKey};
        let private = parse_private(&pair_2048().private_key).unwrap();
        let pkcs1_private = private.to_pkcs1_pem(LineEnding::LF).unwrap();
        let pkcs1_public = RsaPublicKey::from(&private)
            .to_pkcs1_pem(LineEnding::LF)
            .unwrap();
        assert!(parse_private(&pkcs1_private).is_ok());
        assert!(parse_public(&pkcs1_public).is_ok());
        assert!(parse_private("nope").is_err());
        assert!(parse_public("nope").is_err());
    }

    #[test]
    fn checks_the_key_size_against_the_level() {
        let public = parse_public(&pair_2048().public_key).unwrap();
        assert!(check_size(&public, None).is_ok());
        assert!(check_size(&public, Some(Level::Basic)).is_ok());
        assert_eq!(
            check_size(&public, Some(Level::Standard))
                .unwrap_err()
                .message,
            "RSA key of 2048 bits is below the 3072 bits required by level standard."
        );
    }
}
