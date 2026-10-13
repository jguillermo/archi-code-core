use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::{Argon2, Params, Version};
use rand_core::OsRng;
use serde::Serialize;
use unicode_segmentation::UnicodeSegmentation;

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
            Level::Basic => PasswordAlgorithm::Bcrypt,
            Level::Standard | Level::Strong | Level::Cnsa => PasswordAlgorithm::Argon2id,
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
const MAX_BCRYPT_COST: u32 = 14;
const MAX_BCRYPT_BYTES: usize = 72;
const BCRYPT_PREFIX: &str = "$2b$";
const ARGON2_VERSION: u32 = 0x13;
pub const MAX_PASSWORD_CHARACTERS: usize = 64;

fn bcrypt_cost(level: Level) -> u32 {
    match level {
        Level::Basic => 10,
        _ => 12,
    }
}

pub fn argon2_params(level: Level) -> PasswordParams {
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
    let effective_level = explicit.unwrap_or(Level::Standard);
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
            "The cost option only applies to bcrypt (algorithm bcrypt or level basic); argon2id takes its parameters from the level.",
        )),
        (PasswordAlgorithm::Argon2id, None) => Ok(argon2_params(effective_level)),
    }
}

pub fn characters(password: &str) -> usize {
    password.graphemes(true).count()
}

fn check_length(password: &str) -> CryptoResult<()> {
    let count = characters(password);
    if count > MAX_PASSWORD_CHARACTERS {
        return Err(CryptoError::invalid_input(format!(
            "Password must have at most {MAX_PASSWORD_CHARACTERS} characters; it has {count}."
        )));
    }
    Ok(())
}

fn bcrypt_hash(password: &str, cost: u32) -> CryptoResult<String> {
    let bytes = password.len();
    if bytes > MAX_BCRYPT_BYTES {
        return Err(CryptoError::invalid_input(format!(
            "bcrypt only uses the first {MAX_BCRYPT_BYTES} bytes and this password has {bytes}; use argon2id (level standard)."
        )));
    }
    bcrypt::hash(password, cost)
        .map_err(|error| CryptoError::invalid_input(format!("bcrypt failed: {error}.")))
}

pub fn hash(
    password: &str,
    level: Option<&str>,
    algorithm: Option<&str>,
    cost: Option<u32>,
) -> CryptoResult<String> {
    let params = params(level, algorithm, cost)?;
    check_length(password)?;
    match params {
        PasswordParams::Bcrypt { cost } => bcrypt_hash(password, cost),
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

fn bcrypt_hash_cost(value: &str) -> Option<u32> {
    let rest = value.strip_prefix(BCRYPT_PREFIX)?.as_bytes();
    let well_formed = rest.len() == 2 + 1 + 53
        && rest[0].is_ascii_digit()
        && rest[1].is_ascii_digit()
        && rest[2] == b'$'
        && rest[3..]
            .iter()
            .all(|byte| byte.is_ascii_alphanumeric() || *byte == b'.' || *byte == b'/');
    well_formed.then(|| u32::from(rest[0] - b'0') * 10 + u32::from(rest[1] - b'0'))
}

fn within_argon2_limits(hash: &PasswordHash<'_>) -> bool {
    let PasswordParams::Argon2id {
        memory_kib,
        iterations,
        parallelism,
    } = argon2_params(Level::Cnsa)
    else {
        unreachable!("argon2_params always describes argon2id")
    };
    Params::try_from(hash).is_ok_and(|params| {
        params.m_cost() <= memory_kib
            && params.t_cost() <= iterations
            && params.p_cost() <= parallelism
    })
}

fn parse_argon2(value: &str) -> Option<PasswordHash<'_>> {
    PasswordHash::new(value).ok().filter(|hash| {
        hash.algorithm.as_str() == "argon2id" && hash.version == Some(ARGON2_VERSION)
    })
}

pub fn is_hash(value: &str) -> bool {
    bcrypt_hash_cost(value).is_some() || parse_argon2(value).is_some()
}

pub fn verify(password: &str, hash: &str) -> bool {
    if let Some(cost) = bcrypt_hash_cost(hash) {
        return cost <= MAX_BCRYPT_COST
            && password.len() <= MAX_BCRYPT_BYTES
            && bcrypt::verify(password, hash).unwrap_or(false);
    }
    match parse_argon2(hash) {
        Some(parsed) if within_argon2_limits(&parsed) => Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok(),
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_every_level_to_its_parameters() {
        assert_eq!(
            params(Some("basic"), None, None).unwrap(),
            PasswordParams::Bcrypt { cost: 10 }
        );
        assert_eq!(
            params(Some("standard"), None, None).unwrap(),
            PasswordParams::Argon2id {
                memory_kib: 65_536,
                iterations: 3,
                parallelism: 4
            }
        );
        assert_eq!(
            params(None, None, None),
            params(Some("standard"), None, None)
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
    fn accepts_a_bcrypt_cost_between_4_and_14() {
        assert_eq!(
            params(None, Some("bcrypt"), Some(4)).unwrap(),
            PasswordParams::Bcrypt { cost: 4 }
        );
        assert_eq!(
            params(None, Some("bcrypt"), None).unwrap(),
            PasswordParams::Bcrypt { cost: 12 }
        );
        assert_eq!(
            params(None, Some("bcrypt"), Some(14)).unwrap(),
            PasswordParams::Bcrypt { cost: 14 }
        );
        for cost in [3, 15, 31] {
            let error = params(Some("basic"), None, Some(cost)).unwrap_err();
            assert_eq!(error.message, "Cost must be between 4 and 14.");
        }
        assert!(params(Some("strong"), None, Some(10)).is_err());
        assert_eq!(
            params(None, None, Some(10)).unwrap_err().code,
            crate::error::ErrorCode::Unsupported
        );
    }

    #[test]
    fn hashes_and_verifies_with_bcrypt() {
        let hash = hash("secret", None, Some("bcrypt"), Some(4)).unwrap();
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
    fn counts_characters_as_people_see_them() {
        assert_eq!(characters("contraseña"), 10);
        assert_eq!(characters("contrasen\u{303}a"), 10);
        assert_eq!(characters("👨‍👩‍👧🔒"), 2);
        assert_eq!(characters("密码"), 2);
    }

    #[test]
    fn accepts_up_to_64_characters_of_any_kind() {
        for unit in ["a", "ñ", "密", "🔒"] {
            let longest = unit.repeat(MAX_PASSWORD_CHARACTERS);
            let hash = hash(&longest, Some("standard"), None, None).unwrap();
            assert!(verify(&longest, &hash), "{unit}");
            let shorter = unit.repeat(MAX_PASSWORD_CHARACTERS - 1);
            assert!(!verify(&shorter, &hash), "{unit}");
            let error = hash_too_long(unit);
            assert_eq!(
                error.message,
                "Password must have at most 64 characters; it has 65."
            );
        }
    }

    fn hash_too_long(unit: &str) -> CryptoError {
        hash(
            &unit.repeat(MAX_PASSWORD_CHARACTERS + 1),
            Some("basic"),
            None,
            Some(4),
        )
        .unwrap_err()
    }

    #[test]
    fn refuses_bcrypt_passwords_it_would_truncate() {
        let ascii = "a".repeat(64);
        assert!(verify(
            &ascii,
            &hash(&ascii, Some("basic"), None, Some(4)).unwrap()
        ));
        let accented = "ñ".repeat(37);
        let error = hash(&accented, Some("basic"), None, Some(4)).unwrap_err();
        assert_eq!(error.code, crate::error::ErrorCode::InvalidInput);
        assert_eq!(
            error.message,
            "bcrypt only uses the first 72 bytes and this password has 74; use argon2id (level standard)."
        );
        let exact = "ñ".repeat(36);
        let hash = hash(&exact, Some("basic"), None, Some(4)).unwrap();
        assert!(verify(&exact, &hash));
        assert!(!verify(&"ñ".repeat(35), &hash));
    }

    #[test]
    fn does_not_verify_bcrypt_passwords_it_would_truncate() {
        let long = "a".repeat(MAX_BCRYPT_BYTES + 8);
        let first_bytes = &long[..MAX_BCRYPT_BYTES];
        let hash = bcrypt::hash(first_bytes, 4).unwrap();
        assert!(verify(first_bytes, &hash));
        assert!(!verify(&long, &hash));
    }

    #[test]
    fn refuses_to_verify_hashes_above_the_cnsa_cost() {
        let bcrypt_14 = bcrypt::hash("secret", 14).unwrap();
        assert!(verify("secret", &bcrypt_14));
        let bcrypt_31 = format!("$2b$31${}", &bcrypt_14[7..]);
        assert!(is_hash(&bcrypt_31));
        assert!(!verify("secret", &bcrypt_31));
        let cnsa = hash("secret", Some("cnsa"), None, None).unwrap();
        assert!(verify("secret", &cnsa));
        for (from, to) in [
            ("m=262144", "m=4194304"),
            ("t=4", "t=5"),
            ("p=4", "p=5"),
            ("m=262144", "m=1"),
        ] {
            let crafted = cnsa.replacen(from, to, 1);
            assert!(is_hash(&crafted), "{to}");
            assert!(!verify("secret", &crafted), "{to}");
        }
    }

    #[test]
    fn only_accepts_the_argon2id_hashes_it_produces() {
        let own = hash("secret", None, None, None).unwrap();
        assert!(is_hash(&own));
        for other in [
            own.replacen("$argon2id$", "$argon2i$", 1),
            own.replacen("$argon2id$", "$argon2d$", 1),
            own.replacen("v=19", "v=16", 1),
        ] {
            assert!(!is_hash(&other), "{other}");
            assert!(!verify("secret", &other), "{other}");
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
            "$2$12$D5.xYyM96cGfD.g8O6jMkOt3kFKQoBJDdq9BdqjVwp3Xkrxjl5Nuq",
            "$2a$12$D5.xYyM96cGfD.g8O6jMkOt3kFKQoBJDdq9BdqjVwp3Xkrxjl5Nuq",
            "$2y$12$D5.xYyM96cGfD.g8O6jMkOt3kFKQoBJDdq9BdqjVwp3Xkrxjl5Nuq",
        ] {
            assert!(!is_hash(value), "{value}");
            assert!(!verify("secret", value), "{value}");
        }
        assert!(is_hash(
            "$2b$12$D5.xYyM96cGfD.g8O6jMkOt3kFKQoBJDdq9BdqjVwp3Xkrxjl5Nuq"
        ));
    }
}
