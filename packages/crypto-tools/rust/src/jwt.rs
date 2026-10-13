use jsonwebtoken::errors::ErrorKind;
use jsonwebtoken::{Algorithm as JwtAlgorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::Deserialize;
use serde_json::{Map, Value};

use crate::clock::check_now;
use crate::error::{CryptoError, CryptoResult};
use crate::level::{Level, explicit_level};
use crate::rsa_keys::{check_size, parse_private, parse_public};

const MIN_SECRET_LENGTH: usize = 16;
const INVALID_FORMAT: &str = "Invalid JWT format.";
const INVALID_PUBLIC_KEY: &str = "Invalid RSA public key PEM.";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum KeyKind {
    Secret,
    Pem,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SignOptions {
    level: Option<String>,
    algorithm: Option<String>,
    expires_in: Option<f64>,
    issuer: Option<String>,
    subject: Option<String>,
    audience: Option<Value>,
    require_expiration: Option<bool>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VerifyOptions {
    algorithms: Option<Vec<String>>,
    issuer: Option<String>,
    audience: Option<String>,
    clock_tolerance: Option<f64>,
    require_expiration: Option<bool>,
}

fn key_kind(key: &str) -> KeyKind {
    if key.trim_start().starts_with("-----BEGIN") {
        KeyKind::Pem
    } else {
        KeyKind::Secret
    }
}

fn parse_algorithm(name: &str) -> CryptoResult<JwtAlgorithm> {
    match name {
        "HS256" => Ok(JwtAlgorithm::HS256),
        "HS384" => Ok(JwtAlgorithm::HS384),
        "HS512" => Ok(JwtAlgorithm::HS512),
        "RS256" => Ok(JwtAlgorithm::RS256),
        "RS384" => Ok(JwtAlgorithm::RS384),
        "RS512" => Ok(JwtAlgorithm::RS512),
        other => Err(CryptoError::unsupported(format!(
            "Unsupported JWT algorithm: {other}. Use HS256, HS384, HS512, RS256, RS384 or RS512."
        ))),
    }
}

fn algorithm_name(algorithm: JwtAlgorithm) -> &'static str {
    match algorithm {
        JwtAlgorithm::HS256 => "HS256",
        JwtAlgorithm::HS384 => "HS384",
        JwtAlgorithm::HS512 => "HS512",
        JwtAlgorithm::RS256 => "RS256",
        JwtAlgorithm::RS384 => "RS384",
        _ => "RS512",
    }
}

fn kind_of(algorithm: JwtAlgorithm) -> KeyKind {
    match algorithm {
        JwtAlgorithm::HS256 | JwtAlgorithm::HS384 | JwtAlgorithm::HS512 => KeyKind::Secret,
        _ => KeyKind::Pem,
    }
}

fn family(kind: KeyKind) -> [JwtAlgorithm; 3] {
    match kind {
        KeyKind::Secret => [
            JwtAlgorithm::HS256,
            JwtAlgorithm::HS384,
            JwtAlgorithm::HS512,
        ],
        KeyKind::Pem => [
            JwtAlgorithm::RS256,
            JwtAlgorithm::RS384,
            JwtAlgorithm::RS512,
        ],
    }
}

pub fn algorithm_for_level(level: Level, pem: bool) -> &'static str {
    let [low, middle, high] = family(if pem { KeyKind::Pem } else { KeyKind::Secret });
    algorithm_name(match level {
        Level::Basic | Level::Standard => low,
        Level::Strong => middle,
        Level::Cnsa => high,
    })
}

fn resolve_algorithm(options: &SignOptions, kind: KeyKind) -> CryptoResult<JwtAlgorithm> {
    let level = explicit_level(options.level.as_deref())?;
    let by_level = parse_algorithm(algorithm_for_level(
        level.unwrap_or(Level::Standard),
        kind == KeyKind::Pem,
    ))?;
    let Some(name) = options.algorithm.as_deref() else {
        return Ok(by_level);
    };
    let algorithm = parse_algorithm(name)?;
    if kind_of(algorithm) != kind {
        return Err(CryptoError::invalid_key(match kind {
            KeyKind::Secret => format!("{name} needs an RSA PEM key, not a secret."),
            KeyKind::Pem => format!("{name} needs a secret, not a PEM key."),
        }));
    }
    if level.is_some() && algorithm != by_level {
        return Err(CryptoError::unsupported(format!(
            "Algorithm {name} does not match level {}, which uses {}.",
            level.map(Level::name).unwrap_or_default(),
            algorithm_name(by_level)
        )));
    }
    Ok(algorithm)
}

fn check_secret(key: &str) -> CryptoResult<()> {
    if key.chars().count() < MIN_SECRET_LENGTH {
        return Err(CryptoError::invalid_key(format!(
            "Secret key must have at least {MIN_SECRET_LENGTH} characters."
        )));
    }
    Ok(())
}

fn parse_options<T: for<'de> Deserialize<'de> + Default>(json: &str) -> CryptoResult<T> {
    if json.is_empty() {
        return Ok(T::default());
    }
    serde_json::from_str(json)
        .map_err(|error| CryptoError::invalid_input(format!("Invalid JWT options: {error}.")))
}

pub fn sign(payload_json: &str, key: &str, options_json: &str, now: f64) -> CryptoResult<String> {
    let options: SignOptions = parse_options(options_json)?;
    let now = check_now(now)?;
    let kind = key_kind(key);
    let algorithm = resolve_algorithm(&options, kind)?;
    let Ok(Value::Object(mut claims)) = serde_json::from_str::<Value>(payload_json) else {
        return Err(CryptoError::invalid_input(
            "JWT payload must be a JSON object.",
        ));
    };
    claims.entry("iat").or_insert(Value::from(now));
    if let Some(expires_in) = options.expires_in {
        let expires_in = crate::clock::check_duration(expires_in, "expiresIn")?;
        let expires = now
            .checked_add(expires_in)
            .ok_or_else(|| CryptoError::invalid_input("expiresIn is too large."))?;
        claims.insert("exp".into(), Value::from(expires));
    }
    let optional = [
        ("iss", options.issuer.map(Value::String)),
        ("sub", options.subject.map(Value::String)),
        ("aud", options.audience),
    ];
    for (name, value) in optional {
        if let Some(value) = value {
            claims.insert(name.into(), value);
        }
    }
    let encoding_key = match kind {
        KeyKind::Secret => {
            check_secret(key)?;
            EncodingKey::from_secret(key.as_bytes())
        }
        KeyKind::Pem => {
            let private = parse_private(key)
                .map_err(|_| CryptoError::invalid_key("Invalid RSA private key PEM."))?;
            check_size(
                &rsa::RsaPublicKey::from(&private),
                explicit_level(options.level.as_deref())?,
            )?;
            EncodingKey::from_rsa_pem(key.as_bytes())
                .map_err(|_| CryptoError::invalid_key("Invalid RSA private key PEM."))?
        }
    };
    if options.require_expiration.unwrap_or(true) && !claims.contains_key("exp") {
        return Err(CryptoError::invalid_input(
            "A JWT needs an expiration: pass expiresIn, an exp claim or requireExpiration: false.",
        ));
    }
    jsonwebtoken::encode(
        &Header::new(algorithm),
        &Value::Object(claims),
        &encoding_key,
    )
    .map_err(|error| CryptoError::invalid_key(format!("JWT signing failed: {error}.")))
}

fn audience_matches(claim: Option<&Value>, expected: &str) -> bool {
    match claim {
        Some(Value::String(value)) => value == expected,
        Some(Value::Array(values)) => values.iter().any(|value| value == expected),
        _ => false,
    }
}

fn number_claim(claims: &Map<String, Value>, name: &str) -> CryptoResult<Option<f64>> {
    match claims.get(name) {
        None => Ok(None),
        Some(Value::Number(value)) => Ok(value.as_f64()),
        Some(_) => Err(CryptoError::malformed(format!(
            "Claim {name} must be a number of seconds."
        ))),
    }
}

fn check_claims(
    claims: &Map<String, Value>,
    options: &VerifyOptions,
    now: i64,
) -> CryptoResult<()> {
    let tolerance = options.clock_tolerance.unwrap_or(0.0);
    if !tolerance.is_finite() || tolerance < 0.0 {
        return Err(CryptoError::invalid_input(
            "Invalid JWT options: clockTolerance must be a positive number of seconds or 0.",
        ));
    }
    let now = now as f64;
    if let Some(not_before) = number_claim(claims, "nbf")?
        && not_before > now + tolerance
    {
        return Err(CryptoError::expired("JWT is not active yet."));
    }
    let expires = number_claim(claims, "exp")?;
    match expires {
        Some(expires) if now >= expires + tolerance => {
            return Err(CryptoError::expired("JWT expired."));
        }
        None if options.require_expiration.unwrap_or(true) => {
            return Err(CryptoError::malformed(
                "JWT has no exp claim; pass requireExpiration: false to accept it.",
            ));
        }
        _ => {}
    }
    if let Some(audience) = &options.audience
        && !audience_matches(claims.get("aud"), audience)
    {
        return Err(CryptoError::tampered(format!(
            "JWT audience does not include {audience}."
        )));
    }
    if let Some(issuer) = &options.issuer
        && claims.get("iss").and_then(Value::as_str) != Some(issuer.as_str())
    {
        return Err(CryptoError::tampered(format!(
            "JWT issuer is not {issuer}."
        )));
    }
    Ok(())
}

pub fn verify(token: &str, key: &str, options_json: &str, now: f64) -> CryptoResult<String> {
    let options: VerifyOptions = parse_options(options_json)?;
    let now = check_now(now)?;
    let kind = key_kind(key);
    let header =
        jsonwebtoken::decode_header(token).map_err(|_| CryptoError::malformed(INVALID_FORMAT))?;
    let allowed = match &options.algorithms {
        Some(names) => names
            .iter()
            .map(|name| parse_algorithm(name))
            .collect::<CryptoResult<Vec<_>>>()?,
        None => family(kind).to_vec(),
    };
    if !allowed.contains(&header.alg) || kind_of(header.alg) != kind {
        return Err(CryptoError::unsupported(
            "JWT algorithm is not allowed for this key or these options.",
        ));
    }
    let decoding_key = match kind {
        KeyKind::Secret => {
            check_secret(key)?;
            DecodingKey::from_secret(key.as_bytes())
        }
        KeyKind::Pem => {
            check_size(&parse_public(key)?, None)?;
            DecodingKey::from_rsa_pem(key.as_bytes())
                .map_err(|_| CryptoError::invalid_key(INVALID_PUBLIC_KEY))?
        }
    };
    let mut validation = Validation::new(header.alg);
    validation.validate_exp = false;
    validation.validate_nbf = false;
    validation.validate_aud = false;
    validation.required_spec_claims.clear();
    let data =
        jsonwebtoken::decode::<Value>(token, &decoding_key, &validation).map_err(|error| {
            match error.kind() {
                ErrorKind::InvalidSignature => {
                    CryptoError::tampered("JWT signature is invalid or the key is wrong.")
                }
                ErrorKind::InvalidRsaKey(_) | ErrorKind::InvalidKeyFormat => {
                    CryptoError::invalid_key(INVALID_PUBLIC_KEY)
                }
                _ => CryptoError::malformed(INVALID_FORMAT),
            }
        })?;
    let Value::Object(claims) = data.claims else {
        return Err(CryptoError::malformed(INVALID_FORMAT));
    };
    check_claims(&claims, &options, now)?;
    Ok(Value::Object(claims).to_string())
}

pub fn decode(token: &str) -> CryptoResult<String> {
    match jsonwebtoken::dangerous::insecure_decode::<Value>(token) {
        Ok(data) if data.claims.is_object() => Ok(data.claims.to_string()),
        _ => Err(CryptoError::malformed(INVALID_FORMAT)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::ErrorCode;
    use crate::rsa_keys::tests::{SMALL_KEY_ERROR, pair_2048, pair_4096, public_1024};
    use serde_json::json;

    const SECRET: &str = "supersecretkeysupersecretkey";
    const NOW: f64 = 1_736_590_949.0;
    const EXP: &str = r#"{"expiresIn":60}"#;
    const NO_EXP: &str = r#"{"requireExpiration":false}"#;

    fn claims(json: &str) -> Value {
        serde_json::from_str(json).unwrap()
    }

    #[test]
    fn signs_and_verifies_with_a_secret() {
        let token = sign(r#"{"id":"39fb","roles":["user"]}"#, SECRET, EXP, NOW).unwrap();
        assert!(token.starts_with("eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9."));
        let verified = claims(&verify(&token, SECRET, "", NOW).unwrap());
        assert_eq!(verified["id"], "39fb");
        assert_eq!(verified["iat"], 1_736_590_949);
    }

    #[test]
    fn explains_why_a_jwt_is_rejected() {
        let signed_with_another_secret = sign(
            r#"{"name":"Alice"}"#,
            "another-secret-of-16+",
            r#"{"expiresIn":60}"#,
            NOW,
        )
        .unwrap();
        assert_eq!(
            verify(&signed_with_another_secret, SECRET, "", NOW)
                .unwrap_err()
                .message,
            "JWT signature is invalid or the key is wrong."
        );
        assert_eq!(
            verify("eyJhbGciOiJIUzI1NiIsIajjA7PbDW9AkOaEykb0", SECRET, "", NOW)
                .unwrap_err()
                .message,
            "Invalid JWT format."
        );
        assert_eq!(
            claims(&decode(&signed_with_another_secret).unwrap())["name"],
            "Alice"
        );
        assert_eq!(
            decode("eyJhbGciOiJIUzI1ajjA7PbDW9AkOaEykb0")
                .unwrap_err()
                .message,
            "Invalid JWT format."
        );
    }

    #[test]
    fn expires_and_honours_options() {
        let options = r#"{"expiresIn":60,"issuer":"archi","subject":"user-7","audience":"web"}"#;
        let token = sign(r#"{"id":7}"#, SECRET, options, NOW).unwrap();
        let verified = claims(
            &verify(
                &token,
                SECRET,
                r#"{"issuer":"archi","audience":"web"}"#,
                NOW,
            )
            .unwrap(),
        );
        assert_eq!(verified["sub"], "user-7");
        assert_eq!(verified["exp"], NOW as i64 + 60);
        let expired = verify(&token, SECRET, "", NOW + 60.0).unwrap_err();
        assert_eq!(
            (expired.code, expired.message.as_str()),
            (ErrorCode::Expired, "JWT expired.")
        );
        assert!(verify(&token, SECRET, r#"{"clockTolerance":5}"#, NOW + 61.0).is_ok());
        assert_eq!(
            verify(&token, SECRET, r#"{"ignoreExpiration":true}"#, NOW + 999.0)
                .unwrap_err()
                .code,
            ErrorCode::InvalidInput
        );
        assert_eq!(
            verify(&token, SECRET, r#"{"issuer":"other"}"#, NOW)
                .unwrap_err()
                .message,
            "JWT issuer is not other."
        );
        assert_eq!(
            verify(&token, SECRET, r#"{"audience":"api"}"#, NOW)
                .unwrap_err()
                .message,
            "JWT audience does not include api."
        );
        let many = sign(
            r#"{"id":7}"#,
            SECRET,
            r#"{"audience":["web","api"],"expiresIn":60}"#,
            NOW,
        )
        .unwrap();
        assert!(verify(&many, SECRET, r#"{"audience":"api"}"#, NOW).is_ok());
    }

    #[test]
    fn checks_not_before_and_claim_types() {
        let early = sign(&json!({"nbf": NOW + 100.0}).to_string(), SECRET, EXP, NOW).unwrap();
        assert_eq!(
            verify(&early, SECRET, "", NOW).unwrap_err().message,
            "JWT is not active yet."
        );
        let bad_exp = sign(r#"{"exp":"tomorrow"}"#, SECRET, "", NOW).unwrap();
        assert_eq!(
            verify(&bad_exp, SECRET, "", NOW).unwrap_err().message,
            "Claim exp must be a number of seconds."
        );
    }

    #[test]
    fn requires_an_expiration_unless_told_otherwise() {
        assert_eq!(
            sign(r#"{"id":7}"#, SECRET, "", NOW).unwrap_err().message,
            "A JWT needs an expiration: pass expiresIn, an exp claim or requireExpiration: false."
        );
        let with_claim = sign(&json!({"exp": NOW + 10.0}).to_string(), SECRET, "", NOW).unwrap();
        assert!(verify(&with_claim, SECRET, "", NOW).is_ok());
        let forever = sign(r#"{"id":7}"#, SECRET, NO_EXP, NOW).unwrap();
        let missing = verify(&forever, SECRET, "", NOW).unwrap_err();
        assert_eq!(
            (missing.code, missing.message.as_str()),
            (
                ErrorCode::Malformed,
                "JWT has no exp claim; pass requireExpiration: false to accept it."
            )
        );
        assert!(verify(&forever, SECRET, NO_EXP, NOW).is_ok());
    }

    #[test]
    fn rejects_a_negative_clock_tolerance() {
        let token = sign("{}", SECRET, EXP, NOW).unwrap();
        assert_eq!(
            verify(&token, SECRET, r#"{"clockTolerance":-5}"#, NOW)
                .unwrap_err()
                .message,
            "Invalid JWT options: clockTolerance must be a positive number of seconds or 0."
        );
        assert!(verify(&token, SECRET, r#"{"clockTolerance":0}"#, NOW).is_ok());
    }

    #[test]
    fn picks_the_algorithm_of_the_level_and_key() {
        let cases = [
            ("basic", "HS256"),
            ("standard", "HS256"),
            ("strong", "HS384"),
            ("cnsa", "HS512"),
        ];
        for (level, alg) in cases {
            let options = json!({ "level": level, "expiresIn": 60 }).to_string();
            let token = sign("{}", SECRET, &options, NOW).unwrap();
            assert_eq!(
                jsonwebtoken::decode_header(&token).unwrap().alg,
                parse_algorithm(alg).unwrap()
            );
        }
        assert_eq!(algorithm_for_level(Level::Cnsa, true), "RS512");
        assert_eq!(algorithm_for_level(Level::Strong, true), "RS384");
        assert!(
            sign(
                "{}",
                SECRET,
                r#"{"level":"basic","algorithm":"HS512"}"#,
                NOW
            )
            .is_err()
        );
        assert!(
            sign(
                "{}",
                SECRET,
                r#"{"level":"strong","algorithm":"HS384","expiresIn":60}"#,
                NOW
            )
            .is_ok()
        );
    }

    #[test]
    fn signs_and_verifies_with_rsa_keys() {
        let pair = pair_2048();
        let token = sign(
            r#"{"id":7}"#,
            &pair.private_key,
            r#"{"algorithm":"RS256","expiresIn":60}"#,
            NOW,
        )
        .unwrap();
        assert_eq!(
            claims(&verify(&token, &pair.public_key, "", NOW).unwrap())["id"],
            7
        );
        let other = crate::rsa_keys::generate(Some("basic"), None).unwrap();
        assert_eq!(
            verify(&token, &other.public_key, "", NOW)
                .unwrap_err()
                .message,
            "JWT signature is invalid or the key is wrong."
        );
        assert_eq!(
            verify(&token, SECRET, "", NOW).unwrap_err().message,
            "JWT algorithm is not allowed for this key or these options."
        );
        assert_eq!(
            verify(&token, &pair.public_key, r#"{"algorithms":["RS512"]}"#, NOW)
                .unwrap_err()
                .message,
            "JWT algorithm is not allowed for this key or these options."
        );
        assert_eq!(
            verify(
                &token,
                "-----BEGIN PUBLIC KEY-----\nnope\n-----END PUBLIC KEY-----",
                "",
                NOW
            )
            .unwrap_err()
            .code,
            ErrorCode::InvalidKey
        );
        assert_eq!(
            sign(
                "{}",
                &pair.private_key,
                r#"{"level":"cnsa","expiresIn":60}"#,
                NOW,
            )
            .unwrap_err()
            .message,
            "RSA key of 2048 bits is below the 4096 bits required by level cnsa."
        );
        let rs512 = sign(
            "{}",
            &pair_4096().private_key,
            r#"{"level":"cnsa","expiresIn":60}"#,
            NOW,
        )
        .unwrap();
        assert_eq!(
            jsonwebtoken::decode_header(&rs512).unwrap().alg,
            JwtAlgorithm::RS512
        );
        assert!(sign("{}", "-----BEGIN PRIVATE KEY-----\nnope", "", NOW).is_err());
        assert_eq!(
            verify(&token, public_1024(), "", NOW).unwrap_err().message,
            SMALL_KEY_ERROR
        );
    }

    #[test]
    fn rejects_bad_keys_payloads_and_options() {
        assert_eq!(
            sign("{}", "short", "", NOW).unwrap_err().message,
            "Secret key must have at least 16 characters."
        );
        assert!(sign("{}", SECRET, r#"{"algorithm":"RS256"}"#, NOW).is_err());
        assert!(
            sign(
                "{}",
                &pair_2048().private_key,
                r#"{"algorithm":"HS256"}"#,
                NOW
            )
            .is_err()
        );
        assert!(sign("{}", SECRET, r#"{"algorithm":"none"}"#, NOW).is_err());
        assert!(sign("[1]", SECRET, "", NOW).is_err());
        assert!(sign("{}", SECRET, r#"{"unknown":1}"#, NOW).is_err());
        assert!(sign("{}", SECRET, r#"{"expiresIn":0}"#, NOW).is_err());
        assert!(verify("a.b.c", SECRET, r#"{"algorithms":["none"]}"#, NOW).is_err());
        let signed_with_short = jsonwebtoken::encode(
            &Header::new(JwtAlgorithm::HS256),
            &json!({ "exp": NOW + 60.0 }),
            &EncodingKey::from_secret(b"short"),
        )
        .unwrap();
        assert_eq!(
            verify(&signed_with_short, "short", "", NOW)
                .unwrap_err()
                .message,
            "Secret key must have at least 16 characters."
        );
        assert_eq!(
            sign(
                "{}",
                SECRET,
                &format!(r#"{{"expiresIn":{}}}"#, i64::MAX),
                NOW
            )
            .unwrap_err()
            .message,
            "expiresIn is too large."
        );
        let array_payload = jsonwebtoken::encode(
            &Header::new(JwtAlgorithm::HS256),
            &json!([1]),
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();
        assert_eq!(
            verify(&array_payload, SECRET, "", NOW).unwrap_err().message,
            "Invalid JWT format."
        );
        assert!(decode(&array_payload).is_err());
    }
}
