use rand_core::OsRng;
use rsa::Oaep;
use rsa::RsaPublicKey;
use sha2::{Sha256, Sha384, Sha512};

use crate::aead::{AeadAlgorithm, open, seal};
use crate::encoding::{from_base64url, random_bytes, to_base64url};
use crate::error::{CryptoError, CryptoResult};
use crate::level::{Algorithm, Level, explicit_level, resolve};
use crate::rsa_keys::{RsaHash, check_size, parse_private, parse_public};
use crate::token::{jwe_header, jwe_parts};

const CONTENT_ENCRYPTION: &str = "A256GCM";
const CONTENT_KEY_LENGTH: usize = 32;
const NONCE_LENGTH: usize = 12;
const TAG_LENGTH: usize = 16;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RsaOaep(pub RsaHash);

impl Algorithm for RsaOaep {
    fn parse(value: &str) -> CryptoResult<Self> {
        value
            .strip_prefix("RSA-OAEP-")
            .and_then(RsaHash::from_bits)
            .map(RsaOaep)
            .ok_or_else(|| {
                CryptoError::unsupported(format!(
                    "Unsupported RSA algorithm: {value}. Use RSA-OAEP-256, RSA-OAEP-384 or RSA-OAEP-512."
                ))
            })
    }

    fn name(self) -> &'static str {
        match self.0 {
            RsaHash::Sha256 => "RSA-OAEP-256",
            RsaHash::Sha384 => "RSA-OAEP-384",
            RsaHash::Sha512 => "RSA-OAEP-512",
        }
    }

    fn for_level(level: Level) -> Self {
        RsaOaep(RsaHash::for_level(level))
    }
}

fn padding(hash: RsaHash) -> Oaep {
    match hash {
        RsaHash::Sha256 => Oaep::new::<Sha256>(),
        RsaHash::Sha384 => Oaep::new::<Sha384>(),
        RsaHash::Sha512 => Oaep::new::<Sha512>(),
    }
}

fn wrap_key(public: &RsaPublicKey, hash: RsaHash, content_key: &[u8]) -> CryptoResult<Vec<u8>> {
    public
        .encrypt(&mut OsRng, padding(hash), content_key)
        .map_err(|error| CryptoError::invalid_key(format!("RSA encryption failed: {error}.")))
}

pub fn encrypt(
    data: &[u8],
    public_pem: &str,
    level: Option<&str>,
    algorithm: Option<&str>,
) -> CryptoResult<String> {
    let oaep = resolve::<RsaOaep>(level, algorithm)?;
    let public = parse_public(public_pem)?;
    check_size(&public, explicit_level(level)?)?;
    let content_key = random_bytes(CONTENT_KEY_LENGTH)?;
    let wrapped = wrap_key(&public, oaep.0, &content_key)?;
    let header = to_base64url(
        format!(
            r#"{{"alg":"{}","enc":"{CONTENT_ENCRYPTION}"}}"#,
            oaep.name()
        )
        .as_bytes(),
    );
    let nonce = random_bytes(NONCE_LENGTH)?;
    let sealed = seal(
        AeadAlgorithm::Aes256Gcm,
        &content_key,
        &nonce,
        data,
        header.as_bytes(),
    );
    let (ciphertext, tag) = sealed.split_at(sealed.len() - TAG_LENGTH);
    Ok(format!(
        "{header}.{}.{}.{}.{}",
        to_base64url(&wrapped),
        to_base64url(&nonce),
        to_base64url(ciphertext),
        to_base64url(tag)
    ))
}

pub fn decrypt_bytes(token: &str, private_pem: &str) -> CryptoResult<Vec<u8>> {
    let private = parse_private(private_pem)?;
    let [header, wrapped, nonce, ciphertext, tag] = jwe_parts(token)?;
    let parsed = jwe_header(header)?;
    let oaep = parsed["alg"]
        .as_str()
        .map(RsaOaep::parse)
        .transpose()?
        .ok_or_else(|| CryptoError::malformed("Invalid token header."))?;
    if parsed["enc"] != CONTENT_ENCRYPTION {
        return Err(CryptoError::unsupported(
            "Only A256GCM content encryption is supported.",
        ));
    }
    let wrapped = from_base64url(wrapped, "encrypted key")?;
    let nonce = from_base64url(nonce, "nonce")?;
    let mut sealed = from_base64url(ciphertext, "ciphertext")?;
    sealed.extend(from_base64url(tag, "tag")?);
    let unreadable =
        || CryptoError::tampered("Data may have been tampered with or the key is wrong.");
    let content_key = private
        .decrypt_blinded(&mut OsRng, padding(oaep.0), &wrapped)
        .map_err(|_| unreadable())?;
    if content_key.len() != CONTENT_KEY_LENGTH {
        return Err(unreadable());
    }
    open(
        AeadAlgorithm::Aes256Gcm,
        &content_key,
        &nonce,
        &sealed,
        header.as_bytes(),
    )
    .map_err(|_| unreadable())
}

pub fn decrypt(token: &str, private_pem: &str) -> CryptoResult<String> {
    String::from_utf8(decrypt_bytes(token, private_pem)?)
        .map_err(|_| CryptoError::malformed("Decrypted data is not UTF-8 text; use decryptBytes."))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::ErrorCode;
    use crate::rsa_keys::tests::{pair_2048, pair_4096};

    #[test]
    fn encrypts_any_size_for_the_owner_of_the_private_key() {
        let pair = pair_2048();
        let large: Vec<u8> = (0..200_000u32).map(|value| (value % 251) as u8).collect();
        let token = encrypt(&large, &pair.public_key, None, None).unwrap();
        assert!(token.starts_with("eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0."));
        assert_eq!(decrypt_bytes(&token, &pair.private_key).unwrap(), large);
        let text = encrypt("hola".as_bytes(), &pair.public_key, Some("basic"), None).unwrap();
        assert_eq!(decrypt(&text, &pair.private_key).unwrap(), "hola");
    }

    #[test]
    fn uses_the_hash_of_each_level() {
        let pair = pair_4096();
        for (level, name) in [("strong", "RSA-OAEP-384"), ("cnsa", "RSA-OAEP-512")] {
            let token = encrypt(b"x", &pair.public_key, Some(level), None).unwrap();
            let header = jwe_header(token.split('.').next().unwrap()).unwrap();
            assert_eq!(header["alg"], name);
            assert_eq!(decrypt(&token, &pair.private_key).unwrap(), "x");
        }
    }

    #[test]
    fn refuses_keys_below_the_level() {
        let error = encrypt(b"x", &pair_2048().public_key, Some("cnsa"), None).unwrap_err();
        assert_eq!(error.code, ErrorCode::InvalidKey);
    }

    #[test]
    fn detects_wrong_keys_and_tampering() {
        let token = encrypt(b"secret", &pair_2048().public_key, None, None).unwrap();
        assert_eq!(
            decrypt(&token, &pair_4096().private_key).unwrap_err().code,
            ErrorCode::Tampered
        );
        let mut parts: Vec<String> = token.split('.').map(String::from).collect();
        parts[3] = to_base64url(b"other!");
        assert_eq!(
            decrypt(&parts.join("."), &pair_2048().private_key)
                .unwrap_err()
                .code,
            ErrorCode::Tampered
        );
    }

    #[test]
    fn rejects_malformed_tokens() {
        let private = &pair_2048().private_key;
        assert!(decrypt("a.b", private).is_err());
        let dir = to_base64url(br#"{"alg":"dir","enc":"A256GCM"}"#);
        assert!(decrypt(&format!("{dir}.a.b.c.d"), private).is_err());
        let no_alg = to_base64url(br#"{"enc":"A256GCM"}"#);
        assert!(decrypt(&format!("{no_alg}.a.b.c.d"), private).is_err());
        let other_enc = to_base64url(br#"{"alg":"RSA-OAEP-256","enc":"A128GCM"}"#);
        assert_eq!(
            decrypt(&format!("{other_enc}.a.b.c.d"), private)
                .unwrap_err()
                .code,
            ErrorCode::Unsupported
        );
        let binary = encrypt(&[0, 159, 146], &pair_2048().public_key, None, None).unwrap();
        assert_eq!(
            decrypt(&binary, private).unwrap_err().code,
            ErrorCode::Malformed
        );
    }

    #[test]
    fn rejects_a_wrapped_key_of_the_wrong_length() {
        let pair = pair_2048();
        let public = parse_public(&pair.public_key).unwrap();
        let header = to_base64url(br#"{"alg":"RSA-OAEP-256","enc":"A256GCM"}"#);
        let wrapped = wrap_key(&public, RsaHash::Sha256, &[1u8; 16]).unwrap();
        let token = format!(
            "{header}.{}.AAAAAAAAAAAAAAAA.AA.AAAAAAAAAAAAAAAAAAAAAA",
            to_base64url(&wrapped)
        );
        assert_eq!(
            decrypt(&token, &pair.private_key).unwrap_err().code,
            ErrorCode::Tampered
        );
    }
}
