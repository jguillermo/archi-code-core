use pasetors::Local;
use pasetors::keys::SymmetricKey;
use pasetors::token::UntrustedToken;
use pasetors::version4::{LocalToken, V4};
use serde_json::{Map, Value};
use zeroize::Zeroizing;

use crate::aead::{AeadAlgorithm, open, seal};
use crate::cipher::derive_key;
use crate::clock::{check_duration, check_now, from_rfc3339, to_rfc3339};
use crate::encoding::{from_base64url, random_bytes, to_base64url};
use crate::error::{CryptoError, CryptoResult};
use crate::level::{Algorithm, Level, resolve};

const PASETO_PREFIX: &str = "v4.local.";
const JWE_HEADER: &str = r#"{"alg":"dir","enc":"A256GCM"}"#;
const KEY_LENGTH: usize = 32;
const JWE_NONCE_LENGTH: usize = 12;
const JWE_TAG_LENGTH: usize = 16;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TokenAlgorithm {
    PasetoV4Local,
    JweDirA256Gcm,
}

impl Algorithm for TokenAlgorithm {
    fn parse(value: &str) -> CryptoResult<Self> {
        match value {
            "paseto-v4-local" => Ok(TokenAlgorithm::PasetoV4Local),
            "jwe-dir-a256gcm" => Ok(TokenAlgorithm::JweDirA256Gcm),
            other => Err(CryptoError::unsupported(format!(
                "Unsupported token algorithm: {other}. Use paseto-v4-local or jwe-dir-a256gcm."
            ))),
        }
    }

    fn name(self) -> &'static str {
        match self {
            TokenAlgorithm::PasetoV4Local => "paseto-v4-local",
            TokenAlgorithm::JweDirA256Gcm => "jwe-dir-a256gcm",
        }
    }

    fn for_level(level: Level) -> Self {
        match level {
            Level::Cnsa => TokenAlgorithm::JweDirA256Gcm,
            _ => TokenAlgorithm::PasetoV4Local,
        }
    }
}

fn token_key(secret: &str, algorithm: TokenAlgorithm) -> CryptoResult<Zeroizing<Vec<u8>>> {
    derive_key(
        secret,
        algorithm == TokenAlgorithm::JweDirA256Gcm,
        None,
        &format!("archi-code/crypto-tools/token/v1/{}", algorithm.name()),
        KEY_LENGTH,
    )
}

pub fn generate_key() -> CryptoResult<String> {
    Ok(to_base64url(&random_bytes(KEY_LENGTH)?))
}

fn paseto_seal(key: &[u8], message: &[u8]) -> CryptoResult<String> {
    let key = SymmetricKey::<V4>::from(key)
        .map_err(|_| CryptoError::invalid_key("PASETO keys have 32 bytes."))?;
    LocalToken::encrypt(&key, message, None, None)
        .map_err(|error| CryptoError::invalid_input(format!("PASETO failed: {error:?}.")))
}

fn paseto_open(key: &[u8], token: &str) -> CryptoResult<Vec<u8>> {
    let key = SymmetricKey::<V4>::from(key)
        .map_err(|_| CryptoError::invalid_key("PASETO keys have 32 bytes."))?;
    let untrusted = UntrustedToken::<Local, V4>::try_from(token)
        .map_err(|_| CryptoError::malformed("Invalid token format."))?;
    let trusted = LocalToken::decrypt(&key, &untrusted, None, None).map_err(|_| {
        CryptoError::tampered("Token may have been tampered with or the key is wrong.")
    })?;
    Ok(trusted.payload().as_bytes().to_vec())
}

fn jwe_seal(key: &[u8], message: &[u8]) -> CryptoResult<String> {
    let header = to_base64url(JWE_HEADER.as_bytes());
    let nonce = random_bytes(JWE_NONCE_LENGTH)?;
    let sealed = seal(
        AeadAlgorithm::Aes256Gcm,
        key,
        &nonce,
        message,
        header.as_bytes(),
    );
    let (ciphertext, tag) = sealed.split_at(sealed.len() - JWE_TAG_LENGTH);
    Ok(format!(
        "{header}..{}.{}.{}",
        to_base64url(&nonce),
        to_base64url(ciphertext),
        to_base64url(tag)
    ))
}

pub fn jwe_parts(token: &str) -> CryptoResult<[&str; 5]> {
    let parts: Vec<&str> = token.split('.').collect();
    parts
        .try_into()
        .map_err(|_| CryptoError::malformed("Invalid token format."))
}

pub fn jwe_header(part: &str) -> CryptoResult<Value> {
    let bytes = from_base64url(part, "token header")?;
    serde_json::from_slice(&bytes).map_err(|_| CryptoError::malformed("Invalid token header."))
}

fn jwe_open(key: &[u8], token: &str) -> CryptoResult<Vec<u8>> {
    let [header, encrypted_key, nonce, ciphertext, tag] = jwe_parts(token)?;
    let parsed = jwe_header(header)?;
    if parsed["alg"] != "dir" || parsed["enc"] != "A256GCM" || !encrypted_key.is_empty() {
        return Err(CryptoError::unsupported(
            "Only JWE dir + A256GCM tokens are supported.",
        ));
    }
    let nonce = from_base64url(nonce, "nonce")?;
    let mut sealed = from_base64url(ciphertext, "ciphertext")?;
    sealed.extend(from_base64url(tag, "tag")?);
    open(
        AeadAlgorithm::Aes256Gcm,
        key,
        &nonce,
        &sealed,
        header.as_bytes(),
    )
    .map_err(|_| CryptoError::tampered("Token may have been tampered with or the key is wrong."))
}

fn claims_with_times(
    payload_json: &str,
    now: i64,
    expires_in: Option<f64>,
) -> CryptoResult<Map<String, Value>> {
    let Ok(Value::Object(mut claims)) = serde_json::from_str::<Value>(payload_json) else {
        return Err(CryptoError::invalid_input(
            "Token payload must be a JSON object.",
        ));
    };
    if !claims.contains_key("iat") {
        claims.insert("iat".into(), Value::String(to_rfc3339(now)?));
    }
    if let Some(expires_in) = expires_in {
        let expires_in = check_duration(expires_in, "expiresIn")?;
        let expires = now
            .checked_add(expires_in)
            .ok_or_else(|| CryptoError::invalid_input("expiresIn is too large."))?;
        claims.insert("exp".into(), Value::String(to_rfc3339(expires)?));
    }
    Ok(claims)
}

pub fn encrypt(
    payload_json: &str,
    secret: &str,
    level: Option<&str>,
    algorithm: Option<&str>,
    now: f64,
    expires_in: Option<f64>,
    require_expiration: bool,
) -> CryptoResult<String> {
    let algorithm = resolve::<TokenAlgorithm>(level, algorithm)?;
    let claims = claims_with_times(payload_json, check_now(now)?, expires_in)?;
    if require_expiration && !claims.contains_key("exp") {
        return Err(CryptoError::invalid_input(
            "A token needs an expiration: pass expiresIn, an exp claim or requireExpiration: false.",
        ));
    }
    let message = Value::Object(claims).to_string();
    let key = token_key(secret, algorithm)?;
    match algorithm {
        TokenAlgorithm::PasetoV4Local => paseto_seal(&key, message.as_bytes()),
        TokenAlgorithm::JweDirA256Gcm => jwe_seal(&key, message.as_bytes()),
    }
}

fn time_claim(claims: &Map<String, Value>, name: &str) -> CryptoResult<Option<i64>> {
    match claims.get(name) {
        None => Ok(None),
        Some(Value::String(text)) => from_rfc3339(text).map(Some),
        Some(_) => Err(CryptoError::malformed(format!(
            "Claim {name} must be a date."
        ))),
    }
}

pub fn decrypt(
    token: &str,
    secret: &str,
    now: f64,
    require_expiration: bool,
) -> CryptoResult<String> {
    let now = check_now(now)?;
    let algorithm = if token.starts_with(PASETO_PREFIX) {
        TokenAlgorithm::PasetoV4Local
    } else {
        jwe_parts(token)?;
        TokenAlgorithm::JweDirA256Gcm
    };
    let key = token_key(secret, algorithm)?;
    let message = match algorithm {
        TokenAlgorithm::PasetoV4Local => paseto_open(&key, token)?,
        TokenAlgorithm::JweDirA256Gcm => jwe_open(&key, token)?,
    };
    let Ok(Value::Object(claims)) = serde_json::from_slice::<Value>(&message) else {
        return Err(CryptoError::malformed(
            "Token payload is not a JSON object.",
        ));
    };
    match time_claim(&claims, "exp")? {
        Some(expires) if now >= expires => return Err(CryptoError::expired("Token expired.")),
        None if require_expiration => {
            return Err(CryptoError::malformed(
                "Token has no exp claim; pass requireExpiration: false to accept it.",
            ));
        }
        _ => {}
    }
    if let Some(not_before) = time_claim(&claims, "nbf")?
        && now < not_before
    {
        return Err(CryptoError::expired("Token is not active yet."));
    }
    Ok(Value::Object(claims).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::ErrorCode;

    const SECRET: &str = "a-secret-key-with-more-than-32-characters";
    const NOW: f64 = 1_700_000_000.0;

    fn payload(token_json: &str) -> Value {
        serde_json::from_str(token_json).unwrap()
    }

    #[test]
    fn opens_the_official_paseto_v4_local_vectors() {
        let vectors: Value =
            serde_json::from_str(include_str!("../../test/fixtures/paseto-v4.json")).unwrap();
        for vector in vectors["tests"].as_array().unwrap() {
            let name = vector["name"].as_str().unwrap();
            if !name.starts_with("4-E")
                || !vector["footer"].as_str().unwrap().is_empty()
                || !vector["implicit-assertion"].as_str().unwrap().is_empty()
            {
                continue;
            }
            let key = hex::decode(vector["key"].as_str().unwrap()).unwrap();
            let opened = paseto_open(&key, vector["token"].as_str().unwrap());
            if vector["expect-fail"].as_bool().unwrap() {
                assert!(opened.is_err(), "{name}");
            } else {
                assert_eq!(
                    String::from_utf8(opened.unwrap()).unwrap(),
                    vector["payload"].as_str().unwrap(),
                    "{name}"
                );
            }
        }
    }

    #[test]
    fn round_trips_with_every_level() {
        for (level, prefix) in [
            ("basic", "v4.local."),
            ("standard", "v4.local."),
            ("strong", "v4.local."),
            ("cnsa", "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0.."),
            ("military", "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0.."),
        ] {
            let token =
                encrypt(r#"{"id":7}"#, SECRET, Some(level), None, NOW, None, false).unwrap();
            assert!(token.starts_with(prefix), "{level}");
            let opened = payload(&decrypt(&token, SECRET, NOW, false).unwrap());
            assert_eq!(opened["id"], 7);
            assert_eq!(opened["iat"], "2023-11-14T22:13:20Z");
        }
    }

    #[test]
    fn expires_after_the_given_seconds() {
        let token = encrypt(r#"{"id":7}"#, SECRET, None, None, NOW, Some(60.0), true).unwrap();
        assert_eq!(
            payload(&decrypt(&token, SECRET, NOW + 59.0, true).unwrap())["exp"],
            "2023-11-14T22:14:20Z"
        );
        assert_eq!(
            decrypt(&token, SECRET, NOW + 60.0, true).unwrap_err().code,
            ErrorCode::Expired
        );
        assert!(encrypt(r#"{}"#, SECRET, None, None, NOW, Some(-1.0), true).is_err());
        assert_eq!(
            encrypt(
                r#"{}"#,
                SECRET,
                None,
                None,
                NOW,
                Some(i64::MAX as f64),
                true
            )
            .unwrap_err()
            .message,
            "expiresIn is too large."
        );
    }

    #[test]
    fn requires_an_expiration_unless_told_otherwise() {
        assert_eq!(
            encrypt(r#"{"id":7}"#, SECRET, None, None, NOW, None, true)
                .unwrap_err()
                .message,
            "A token needs an expiration: pass expiresIn, an exp claim or requireExpiration: false."
        );
        let with_claim = r#"{"exp":"2030-01-01T00:00:00Z"}"#;
        let token = encrypt(with_claim, SECRET, None, None, NOW, None, true).unwrap();
        assert!(decrypt(&token, SECRET, NOW, true).is_ok());
        let forever = encrypt(r#"{"id":7}"#, SECRET, None, None, NOW, None, false).unwrap();
        let error = decrypt(&forever, SECRET, NOW, true).unwrap_err();
        assert_eq!(error.code, ErrorCode::Malformed);
        assert_eq!(
            error.message,
            "Token has no exp claim; pass requireExpiration: false to accept it."
        );
        assert!(decrypt(&forever, SECRET, NOW, false).is_ok());
    }

    #[test]
    fn honours_not_before_and_keeps_an_explicit_iat() {
        let claims = r#"{"iat":"2020-01-01T00:00:00Z","nbf":"2030-01-01T00:00:00Z"}"#;
        let token = encrypt(claims, SECRET, None, None, NOW, None, false).unwrap();
        assert_eq!(
            decrypt(&token, SECRET, NOW, false).unwrap_err().message,
            "Token is not active yet."
        );
        assert!(decrypt(&token, SECRET, 1_900_000_000.0, false).is_ok());
        let bad = encrypt(r#"{"exp":42}"#, SECRET, None, None, NOW, None, false).unwrap();
        assert_eq!(
            decrypt(&bad, SECRET, NOW, false).unwrap_err().code,
            ErrorCode::Malformed
        );
    }

    #[test]
    fn detects_tampering_and_wrong_keys() {
        for level in ["standard", "cnsa"] {
            let token =
                encrypt(r#"{"id":7}"#, SECRET, Some(level), None, NOW, None, false).unwrap();
            let other = "another-secret-key-with-32-characters!!";
            assert_eq!(
                decrypt(&token, other, NOW, false).unwrap_err().code,
                ErrorCode::Tampered
            );
            let mut bytes = token.into_bytes();
            let index = bytes.len() - 3;
            bytes[index] = if bytes[index] == b'A' { b'B' } else { b'A' };
            let tampered = String::from_utf8(bytes).unwrap();
            assert!(decrypt(&tampered, SECRET, NOW, false).is_err());
        }
    }

    #[test]
    fn rejects_bad_payloads_and_malformed_tokens() {
        assert_eq!(
            encrypt("[1]", SECRET, None, None, NOW, None, false)
                .unwrap_err()
                .code,
            ErrorCode::InvalidInput
        );
        for token in ["", "v4.local.", "a.b.c", "e30.x.y.z.w", "v4.local.AAAA"] {
            assert!(decrypt(token, SECRET, NOW, false).is_err(), "{token}");
        }
        assert_eq!(
            decrypt("nope", "short-but-valid-16", NOW, false)
                .unwrap_err()
                .code,
            ErrorCode::Malformed
        );
        let header = to_base64url(br#"{"alg":"A256KW","enc":"A256GCM"}"#);
        assert_eq!(
            decrypt(&format!("{header}..a.b.c"), SECRET, NOW, false)
                .unwrap_err()
                .code,
            ErrorCode::Unsupported
        );
        let key = token_key(SECRET, TokenAlgorithm::JweDirA256Gcm).unwrap();
        let array = jwe_seal(&key, b"[1]").unwrap();
        assert_eq!(
            decrypt(&array, SECRET, NOW, false).unwrap_err().code,
            ErrorCode::Malformed
        );
        assert!(paseto_seal(&key[..16], b"x").is_err());
        assert!(paseto_open(&key[..16], "v4.local.x").is_err());
        assert!(paseto_seal(&key, b"").is_err());
    }

    #[test]
    fn generates_random_keys() {
        let key = generate_key().unwrap();
        assert_eq!(key.len(), 43);
        assert_ne!(key, generate_key().unwrap());
    }
}
