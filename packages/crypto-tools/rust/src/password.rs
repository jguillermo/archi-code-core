use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::{Argon2, Params, Version};
use rand_core::OsRng;
use serde::Serialize;

use crate::error::{CryptoError, CryptoResult};
use crate::level::{Algorithm, Level, resolve};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PasswordAlgorithm {
    Bcrypt,
    Argon2id,
}

impl Algorithm for PasswordAlgorithm {
    fn parse(value: &str) -> CryptoResult<Self> {
        match value {
            "bcrypt" => Ok(PasswordAlgorithm::Bcrypt),
            "argon2id" => Ok(PasswordAlgorithm::Argon2id),
            other => Err(CryptoError::unsupported(format!(
                "Unsupported password algorithm: {other}. Use bcrypt or argon2id."
            ))),
        }
    }

    fn name(self) -> &'static str {
        match self {
            PasswordAlgorithm::Bcrypt => "bcrypt",
            PasswordAlgorithm::Argon2id => "argon2id",
        }
    }

    fn for_level(level: Level) -> Self {
        match level {
            Level::Basic | Level::Standard => PasswordAlgorithm::Bcrypt,
            Level::Strong | Level::Cnsa => PasswordAlgorithm::Argon2id,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(tag = "algorithm", rename_all = "camelCase")]
pub enum PasswordParams {
    Bcrypt {
        cost: u32,
    },
    #[serde(rename = "argon2id")]
    Argon2id {
        #[serde(rename = "memoryKiB")]
        memory_kib: u32,
        iterations: u32,
        parallelism: u32,
    },
}

const MIN_BCRYPT_COST: u32 = 4;
const MAX_BCRYPT_COST: u32 = 31;

fn bcrypt_cost(level: Level) -> u32 {
    match level {
        Level::Basic => 10,
        _ => 12,
    }
}

fn argon2_params(level: Level) -> PasswordParams {
    match level {
        Level::Cnsa => PasswordParams::Argon2id {
            memory_kib: 262_144,
            iterations: 4,
            parallelism: 4,
        },
        _ => PasswordParams::Argon2id {
            memory_kib: 65_536,
            iterations: 3,
            parallelism: 4,
        },
    }
}

pub fn params(
    level: Option<&str>,
    algorithm: Option<&str>,
    cost: Option<u32>,
) -> CryptoResult<PasswordParams> {
    let explicit = level.map(Level::parse).transpose()?;
    let resolved = resolve::<PasswordAlgorithm>(level, algorithm)?;
    let effective_level = explicit.unwrap_or(match resolved {
        PasswordAlgorithm::Bcrypt => Level::Standard,
        PasswordAlgorithm::Argon2id => Level::Strong,
    });
    match (resolved, cost) {
        (PasswordAlgorithm::Bcrypt, Some(cost)) => {
            if !(MIN_BCRYPT_COST..=MAX_BCRYPT_COST).contains(&cost) {
                return Err(CryptoError::invalid_input(format!(
                    "Cost must be between {MIN_BCRYPT_COST} and {MAX_BCRYPT_COST}."
                )));
            }
            Ok(PasswordParams::Bcrypt { cost })
        }
        (PasswordAlgorithm::Bcrypt, None) => Ok(PasswordParams::Bcrypt {
            cost: bcrypt_cost(effective_level),
        }),
        (PasswordAlgorithm::Argon2id, Some(_)) => Err(CryptoError::unsupported(
            "The cost option only applies to bcrypt; argon2id takes its parameters from the level.",
        )),
        (PasswordAlgorithm::Argon2id, None) => Ok(argon2_params(effective_level)),
    }
}

pub fn hash(
    password: &str,
    level: Option<&str>,
    algorithm: Option<&str>,
    cost: Option<u32>,
) -> CryptoResult<String> {
    match params(level, algorithm, cost)? {
        PasswordParams::Bcrypt { cost } => bcrypt::hash(password, cost)
            .map_err(|error| CryptoError::invalid_input(format!("bcrypt failed: {error}."))),
        PasswordParams::Argon2id {
            memory_kib,
            iterations,
            parallelism,
        } => {
            let params = Params::new(memory_kib, iterations, parallelism, None)
                .map_err(|error| CryptoError::invalid_input(format!("argon2 failed: {error}.")))?;
            let hasher = Argon2::new(argon2::Algorithm::Argon2id, Version::V0x13, params);
            let salt = SaltString::generate(&mut OsRng);
            hasher
                .hash_password(password.as_bytes(), &salt)
                .map(|hash| hash.to_string())
                .map_err(|error| CryptoError::invalid_input(format!("argon2 failed: {error}.")))
        }
    }
}

fn is_bcrypt_hash(value: &str) -> bool {
    let bytes = value.as_bytes();
    let prefix = if value.starts_with("$2$") {
        3
    } else if value.len() > 4
        && value.starts_with("$2")
        && matches!(bytes[2], b'a' | b'b' | b'y')
        && bytes[3] == b'$'
    {
        4
    } else {
        return false;
    };
    let rest = &bytes[prefix..];
    rest.len() == 2 + 1 + 53
        && rest[0].is_ascii_digit()
        && rest[1].is_ascii_digit()
        && rest[2] == b'$'
        && rest[3..]
            .iter()
            .all(|byte| byte.is_ascii_alphanumeric() || *byte == b'.' || *byte == b'/')
}

fn parse_argon2(value: &str) -> Option<PasswordHash<'_>> {
    PasswordHash::new(value)
        .ok()
        .filter(|hash| hash.algorithm.as_str().starts_with("argon2"))
}

pub fn is_hash(value: &str) -> bool {
    is_bcrypt_hash(value) || parse_argon2(value).is_some()
}

pub fn verify(password: &str, hash: &str) -> bool {
    if is_bcrypt_hash(hash) {
        return bcrypt::verify(password, hash).unwrap_or(false);
    }
    match parse_argon2(hash) {
        Some(parsed) => Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok(),
        None => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    fn fixtures() -> Value {
        serde_json::from_str(include_str!("../../test/fixtures/legacy.json")).unwrap()
    }

    #[test]
    fn maps_every_level_to_its_parameters() {
        assert_eq!(
            params(Some("basic"), None, None).unwrap(),
            PasswordParams::Bcrypt { cost: 10 }
        );
        assert_eq!(
            params(Some("standard"), None, None).unwrap(),
            PasswordParams::Bcrypt { cost: 12 }
        );
        assert_eq!(
            params(Some("strong"), None, None).unwrap(),
            PasswordParams::Argon2id {
                memory_kib: 65_536,
                iterations: 3,
                parallelism: 4
            }
        );
        assert_eq!(
            params(Some("military"), None, None).unwrap(),
            PasswordParams::Argon2id {
                memory_kib: 262_144,
                iterations: 4,
                parallelism: 4
            }
        );
        assert_eq!(
            params(None, Some("argon2id"), None).unwrap(),
            params(Some("strong"), None, None).unwrap()
        );
    }

    #[test]
    fn accepts_a_bcrypt_cost_between_4_and_31() {
        assert_eq!(
            params(None, None, Some(4)).unwrap(),
            PasswordParams::Bcrypt { cost: 4 }
        );
        for cost in [3, 32] {
            let error = params(None, None, Some(cost)).unwrap_err();
            assert_eq!(error.message, "Cost must be between 4 and 31.");
        }
        assert!(params(Some("strong"), None, Some(10)).is_err());
    }

    #[test]
    fn hashes_and_verifies_with_bcrypt() {
        let hash = hash("secret", None, None, Some(4)).unwrap();
        assert!(hash.starts_with("$2b$04$"));
        assert!(is_hash(&hash));
        assert!(verify("secret", &hash));
        assert!(!verify("other", &hash));
    }

    #[test]
    fn hashes_and_verifies_with_argon2id() {
        let hash = hash("secret", Some("strong"), None, None).unwrap();
        assert!(hash.starts_with("$argon2id$v=19$m=65536,t=3,p=4$"));
        assert!(is_hash(&hash));
        assert!(verify("secret", &hash));
        assert!(!verify("other", &hash));
    }

    #[test]
    fn verifies_hashes_made_by_the_javascript_libraries() {
        let fixtures = fixtures();
        for name in ["bcrypt", "argon2id"] {
            let case = &fixtures["password"][name];
            let password = case["password"].as_str().unwrap();
            let hash = case["hash"].as_str().unwrap();
            assert!(verify(password, hash), "{name}");
            assert!(!verify("WrongPassword!", hash), "{name}");
        }
    }

    #[test]
    fn rejects_malformed_hashes() {
        for value in [
            "",
            "$2b$malformedhash",
            "$2b$12$malformedhashXXXXXXXXXXXXXXXXXXXXXXX",
            "sha256$abcdef1234567890",
            "$pbkdf2-sha256$i=1000$c2FsdA$aGFzaA",
        ] {
            assert!(!is_hash(value), "{value}");
            assert!(!verify("secret", value), "{value}");
        }
        assert!(is_hash(
            "$2b$12$D5.xYyM96cGfD.g8O6jMkOt3kFKQoBJDdq9BdqjVwp3Xkrxjl5Nuq"
        ));
        assert!(is_hash(
            "$2$12$D5.xYyM96cGfD.g8O6jMkOt3kFKQoBJDdq9BdqjVwp3Xkrxjl5Nuq"
        ));
    }
}
