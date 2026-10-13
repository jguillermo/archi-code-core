use serde_json::{Value, json};

use crate::cipher::CipherAlgorithm;
use crate::hash::DigestAlgorithm;
use crate::jwt::algorithm_for_level;
use crate::level::{Algorithm, Level};
use crate::password::params;
use crate::rsa_cipher::RsaOaep;
use crate::rsa_keys::bits_for_level;
use crate::signature::RsaPss;
use crate::token::TokenAlgorithm;

fn describe(level: Level) -> Value {
    json!({
        "cipher": CipherAlgorithm::for_level(level).name(),
        "token": TokenAlgorithm::for_level(level).name(),
        "hash": DigestAlgorithm::for_level(level).name(),
        "password": params(Some(level.name()), None, None)
            .unwrap_or_else(|_| unreachable!("every level has password parameters")),
        "rsa": {
            "bits": bits_for_level(level),
            "encryption": RsaOaep::for_level(level).name(),
            "signature": RsaPss::for_level(level).name(),
        },
        "jwt": {
            "secret": algorithm_for_level(level, false),
            "pem": algorithm_for_level(level, true),
        },
    })
}

pub fn security_levels() -> String {
    let levels: serde_json::Map<String, Value> = Level::ALL
        .iter()
        .map(|level| (level.name().to_string(), describe(*level)))
        .collect();
    Value::Object(levels).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn describes_every_level() {
        let levels: Value = serde_json::from_str(&security_levels()).unwrap();
        assert_eq!(levels["basic"]["cipher"], "aes-128-gcm");
        assert_eq!(
            levels["standard"]["password"],
            json!({"algorithm": "bcrypt", "cost": 12})
        );
        assert_eq!(levels["strong"]["token"], "paseto-v4-local");
        assert_eq!(levels["cnsa"]["rsa"]["signature"], "PS512");
        assert_eq!(levels["cnsa"]["jwt"]["pem"], "RS512");
        assert_eq!(
            levels["cnsa"]["password"],
            json!({"algorithm": "argon2id", "memoryKiB": 262144, "iterations": 4, "parallelism": 4})
        );
    }
}
