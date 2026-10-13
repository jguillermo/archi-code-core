use rand_core::OsRng;
use rsa::pss::{Signature, SigningKey, VerifyingKey};
use rsa::signature::{RandomizedSigner, SignatureEncoding, Verifier};
use rsa::{RsaPrivateKey, RsaPublicKey};
use serde_json::Value;
use sha2::{Sha256, Sha384, Sha512};

use crate::encoding::{from_base64url, to_base64url};
use crate::error::{CryptoError, CryptoResult};
use crate::level::{Algorithm, Level, explicit_level, resolve};
use crate::rsa_keys::{RsaHash, check_size, parse_private, parse_public};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RsaPss(pub RsaHash);

impl Algorithm for RsaPss {
    fn parse(value: &str) -> CryptoResult<Self> {
        value
            .strip_prefix("PS")
            .and_then(RsaHash::from_bits)
            .map(RsaPss)
            .ok_or_else(|| {
                CryptoError::unsupported(format!(
                    "Unsupported signature algorithm: {value}. Use PS256, PS384 or PS512."
                ))
            })
    }

    fn name(self) -> &'static str {
        match self.0 {
            RsaHash::Sha256 => "PS256",
            RsaHash::Sha384 => "PS384",
            RsaHash::Sha512 => "PS512",
        }
    }

    fn for_level(level: Level) -> Self {
        RsaPss(RsaHash::for_level(level))
    }
}

fn header(algorithm: RsaPss) -> String {
    to_base64url(
        format!(
            r#"{{"alg":"{}","b64":false,"crit":["b64"]}}"#,
            algorithm.name()
        )
        .as_bytes(),
    )
}

fn signing_input(header: &str, data: &[u8]) -> Vec<u8> {
    let mut input = Vec::with_capacity(header.len() + 1 + data.len());
    input.extend_from_slice(header.as_bytes());
    input.push(b'.');
    input.extend_from_slice(data);
    input
}

fn sign_with(key: RsaPrivateKey, hash: RsaHash, input: &[u8]) -> Vec<u8> {
    match hash {
        RsaHash::Sha256 => SigningKey::<Sha256>::new(key)
            .sign_with_rng(&mut OsRng, input)
            .to_vec(),
        RsaHash::Sha384 => SigningKey::<Sha384>::new(key)
            .sign_with_rng(&mut OsRng, input)
            .to_vec(),
        RsaHash::Sha512 => SigningKey::<Sha512>::new(key)
            .sign_with_rng(&mut OsRng, input)
            .to_vec(),
    }
}

fn verify_with(key: RsaPublicKey, hash: RsaHash, input: &[u8], signature: &[u8]) -> bool {
    let Ok(signature) = Signature::try_from(signature) else {
        return false;
    };
    match hash {
        RsaHash::Sha256 => VerifyingKey::<Sha256>::new(key)
            .verify(input, &signature)
            .is_ok(),
        RsaHash::Sha384 => VerifyingKey::<Sha384>::new(key)
            .verify(input, &signature)
            .is_ok(),
        RsaHash::Sha512 => VerifyingKey::<Sha512>::new(key)
            .verify(input, &signature)
            .is_ok(),
    }
}

pub fn sign(
    data: &[u8],
    private_pem: &str,
    level: Option<&str>,
    algorithm: Option<&str>,
) -> CryptoResult<String> {
    let algorithm = resolve::<RsaPss>(level, algorithm)?;
    let private = parse_private(private_pem)?;
    check_size(&RsaPublicKey::from(&private), explicit_level(level)?)?;
    let header = header(algorithm);
    let signature = sign_with(private, algorithm.0, &signing_input(&header, data));
    Ok(format!("{header}..{}", to_base64url(&signature)))
}

fn read_algorithm(header: &str) -> Option<RsaPss> {
    let bytes = from_base64url(header, "signature header").ok()?;
    let parsed: Value = serde_json::from_slice(&bytes).ok()?;
    let unencoded =
        parsed["b64"] == Value::Bool(false) && parsed["crit"] == serde_json::json!(["b64"]);
    if !unencoded {
        return None;
    }
    RsaPss::parse(parsed["alg"].as_str()?).ok()
}

pub fn verify(data: &[u8], signature: &str, public_pem: &str) -> CryptoResult<bool> {
    let public = parse_public(public_pem)?;
    let parts: Vec<&str> = signature.split('.').collect();
    let [header, "", encoded] = parts.as_slice() else {
        return Ok(false);
    };
    let Some(algorithm) = read_algorithm(header) else {
        return Ok(false);
    };
    let Ok(bytes) = from_base64url(encoded, "signature") else {
        return Ok(false);
    };
    Ok(verify_with(
        public,
        algorithm.0,
        &signing_input(header, data),
        &bytes,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::ErrorCode;
    use crate::rsa_keys::tests::{pair_2048, pair_4096};

    #[test]
    fn signs_and_verifies_binary_files_with_every_level() {
        let file: Vec<u8> = (0..100_000u32).map(|value| (value % 256) as u8).collect();
        for (level, pair, alg) in [
            ("basic", pair_2048(), "PS256"),
            ("strong", pair_4096(), "PS384"),
            ("military", pair_4096(), "PS512"),
        ] {
            let signature = sign(&file, &pair.private_key, Some(level), None).unwrap();
            assert!(signature.contains(".."));
            assert_eq!(
                read_algorithm(signature.split('.').next().unwrap())
                    .unwrap()
                    .name(),
                alg
            );
            assert!(verify(&file, &signature, &pair.public_key).unwrap());
            let mut altered = file.clone();
            altered[500] ^= 1;
            assert!(!verify(&altered, &signature, &pair.public_key).unwrap());
        }
    }

    #[test]
    fn does_not_verify_with_another_key_or_a_broken_signature() {
        let pair = pair_2048();
        let signature = sign(b"data", &pair.private_key, None, None).unwrap();
        assert!(!verify(b"data", &signature, &pair_4096().public_key).unwrap());
        let other_header = to_base64url(br#"{"alg":"PS256"}"#);
        for broken in [
            "".to_string(),
            "a.b.c".to_string(),
            format!("{}..***", signature.split('.').next().unwrap()),
            format!("{other_header}..{}", signature.split('.').nth(2).unwrap()),
            format!("{}..AAAA", signature.split('.').next().unwrap()),
            "!!..AAAA".to_string(),
        ] {
            assert!(
                !verify(b"data", &broken, &pair.public_key).unwrap(),
                "{broken}"
            );
        }
    }

    #[test]
    fn rejects_invalid_keys_and_small_keys_for_the_level() {
        assert_eq!(
            sign(b"x", "nope", None, None).unwrap_err().code,
            ErrorCode::InvalidKey
        );
        assert_eq!(
            verify(b"x", "a..b", "nope").unwrap_err().code,
            ErrorCode::InvalidKey
        );
        assert_eq!(
            sign(b"x", &pair_2048().private_key, Some("cnsa"), None)
                .unwrap_err()
                .code,
            ErrorCode::InvalidKey
        );
        assert!(sign(b"x", &pair_2048().private_key, None, Some("PS1")).is_err());
    }
}
