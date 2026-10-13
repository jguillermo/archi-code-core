use jsonwebtoken::errors::ErrorKind;
use jsonwebtoken::{Algorithm as JwtAlgorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::Deserialize;
use serde_json::{Map, Value};

use crate::clock::check_now;
use crate::error::{CryptoError, CryptoResult};
use crate::level::{Level, explicit_level};

const MIN_SECRET_LENGTH: usize = 16;

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
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VerifyOptions {
    algorithms: Option<Vec<String>>,
    issuer: Option<String>,
    audience: Option<String>,
    clock_tolerance: Option<f64>,
    ignore_expiration: Option<bool>,
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
        claims.insert("exp".into(), Value::from(now + expires_in));
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
        KeyKind::Pem => EncodingKey::from_rsa_pem(key.as_bytes())
            .map_err(|_| CryptoError::invalid_key("Invalid RSA private key PEM."))?,
    };
    jsonwebtoken::encode(
        &Header::new(algorithm),
        &Value::Object(claims),
        &encoding_key,
    )
    .map_err(|error| CryptoError::invalid_key(format!("JWT signing failed: {error}.")))
}

fn verify_error(code: fn(String) -> CryptoError, message: &str) -> CryptoError {
    code(format!("verify Error: {message}"))
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
        Some(_) => Err(verify_error(
            CryptoError::malformed,
            &format!("invalid {name} value"),
        )),
    }
}

fn check_claims(
    claims: &Map<String, Value>,
    options: &VerifyOptions,
    now: i64,
) -> CryptoResult<()> {
    let tolerance = options.clock_tolerance.unwrap_or(0.0);
    let now = now as f64;
    if let Some(not_before) = number_claim(claims, "nbf")?
        && not_before > now + tolerance
    {
        return Err(verify_error(CryptoError::expired, "jwt not active"));
    }
    if !options.ignore_expiration.unwrap_or(false)
        && let Some(expires) = number_claim(claims, "exp")?
        && now >= expires + tolerance
    {
        return Err(verify_error(CryptoError::expired, "jwt expired"));
    }
    if let Some(audience) = &options.audience
        && !audience_matches(claims.get("aud"), audience)
    {
        return Err(verify_error(
            CryptoError::tampered,
            &format!("jwt audience invalid. expected: {audience}"),
        ));
    }
    if let Some(issuer) = &options.issuer
        && claims.get("iss").and_then(Value::as_str) != Some(issuer.as_str())
    {
        return Err(verify_error(
            CryptoError::tampered,
            &format!("jwt issuer invalid. expected: {issuer}"),
        ));
    }
    Ok(())
}

pub fn verify(token: &str, key: &str, options_json: &str, now: f64) -> CryptoResult<String> {
    let options: VerifyOptions = parse_options(options_json)?;
    let now = check_now(now)?;
    let kind = key_kind(key);
    let header = jsonwebtoken::decode_header(token)
        .map_err(|_| verify_error(CryptoError::malformed, "jwt malformed"))?;
    let allowed = match &options.algorithms {
        Some(names) => names
            .iter()
            .map(|name| parse_algorithm(name))
            .collect::<CryptoResult<Vec<_>>>()?,
        None => family(kind).to_vec(),
    };
    if !allowed.contains(&header.alg) || kind_of(header.alg) != kind {
        return Err(verify_error(CryptoError::unsupported, "invalid algorithm"));
    }
    let decoding_key = match kind {
        KeyKind::Secret => DecodingKey::from_secret(key.as_bytes()),
        KeyKind::Pem => DecodingKey::from_rsa_pem(key.as_bytes())
            .map_err(|_| verify_error(CryptoError::invalid_key, "invalid key"))?,
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
                    verify_error(CryptoError::tampered, "invalid signature")
                }
                ErrorKind::InvalidRsaKey(_) | ErrorKind::InvalidKeyFormat => {
                    verify_error(CryptoError::invalid_key, "invalid key")
                }
                _ => verify_error(CryptoError::malformed, "jwt malformed"),
            }
        })?;
    let Value::Object(claims) = data.claims else {
        return Err(verify_error(CryptoError::malformed, "jwt malformed"));
    };
    check_claims(&claims, &options, now)?;
    Ok(Value::Object(claims).to_string())
}

pub fn decode(token: &str) -> String {
    match jsonwebtoken::dangerous::insecure_decode::<Value>(token) {
        Ok(data) if data.claims.is_object() => data.claims.to_string(),
        _ => "{}".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::ErrorCode;
    use crate::rsa_keys::tests::pair_2048;
    use serde_json::json;

    const SECRET: &str = "supersecretkeysupersecretkey";
    const NOW: f64 = 1_736_590_949.0;

    fn claims(json: &str) -> Value {
        serde_json::from_str(json).unwrap()
    }

    #[test]
    fn signs_and_verifies_with_a_secret() {
        let token = sign(r#"{"id":"39fb","roles":["user"]}"#, SECRET, "", NOW).unwrap();
        assert!(token.starts_with("eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9."));
        let verified = claims(&verify(&token, SECRET, "", NOW).unwrap());
        assert_eq!(verified["id"], "39fb");
        assert_eq!(verified["iat"], 1_736_590_949);
    }

    #[test]
    fn verifies_tokens_signed_by_the_javascript_library() {
        let fixtures: Value =
            serde_json::from_str(include_str!("../../test/fixtures/legacy.json")).unwrap();
        let secret = fixtures["jwt"]["secret"].as_str().unwrap();
        let token = fixtures["jwt"]["token"].as_str().unwrap();
        assert_eq!(
            claims(&verify(token, secret, "", NOW).unwrap())["name"],
            "Alice"
        );
    }

    #[test]
    fn keeps_the_javascript_error_messages() {
        let foreign = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjM5ZmI4NDYzLThjMjktNDQzNC1hNWQ2LTA3Yjk2NGIzNmFkOSIsInJvbGVzIjpbInVzZXIiXSwibmFtZSI6IkFsaWNlIiwiaWF0IjoxNzM2NTkwOTQ5fQ.sqVH29NXG3LaxwIDfaVg8HwcajjA7PbDW9AkOaEykb0";
        assert_eq!(
            verify(foreign, SECRET, "", NOW).unwrap_err().message,
            "verify Error: invalid signature"
        );
        assert_eq!(
            verify("eyJhbGciOiJIUzI1NiIsIajjA7PbDW9AkOaEykb0", SECRET, "", NOW)
                .unwrap_err()
                .message,
            "verify Error: jwt malformed"
        );
        assert_eq!(claims(&decode(foreign))["name"], "Alice");
        assert_eq!(decode("eyJhbGciOiJIUzI1ajjA7PbDW9AkOaEykb0"), "{}");
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
            (ErrorCode::Expired, "verify Error: jwt expired")
        );
        assert!(verify(&token, SECRET, r#"{"clockTolerance":5}"#, NOW + 61.0).is_ok());
        assert!(verify(&token, SECRET, r#"{"ignoreExpiration":true}"#, NOW + 999.0).is_ok());
        assert_eq!(
            verify(&token, SECRET, r#"{"issuer":"other"}"#, NOW)
                .unwrap_err()
                .message,
            "verify Error: jwt issuer invalid. expected: other"
        );
        assert_eq!(
            verify(&token, SECRET, r#"{"audience":"api"}"#, NOW)
                .unwrap_err()
                .message,
            "verify Error: jwt audience invalid. expected: api"
        );
        let many = sign(r#"{"id":7}"#, SECRET, r#"{"audience":["web","api"]}"#, NOW).unwrap();
        assert!(verify(&many, SECRET, r#"{"audience":"api"}"#, NOW).is_ok());
    }

    #[test]
    fn checks_not_before_and_claim_types() {
        let early = sign(&json!({"nbf": NOW + 100.0}).to_string(), SECRET, "", NOW).unwrap();
        assert_eq!(
            verify(&early, SECRET, "", NOW).unwrap_err().message,
            "verify Error: jwt not active"
        );
        let bad_exp = sign(r#"{"exp":"tomorrow"}"#, SECRET, "", NOW).unwrap();
        assert_eq!(
            verify(&bad_exp, SECRET, "", NOW).unwrap_err().message,
            "verify Error: invalid exp value"
        );
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
            let token = sign("{}", SECRET, &json!({ "level": level }).to_string(), NOW).unwrap();
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
                r#"{"level":"strong","algorithm":"HS384"}"#,
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
            r#"{"algorithm":"RS256"}"#,
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
            "verify Error: invalid signature"
        );
        assert_eq!(
            verify(&token, SECRET, "", NOW).unwrap_err().message,
            "verify Error: invalid algorithm"
        );
        assert_eq!(
            verify(&token, &pair.public_key, r#"{"algorithms":["RS512"]}"#, NOW)
                .unwrap_err()
                .message,
            "verify Error: invalid algorithm"
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
        let rs512 = sign("{}", &pair.private_key, r#"{"level":"cnsa"}"#, NOW).unwrap();
        assert_eq!(
            jsonwebtoken::decode_header(&rs512).unwrap().alg,
            JwtAlgorithm::RS512
        );
        assert!(sign("{}", "-----BEGIN PRIVATE KEY-----\nnope", "", NOW).is_err());
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
        let array_payload = jsonwebtoken::encode(
            &Header::new(JwtAlgorithm::HS256),
            &json!([1]),
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();
        assert_eq!(
            verify(&array_payload, SECRET, "", NOW).unwrap_err().message,
            "verify Error: jwt malformed"
        );
        assert_eq!(decode(&array_payload), "{}");
    }
}
