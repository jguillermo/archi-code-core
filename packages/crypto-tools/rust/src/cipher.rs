use argon2::{Argon2, Params, Version};
use hkdf::Hkdf;
use sha2::{Sha256, Sha384};
use zeroize::Zeroizing;

use crate::aead::{AeadAlgorithm, open, seal};
use crate::encoding::{from_base64url, random_bytes, to_base64url};
use crate::error::{CryptoError, CryptoResult};
use crate::level::{Algorithm, Level, explicit_level, resolve};
use crate::password::{MAX_PASSWORD_CHARACTERS, PasswordParams, argon2_params, characters};

const VERSION: &str = "v1";
const SALT_LENGTH: usize = 16;
const MIN_SECRET_LENGTH: usize = 16;
const MIN_CNSA_SECRET_LENGTH: usize = 32;
const MIN_PASSWORD_CHARACTERS: usize = 8;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CipherAlgorithm(AeadAlgorithm);

impl Algorithm for CipherAlgorithm {
    fn parse(value: &str) -> CryptoResult<Self> {
        match value {
            "aes-128-gcm" => Ok(CipherAlgorithm(AeadAlgorithm::Aes128Gcm)),
            "aes-256-gcm" => Ok(CipherAlgorithm(AeadAlgorithm::Aes256Gcm)),
            "chacha20-poly1305" => Ok(CipherAlgorithm(AeadAlgorithm::ChaCha20Poly1305)),
            "xchacha20-poly1305" => Ok(CipherAlgorithm(AeadAlgorithm::XChaCha20Poly1305)),
            other => Err(CryptoError::unsupported(format!(
                "Unsupported cipher algorithm: {other}. Use aes-128-gcm, aes-256-gcm, chacha20-poly1305 or xchacha20-poly1305."
            ))),
        }
    }

    fn name(self) -> &'static str {
        match self.0 {
            AeadAlgorithm::Aes128Gcm => "aes-128-gcm",
            AeadAlgorithm::Aes256Gcm => "aes-256-gcm",
            AeadAlgorithm::ChaCha20Poly1305 => "chacha20-poly1305",
            AeadAlgorithm::XChaCha20Poly1305 => "xchacha20-poly1305",
        }
    }

    fn for_level(level: Level) -> Self {
        CipherAlgorithm(match level {
            Level::Basic => AeadAlgorithm::Aes128Gcm,
            Level::Standard | Level::Cnsa => AeadAlgorithm::Aes256Gcm,
            Level::Strong => AeadAlgorithm::XChaCha20Poly1305,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Kdf {
    HkdfSha256,
    HkdfSha384,
    Argon2id {
        memory_kib: u32,
        iterations: u32,
        parallelism: u32,
    },
}

impl Kdf {
    fn for_password(level: Level) -> Kdf {
        let PasswordParams::Argon2id {
            memory_kib,
            iterations,
            parallelism,
        } = argon2_params(level)
        else {
            unreachable!("argon2_params always describes argon2id")
        };
        Kdf::Argon2id {
            memory_kib,
            iterations,
            parallelism,
        }
    }

    fn name(self) -> String {
        match self {
            Kdf::HkdfSha256 => "hkdf-sha256".to_string(),
            Kdf::HkdfSha384 => "hkdf-sha384".to_string(),
            Kdf::Argon2id {
                memory_kib,
                iterations,
                parallelism,
            } => format!("argon2id-m{memory_kib}-t{iterations}-p{parallelism}"),
        }
    }

    fn parse(value: &str) -> CryptoResult<Self> {
        let known = [Kdf::HkdfSha256, Kdf::HkdfSha384]
            .into_iter()
            .chain(Level::ALL.map(Kdf::for_password));
        known
            .into_iter()
            .find(|kdf| kdf.name() == value)
            .ok_or_else(|| {
                CryptoError::malformed("Invalid encrypted format: unknown key derivation.")
            })
    }

    fn check_secret(self, secret: &str) -> CryptoResult<()> {
        let minimum = match self {
            Kdf::HkdfSha256 => MIN_SECRET_LENGTH,
            Kdf::HkdfSha384 => MIN_CNSA_SECRET_LENGTH,
            Kdf::Argon2id { .. } => return check_password(secret),
        };
        if secret.len() < minimum {
            return Err(CryptoError::invalid_key(format!(
                "Key must have a minimum length of {minimum} characters."
            )));
        }
        Ok(())
    }

    fn derive(
        self,
        secret: &[u8],
        salt: Option<&[u8]>,
        info: &[u8],
        length: usize,
    ) -> Zeroizing<Vec<u8>> {
        let mut key = Zeroizing::new(vec![0u8; length]);
        match self {
            Kdf::HkdfSha256 => Hkdf::<Sha256>::new(salt, secret)
                .expand(info, &mut key)
                .unwrap_or_else(|_| unreachable!("output length is far below the HKDF limit")),
            Kdf::HkdfSha384 => Hkdf::<Sha384>::new(salt, secret)
                .expand(info, &mut key)
                .unwrap_or_else(|_| unreachable!("output length is far below the HKDF limit")),
            Kdf::Argon2id {
                memory_kib,
                iterations,
                parallelism,
            } => {
                let params = Params::new(memory_kib, iterations, parallelism, Some(length))
                    .unwrap_or_else(|_| unreachable!("the parameters come from the level table"));
                Argon2::new(argon2::Algorithm::Argon2id, Version::V0x13, params)
                    .hash_password_into(secret, salt.unwrap_or_default(), &mut key)
                    .unwrap_or_else(|_| unreachable!("salt and key lengths are fixed"));
            }
        }
        key
    }
}

fn check_password(password: &str) -> CryptoResult<()> {
    let count = characters(password);
    if !(MIN_PASSWORD_CHARACTERS..=MAX_PASSWORD_CHARACTERS).contains(&count) {
        return Err(CryptoError::invalid_key(format!(
            "Password must have between {MIN_PASSWORD_CHARACTERS} and {MAX_PASSWORD_CHARACTERS} characters; it has {count}."
        )));
    }
    Ok(())
}

pub fn derive_key(
    secret: &str,
    cnsa: bool,
    salt: Option<&[u8]>,
    info: &str,
    length: usize,
) -> CryptoResult<Zeroizing<Vec<u8>>> {
    let kdf = if cnsa {
        Kdf::HkdfSha384
    } else {
        Kdf::HkdfSha256
    };
    kdf.check_secret(secret)?;
    Ok(kdf.derive(secret.as_bytes(), salt, info.as_bytes(), length))
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
    password: bool,
) -> CryptoResult<String> {
    let resolved = resolve::<CipherAlgorithm>(level, algorithm)?;
    let aead = resolved.0;
    let level = explicit_level(level)?;
    let kdf = match (password, level) {
        (true, level) => Kdf::for_password(level.unwrap_or(Level::Standard)),
        (false, Some(Level::Cnsa)) => Kdf::HkdfSha384,
        (false, _) => Kdf::HkdfSha256,
    };
    kdf.check_secret(secret)?;
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
    let parts: Vec<&str> = text.split('.').collect();
    if parts.len() != 6 || parts[0] != VERSION {
        return Err(CryptoError::malformed("Invalid encrypted format."));
    }
    let resolved = CipherAlgorithm::parse(parts[1])
        .map_err(|_| CryptoError::malformed("Invalid encrypted format: unknown algorithm."))?;
    let aead = resolved.0;
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
    if !matches!(kdf, Kdf::Argon2id { .. }) {
        kdf.check_secret(secret)?;
    }
    let salt = from_base64url(parts[3], "salt")?;
    if salt.len() != SALT_LENGTH {
        return Err(CryptoError::malformed(format!(
            "Invalid encrypted format: the salt must have {SALT_LENGTH} bytes."
        )));
    }
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
    let bytes = decrypt_bytes(text, secret, algorithm)?;
    String::from_utf8(bytes)
        .map_err(|_| CryptoError::malformed("Decrypted data is not UTF-8 text; use decryptBytes."))
}

#[cfg(test)]
mod tests {
    use super::*;

    const SECRET: &str = "a-secret-key-with-more-than-32-characters";

    #[test]
    fn derives_the_key_from_a_password_with_argon2id() {
        let password = "correct horse";
        let encrypted = encrypt(b"hola", password, None, None, true).unwrap();
        assert!(encrypted.starts_with("v1.aes-256-gcm.argon2id-m65536-t3-p4."));
        assert_eq!(decrypt(&encrypted, password, None).unwrap(), "hola");
        assert_eq!(
            decrypt(&encrypted, "correct horsf", None).unwrap_err().code,
            crate::error::ErrorCode::Tampered
        );
        let cnsa = encrypt(b"x", password, Some("cnsa"), None, true).unwrap();
        assert!(cnsa.starts_with("v1.aes-256-gcm.argon2id-m262144-t4-p4."));
        assert_eq!(decrypt(&cnsa, password, None).unwrap(), "x");
        let strong = encrypt(b"x", password, Some("strong"), None, true).unwrap();
        assert!(strong.starts_with("v1.xchacha20-poly1305.argon2id-m65536-t3-p4."));
    }

    #[test]
    fn accepts_passwords_of_8_to_64_characters() {
        for (password, count) in [("1234567", 7), (&"ñ".repeat(65)[..], 65)] {
            assert_eq!(
                encrypt(b"x", password, None, None, true)
                    .unwrap_err()
                    .message,
                format!("Password must have between 8 and 64 characters; it has {count}.")
            );
        }
        assert!(encrypt(b"x", "12345678", Some("basic"), None, true).is_ok());
    }

    #[test]
    fn refuses_argon2_parameters_it_did_not_produce() {
        let encrypted = encrypt(b"x", "correct horse", None, None, true).unwrap();
        let tampered = encrypted.replacen("argon2id-m65536", "argon2id-m4000000", 1);
        assert_eq!(
            decrypt(&tampered, "correct horse", None)
                .unwrap_err()
                .message,
            "Invalid encrypted format: unknown key derivation."
        );
    }

    #[test]
    fn rejects_a_salt_of_the_wrong_length_without_trapping() {
        for (kdf_secret, password) in [("correct horse", true), (SECRET, false)] {
            let encrypted = encrypt(b"x", kdf_secret, None, None, password).unwrap();
            let mut parts: Vec<&str> = encrypted.split('.').collect();
            for salt in ["", "AAAA", "AAAAAAAAAAAAAAAAAAAAAAAA"] {
                parts[3] = salt;
                let error = decrypt(&parts.join("."), kdf_secret, None).unwrap_err();
                assert_eq!(error.code, crate::error::ErrorCode::Malformed, "{salt}");
                assert_eq!(
                    error.message,
                    "Invalid encrypted format: the salt must have 16 bytes."
                );
            }
        }
    }

    #[test]
    fn round_trips_with_every_level() {
        for level in ["basic", "standard", "strong", "cnsa", "military"] {
            let encrypted =
                encrypt("hola 👋".as_bytes(), SECRET, Some(level), None, false).unwrap();
            assert_eq!(decrypt(&encrypted, SECRET, None).unwrap(), "hola 👋");
        }
    }

    #[test]
    fn records_algorithm_and_key_derivation_in_the_header() {
        let basic = encrypt(b"x", SECRET, Some("basic"), None, false).unwrap();
        assert!(basic.starts_with("v1.aes-128-gcm.hkdf-sha256."));
        let strong = encrypt(b"x", SECRET, Some("strong"), None, false).unwrap();
        assert!(strong.starts_with("v1.xchacha20-poly1305.hkdf-sha256."));
        let cnsa = encrypt(b"x", SECRET, Some("cnsa"), None, false).unwrap();
        assert!(cnsa.starts_with("v1.aes-256-gcm.hkdf-sha384."));
        let chacha = encrypt(b"x", SECRET, None, Some("chacha20-poly1305"), false).unwrap();
        assert_eq!(
            decrypt(&chacha, SECRET, Some("chacha20-poly1305")).unwrap(),
            "x"
        );
    }

    #[test]
    fn produces_a_different_ciphertext_every_time() {
        let first = encrypt(b"x", SECRET, None, None, false).unwrap();
        let second = encrypt(b"x", SECRET, None, None, false).unwrap();
        assert_ne!(first, second);
    }

    #[test]
    fn detects_tampering_and_wrong_keys() {
        let encrypted = encrypt(b"secret data", SECRET, None, None, false).unwrap();
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
        let encrypted = encrypt(b"x", SECRET, None, None, false).unwrap();
        let bad_kdf = encrypted.replacen("hkdf-sha256", "hkdf-md5", 1);
        assert!(decrypt(&bad_kdf, SECRET, None).is_err());
        assert!(decrypt(&encrypted, SECRET, Some("aes-128-gcm")).is_err());
    }

    #[test]
    fn returns_bytes_and_refuses_binary_as_text() {
        let encrypted = encrypt(&[0, 159, 146, 150], SECRET, None, None, false).unwrap();
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
        assert!(encrypt(b"x", short, None, None, false).is_ok());
        assert_eq!(
            encrypt(b"x", short, Some("cnsa"), None, false)
                .unwrap_err()
                .message,
            "Key must have a minimum length of 32 characters."
        );
        assert!(encrypt(b"x", "short", None, None, false).is_err());
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
}
