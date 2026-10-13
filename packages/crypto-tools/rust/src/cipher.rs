use aes::cipher::block_padding::Pkcs7;
use aes::cipher::{BlockDecryptMut, BlockEncryptMut, KeyIvInit};
use hkdf::Hkdf;
use sha2::{Sha256, Sha384};
use subtle::ConstantTimeEq;

use crate::aead::{AeadAlgorithm, open, seal};
use crate::encoding::{from_base64url, random_bytes, to_base64url};
use crate::error::{CryptoError, CryptoResult};
use crate::hash::{DigestAlgorithm, hmac_bytes};
use crate::level::{Algorithm, Level, explicit_level, resolve};

const VERSION: &str = "v1";
const SALT_LENGTH: usize = 16;
const LEGACY_IV_LENGTH: usize = 16;
const MIN_SECRET_LENGTH: usize = 16;
const MIN_CNSA_SECRET_LENGTH: usize = 32;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CipherAlgorithm {
    Aead(AeadAlgorithm),
    LegacyCbcHmac(usize),
}

impl Algorithm for CipherAlgorithm {
    fn parse(value: &str) -> CryptoResult<Self> {
        match value {
            "aes-128-gcm" => Ok(CipherAlgorithm::Aead(AeadAlgorithm::Aes128Gcm)),
            "aes-256-gcm" => Ok(CipherAlgorithm::Aead(AeadAlgorithm::Aes256Gcm)),
            "chacha20-poly1305" => Ok(CipherAlgorithm::Aead(AeadAlgorithm::ChaCha20Poly1305)),
            "xchacha20-poly1305" => Ok(CipherAlgorithm::Aead(AeadAlgorithm::XChaCha20Poly1305)),
            "aes-128-cbc-hmac" => Ok(CipherAlgorithm::LegacyCbcHmac(16)),
            "aes-192-cbc-hmac" => Ok(CipherAlgorithm::LegacyCbcHmac(24)),
            "aes-256-cbc-hmac" => Ok(CipherAlgorithm::LegacyCbcHmac(32)),
            other => Err(CryptoError::unsupported(format!(
                "Unsupported cipher algorithm: {other}. Use aes-128-gcm, aes-256-gcm, chacha20-poly1305, xchacha20-poly1305 or aes-128/192/256-cbc-hmac."
            ))),
        }
    }

    fn name(self) -> &'static str {
        match self {
            CipherAlgorithm::Aead(AeadAlgorithm::Aes128Gcm) => "aes-128-gcm",
            CipherAlgorithm::Aead(AeadAlgorithm::Aes256Gcm) => "aes-256-gcm",
            CipherAlgorithm::Aead(AeadAlgorithm::ChaCha20Poly1305) => "chacha20-poly1305",
            CipherAlgorithm::Aead(AeadAlgorithm::XChaCha20Poly1305) => "xchacha20-poly1305",
            CipherAlgorithm::LegacyCbcHmac(16) => "aes-128-cbc-hmac",
            CipherAlgorithm::LegacyCbcHmac(24) => "aes-192-cbc-hmac",
            CipherAlgorithm::LegacyCbcHmac(_) => "aes-256-cbc-hmac",
        }
    }

    fn for_level(level: Level) -> Self {
        match level {
            Level::Basic => CipherAlgorithm::Aead(AeadAlgorithm::Aes128Gcm),
            Level::Standard | Level::Cnsa => CipherAlgorithm::Aead(AeadAlgorithm::Aes256Gcm),
            Level::Strong => CipherAlgorithm::Aead(AeadAlgorithm::XChaCha20Poly1305),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Kdf {
    HkdfSha256,
    HkdfSha384,
}

impl Kdf {
    fn name(self) -> &'static str {
        match self {
            Kdf::HkdfSha256 => "hkdf-sha256",
            Kdf::HkdfSha384 => "hkdf-sha384",
        }
    }

    fn parse(value: &str) -> CryptoResult<Self> {
        match value {
            "hkdf-sha256" => Ok(Kdf::HkdfSha256),
            "hkdf-sha384" => Ok(Kdf::HkdfSha384),
            _ => Err(CryptoError::malformed(
                "Invalid encrypted format: unknown key derivation.",
            )),
        }
    }

    fn min_secret_length(self) -> usize {
        match self {
            Kdf::HkdfSha256 => MIN_SECRET_LENGTH,
            Kdf::HkdfSha384 => MIN_CNSA_SECRET_LENGTH,
        }
    }

    fn derive(self, secret: &[u8], salt: Option<&[u8]>, info: &[u8], length: usize) -> Vec<u8> {
        let mut key = vec![0u8; length];
        let expanded = match self {
            Kdf::HkdfSha256 => Hkdf::<Sha256>::new(salt, secret).expand(info, &mut key),
            Kdf::HkdfSha384 => Hkdf::<Sha384>::new(salt, secret).expand(info, &mut key),
        };
        expanded.unwrap_or_else(|_| unreachable!("output length is far below the HKDF limit"));
        key
    }
}

pub fn derive_key(
    secret: &str,
    cnsa: bool,
    salt: Option<&[u8]>,
    info: &str,
    length: usize,
) -> CryptoResult<Vec<u8>> {
    let kdf = if cnsa {
        Kdf::HkdfSha384
    } else {
        Kdf::HkdfSha256
    };
    check_secret(secret, kdf)?;
    Ok(kdf.derive(secret.as_bytes(), salt, info.as_bytes(), length))
}

fn check_secret(secret: &str, kdf: Kdf) -> CryptoResult<()> {
    let minimum = kdf.min_secret_length();
    if secret.len() < minimum {
        return Err(CryptoError::invalid_key(format!(
            "Key must have a minimum length of {minimum} characters."
        )));
    }
    Ok(())
}

pub fn generate_key(level: Option<&str>, algorithm: Option<&str>) -> CryptoResult<String> {
    resolve::<CipherAlgorithm>(level, algorithm)?;
    Ok(to_base64url(&random_bytes(32)?))
}

fn info(algorithm: CipherAlgorithm) -> String {
    format!(
        "archi-code/crypto-tools/cipher/{VERSION}/{}",
        algorithm.name()
    )
}

pub fn encrypt(
    data: &[u8],
    secret: &str,
    level: Option<&str>,
    algorithm: Option<&str>,
) -> CryptoResult<String> {
    let resolved = resolve::<CipherAlgorithm>(level, algorithm)?;
    let aead = match resolved {
        CipherAlgorithm::Aead(aead) => aead,
        CipherAlgorithm::LegacyCbcHmac(key_length) => {
            return legacy_encrypt(data, secret, key_length);
        }
    };
    let kdf = if explicit_level(level)? == Some(Level::Cnsa) {
        Kdf::HkdfSha384
    } else {
        Kdf::HkdfSha256
    };
    check_secret(secret, kdf)?;
    let salt = random_bytes(SALT_LENGTH)?;
    let nonce = random_bytes(aead.nonce_length())?;
    let key = kdf.derive(
        secret.as_bytes(),
        Some(&salt),
        info(resolved).as_bytes(),
        aead.key_length(),
    );
    let header = format!("{VERSION}.{}.{}", resolved.name(), kdf.name());
    let sealed = seal(aead, &key, &nonce, data, header.as_bytes());
    Ok(format!(
        "{header}.{}.{}.{}",
        to_base64url(&salt),
        to_base64url(&nonce),
        to_base64url(&sealed)
    ))
}

pub fn decrypt_bytes(text: &str, secret: &str, algorithm: Option<&str>) -> CryptoResult<Vec<u8>> {
    let expected = algorithm.map(CipherAlgorithm::parse).transpose()?;
    if let Some(CipherAlgorithm::LegacyCbcHmac(key_length)) = expected {
        return legacy_decrypt(text, secret, key_length);
    }
    let parts: Vec<&str> = text.split('.').collect();
    if parts.len() != 6 || parts[0] != VERSION {
        return Err(CryptoError::malformed("Invalid encrypted format."));
    }
    let resolved = CipherAlgorithm::parse(parts[1])
        .map_err(|_| CryptoError::malformed("Invalid encrypted format: unknown algorithm."))?;
    let CipherAlgorithm::Aead(aead) = resolved else {
        return Err(CryptoError::malformed(
            "Invalid encrypted format: unknown algorithm.",
        ));
    };
    if let Some(expected) = expected
        && expected != resolved
    {
        return Err(CryptoError::unsupported(format!(
            "Data was encrypted with {}, not {}.",
            resolved.name(),
            expected.name()
        )));
    }
    let kdf = Kdf::parse(parts[2])?;
    check_secret(secret, kdf)?;
    let salt = from_base64url(parts[3], "salt")?;
    let nonce = from_base64url(parts[4], "nonce")?;
    let sealed = from_base64url(parts[5], "ciphertext")?;
    let key = kdf.derive(
        secret.as_bytes(),
        Some(&salt),
        info(resolved).as_bytes(),
        aead.key_length(),
    );
    let header = format!("{VERSION}.{}.{}", parts[1], parts[2]);
    open(aead, &key, &nonce, &sealed, header.as_bytes())
}

pub fn decrypt(text: &str, secret: &str, algorithm: Option<&str>) -> CryptoResult<String> {
    let legacy = matches!(
        algorithm.map(CipherAlgorithm::parse).transpose()?,
        Some(CipherAlgorithm::LegacyCbcHmac(_))
    );
    let bytes = decrypt_bytes(text, secret, algorithm)?;
    if legacy {
        return Ok(String::from_utf8_lossy(&bytes).into_owned());
    }
    String::from_utf8(bytes)
        .map_err(|_| CryptoError::malformed("Decrypted data is not UTF-8 text; use decryptBytes."))
}

fn legacy_key(secret: &str, key_length: usize) -> CryptoResult<Vec<u8>> {
    let bytes = secret.as_bytes();
    if bytes.len() < MIN_SECRET_LENGTH {
        return Err(CryptoError::invalid_key(
            "Key must have a minimum length of 16 characters.",
        ));
    }
    Ok((0..key_length)
        .map(|index| bytes[index % bytes.len()])
        .collect())
}

fn legacy_cbc_encrypt(key: &[u8], iv: &[u8], data: &[u8]) -> Vec<u8> {
    match key.len() {
        16 => cbc::Encryptor::<aes::Aes128>::new_from_slices(key, iv)
            .unwrap_or_else(|_| unreachable!("key and iv lengths are fixed"))
            .encrypt_padded_vec_mut::<Pkcs7>(data),
        24 => cbc::Encryptor::<aes::Aes192>::new_from_slices(key, iv)
            .unwrap_or_else(|_| unreachable!("key and iv lengths are fixed"))
            .encrypt_padded_vec_mut::<Pkcs7>(data),
        _ => cbc::Encryptor::<aes::Aes256>::new_from_slices(key, iv)
            .unwrap_or_else(|_| unreachable!("key and iv lengths are fixed"))
            .encrypt_padded_vec_mut::<Pkcs7>(data),
    }
}

fn legacy_cbc_decrypt(key: &[u8], iv: &[u8], data: &[u8]) -> CryptoResult<Vec<u8>> {
    let result = match key.len() {
        16 => cbc::Decryptor::<aes::Aes128>::new_from_slices(key, iv)
            .unwrap_or_else(|_| unreachable!("key and iv lengths are fixed"))
            .decrypt_padded_vec_mut::<Pkcs7>(data),
        24 => cbc::Decryptor::<aes::Aes192>::new_from_slices(key, iv)
            .unwrap_or_else(|_| unreachable!("key and iv lengths are fixed"))
            .decrypt_padded_vec_mut::<Pkcs7>(data),
        _ => cbc::Decryptor::<aes::Aes256>::new_from_slices(key, iv)
            .unwrap_or_else(|_| unreachable!("key and iv lengths are fixed"))
            .decrypt_padded_vec_mut::<Pkcs7>(data),
    };
    result.map_err(|_| CryptoError::tampered("Decryption failed: bad decrypt."))
}

fn legacy_hmac(key: &[u8], data: &str) -> String {
    hex::encode(
        hmac_bytes(DigestAlgorithm::Sha256, key, data.as_bytes())
            .unwrap_or_else(|_| unreachable!("sha256 supports HMAC")),
    )
}

fn legacy_encrypt(data: &[u8], secret: &str, key_length: usize) -> CryptoResult<String> {
    let key = legacy_key(secret, key_length)?;
    let iv = random_bytes(LEGACY_IV_LENGTH)?;
    let encrypted = legacy_cbc_encrypt(&key, &iv, data);
    let body = format!("{}|{}", hex::encode(&iv), hex::encode(&encrypted));
    let mac = legacy_hmac(&key, &body);
    Ok(format!("{body}|{mac}"))
}

fn legacy_decrypt(text: &str, secret: &str, key_length: usize) -> CryptoResult<Vec<u8>> {
    let key = legacy_key(secret, key_length)?;
    let mut parts = text.split('|');
    let iv = parts.next().unwrap_or_default();
    let encrypted = parts.next().unwrap_or_default();
    let mac = parts.next().unwrap_or_default();
    if iv.is_empty() || encrypted.is_empty() || mac.is_empty() || iv.len() != LEGACY_IV_LENGTH * 2 {
        return Err(CryptoError::malformed(
            "Decryption failed: Invalid encrypted format.",
        ));
    }
    let expected = legacy_hmac(&key, &format!("{iv}|{encrypted}"));
    if !bool::from(expected.as_bytes().ct_eq(mac.as_bytes())) {
        return Err(CryptoError::tampered(
            "Decryption failed: Invalid HMAC. Data may have been tampered with.",
        ));
    }
    let iv = hex::decode(iv)
        .map_err(|_| CryptoError::malformed("Decryption failed: Invalid encrypted format."))?;
    let encrypted = hex::decode(encrypted)
        .map_err(|_| CryptoError::malformed("Decryption failed: Invalid encrypted format."))?;
    legacy_cbc_decrypt(&key, &iv, &encrypted)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    const SECRET: &str = "a-secret-key-with-more-than-32-characters";

    #[test]
    fn round_trips_with_every_level() {
        for level in ["basic", "standard", "strong", "cnsa", "military"] {
            let encrypted = encrypt("hola 👋".as_bytes(), SECRET, Some(level), None).unwrap();
            assert_eq!(decrypt(&encrypted, SECRET, None).unwrap(), "hola 👋");
        }
    }

    #[test]
    fn records_algorithm_and_key_derivation_in_the_header() {
        let basic = encrypt(b"x", SECRET, Some("basic"), None).unwrap();
        assert!(basic.starts_with("v1.aes-128-gcm.hkdf-sha256."));
        let strong = encrypt(b"x", SECRET, Some("strong"), None).unwrap();
        assert!(strong.starts_with("v1.xchacha20-poly1305.hkdf-sha256."));
        let cnsa = encrypt(b"x", SECRET, Some("cnsa"), None).unwrap();
        assert!(cnsa.starts_with("v1.aes-256-gcm.hkdf-sha384."));
        let chacha = encrypt(b"x", SECRET, None, Some("chacha20-poly1305")).unwrap();
        assert_eq!(
            decrypt(&chacha, SECRET, Some("chacha20-poly1305")).unwrap(),
            "x"
        );
    }

    #[test]
    fn produces_a_different_ciphertext_every_time() {
        let first = encrypt(b"x", SECRET, None, None).unwrap();
        let second = encrypt(b"x", SECRET, None, None).unwrap();
        assert_ne!(first, second);
    }

    #[test]
    fn detects_tampering_and_wrong_keys() {
        let encrypted = encrypt(b"secret data", SECRET, None, None).unwrap();
        let mut tampered = encrypted.clone().into_bytes();
        let last = tampered.len() - 2;
        tampered[last] = if tampered[last] == b'A' { b'B' } else { b'A' };
        let tampered = String::from_utf8(tampered).unwrap();
        assert_eq!(
            decrypt_bytes(&tampered, SECRET, None).unwrap_err().code,
            crate::error::ErrorCode::Tampered
        );
        let other = "another-secret-key-with-32-characters!!";
        assert!(decrypt(&encrypted, other, None).is_err());
        let swapped = encrypted.replacen("aes-256-gcm", "aes-128-gcm", 1);
        assert!(decrypt(&swapped, SECRET, None).is_err());
    }

    #[test]
    fn rejects_malformed_input() {
        for text in [
            "",
            "v1.aes-256-gcm",
            "v2.a.b.c.d.e",
            "v1.aes-999.hkdf-sha256.a.b.c",
        ] {
            assert_eq!(
                decrypt(text, SECRET, None).unwrap_err().code,
                crate::error::ErrorCode::Malformed,
                "{text}"
            );
        }
        let encrypted = encrypt(b"x", SECRET, None, None).unwrap();
        let bad_kdf = encrypted.replacen("hkdf-sha256", "hkdf-md5", 1);
        assert!(decrypt(&bad_kdf, SECRET, None).is_err());
        let legacy_name = encrypted.replacen("aes-256-gcm", "aes-256-cbc-hmac", 1);
        assert!(decrypt(&legacy_name, SECRET, None).is_err());
        assert!(decrypt(&encrypted, SECRET, Some("aes-128-gcm")).is_err());
    }

    #[test]
    fn returns_bytes_and_refuses_binary_as_text() {
        let encrypted = encrypt(&[0, 159, 146, 150], SECRET, None, None).unwrap();
        assert_eq!(
            decrypt_bytes(&encrypted, SECRET, None).unwrap(),
            vec![0, 159, 146, 150]
        );
        assert_eq!(
            decrypt(&encrypted, SECRET, None).unwrap_err().code,
            crate::error::ErrorCode::Malformed
        );
    }

    #[test]
    fn requires_longer_secrets_for_cnsa() {
        let short = "0123456789abcdef";
        assert!(encrypt(b"x", short, None, None).is_ok());
        assert_eq!(
            encrypt(b"x", short, Some("cnsa"), None)
                .unwrap_err()
                .message,
            "Key must have a minimum length of 32 characters."
        );
        assert!(encrypt(b"x", "short", None, None).is_err());
    }

    #[test]
    fn generates_random_keys() {
        let key = generate_key(Some("cnsa"), None).unwrap();
        assert_eq!(key.len(), 43);
        assert_ne!(key, generate_key(None, None).unwrap());
        assert!(generate_key(Some("basic"), Some("aes-256-gcm")).is_err());
    }

    #[test]
    fn derives_keys_for_other_tools() {
        let first = derive_key(SECRET, false, None, "info", 32).unwrap();
        assert_eq!(first, derive_key(SECRET, false, None, "info", 32).unwrap());
        assert_ne!(first, derive_key(SECRET, true, None, "info", 32).unwrap());
        assert!(derive_key("short", false, None, "info", 32).is_err());
    }

    #[test]
    fn decrypts_data_from_the_javascript_symmetric_encryption() {
        let fixtures: Value =
            serde_json::from_str(include_str!("../../test/fixtures/legacy.json")).unwrap();
        for case in fixtures["legacyCipher"].as_array().unwrap() {
            let algorithm = format!("{}-hmac", case["algorithm"].as_str().unwrap());
            let key = case["key"].as_str().unwrap();
            let decrypted =
                decrypt(case["encrypted"].as_str().unwrap(), key, Some(&algorithm)).unwrap();
            assert_eq!(decrypted, case["text"].as_str().unwrap());
        }
    }

    #[test]
    fn keeps_the_legacy_format_round_trip_and_errors() {
        for algorithm in ["aes-128-cbc-hmac", "aes-192-cbc-hmac", "aes-256-cbc-hmac"] {
            let key = "0123456789abcdef";
            let encrypted = encrypt("こんにちは".as_bytes(), key, None, Some(algorithm)).unwrap();
            assert_eq!(encrypted.split('|').count(), 3);
            assert_eq!(
                decrypt(&encrypted, key, Some(algorithm)).unwrap(),
                "こんにちは"
            );
        }
        let key = "my-secure-keymy-secure-key";
        let algorithm = Some("aes-256-cbc-hmac");
        assert_eq!(
            decrypt("invalid|encrypted|string", key, algorithm)
                .unwrap_err()
                .message,
            "Decryption failed: Invalid encrypted format."
        );
        assert_eq!(
            decrypt("shortiv|encrypteddata|hmac", key, algorithm)
                .unwrap_err()
                .message,
            "Decryption failed: Invalid encrypted format."
        );
        let encrypted = encrypt(b"text", key, None, algorithm).unwrap();
        let tampered = format!("{}0", &encrypted[..encrypted.len() - 1]);
        let tampered = if tampered == encrypted {
            format!("{}1", &encrypted[..encrypted.len() - 1])
        } else {
            tampered
        };
        assert_eq!(
            decrypt(&tampered, key, algorithm).unwrap_err().message,
            "Decryption failed: Invalid HMAC. Data may have been tampered with."
        );
        assert_eq!(
            encrypt(b"x", "123456789012345", None, algorithm)
                .unwrap_err()
                .message,
            "Key must have a minimum length of 16 characters."
        );
    }

    #[test]
    fn reports_bad_hex_and_bad_padding_in_the_legacy_format() {
        let key = "0123456789abcdef";
        let algorithm = Some("aes-128-cbc-hmac");
        let derived = legacy_key(key, 16).unwrap();
        let iv = "zz".repeat(16);
        let body = format!("{iv}|00");
        let forged = format!("{body}|{}", legacy_hmac(&derived, &body));
        assert_eq!(
            decrypt(&forged, key, algorithm).unwrap_err().code,
            crate::error::ErrorCode::Malformed
        );
        let body = format!("{}|zz", "00".repeat(16));
        let forged = format!("{body}|{}", legacy_hmac(&derived, &body));
        assert_eq!(
            decrypt(&forged, key, algorithm).unwrap_err().code,
            crate::error::ErrorCode::Malformed
        );
        let body = format!("{}|{}", "00".repeat(16), "11".repeat(16));
        let forged = format!("{body}|{}", legacy_hmac(&derived, &body));
        assert_eq!(
            decrypt(&forged, key, algorithm).unwrap_err().code,
            crate::error::ErrorCode::Tampered
        );
    }
}
