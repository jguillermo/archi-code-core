use wasm_bindgen::prelude::*;

use crate::error::CryptoResult;
use crate::{catalog, cipher, hash, jwt, password, rsa_cipher, rsa_keys, signature, token};

fn js<T>(result: CryptoResult<T>) -> Result<T, JsValue> {
    result.map_err(|error| JsValue::from_str(&error.encoded()))
}

fn json<T: serde::Serialize>(value: &T) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| unreachable!("plain data always serializes"))
}

#[wasm_bindgen(js_name = securityLevels)]
pub fn security_levels() -> String {
    catalog::security_levels()
}

#[wasm_bindgen(js_name = passwordHash)]
pub fn password_hash(
    password: &str,
    level: Option<String>,
    algorithm: Option<String>,
    cost: Option<u32>,
) -> Result<String, JsValue> {
    js(password::hash(
        password,
        level.as_deref(),
        algorithm.as_deref(),
        cost,
    ))
}

#[wasm_bindgen(js_name = passwordVerify)]
pub fn password_verify(password: &str, hash: &str) -> bool {
    password::verify(password, hash)
}

#[wasm_bindgen(js_name = passwordIsHash)]
pub fn password_is_hash(value: &str) -> bool {
    password::is_hash(value)
}

#[wasm_bindgen(js_name = passwordParams)]
pub fn password_params(
    level: Option<String>,
    algorithm: Option<String>,
    cost: Option<u32>,
) -> Result<String, JsValue> {
    js(password::params(level.as_deref(), algorithm.as_deref(), cost).map(|params| json(&params)))
}

#[wasm_bindgen(js_name = cipherGenerateKey)]
pub fn cipher_generate_key(
    level: Option<String>,
    algorithm: Option<String>,
) -> Result<String, JsValue> {
    js(cipher::generate_key(level.as_deref(), algorithm.as_deref()))
}

#[wasm_bindgen(js_name = cipherEncrypt)]
pub fn cipher_encrypt(
    data: &[u8],
    key: &str,
    level: Option<String>,
    algorithm: Option<String>,
    password: Option<bool>,
) -> Result<String, JsValue> {
    js(cipher::encrypt(
        data,
        key,
        level.as_deref(),
        algorithm.as_deref(),
        password.unwrap_or(false),
    ))
}

#[wasm_bindgen(js_name = cipherDecrypt)]
pub fn cipher_decrypt(text: &str, key: &str, algorithm: Option<String>) -> Result<String, JsValue> {
    js(cipher::decrypt(text, key, algorithm.as_deref()))
}

#[wasm_bindgen(js_name = cipherDecryptBytes)]
pub fn cipher_decrypt_bytes(
    text: &str,
    key: &str,
    algorithm: Option<String>,
) -> Result<Vec<u8>, JsValue> {
    js(cipher::decrypt_bytes(text, key, algorithm.as_deref()))
}

#[wasm_bindgen(js_name = tokenGenerateKey)]
pub fn token_generate_key() -> Result<String, JsValue> {
    js(token::generate_key())
}

#[wasm_bindgen(js_name = tokenEncrypt)]
pub fn token_encrypt(
    payload_json: &str,
    key: &str,
    level: Option<String>,
    algorithm: Option<String>,
    now: f64,
    expires_in: Option<f64>,
    require_expiration: Option<bool>,
) -> Result<String, JsValue> {
    js(token::encrypt(
        payload_json,
        key,
        level.as_deref(),
        algorithm.as_deref(),
        now,
        expires_in,
        require_expiration.unwrap_or(true),
    ))
}

#[wasm_bindgen(js_name = tokenDecrypt)]
pub fn token_decrypt(
    token: &str,
    key: &str,
    now: f64,
    require_expiration: Option<bool>,
) -> Result<String, JsValue> {
    js(token::decrypt(
        token,
        key,
        now,
        require_expiration.unwrap_or(true),
    ))
}

#[wasm_bindgen(js_name = rsaGenerateKeyPair)]
pub fn rsa_generate_key_pair(level: Option<String>, bits: Option<u32>) -> Result<String, JsValue> {
    js(rsa_keys::generate(level.as_deref(), bits).map(|pair| json(&pair)))
}

#[wasm_bindgen(js_name = rsaEncrypt)]
pub fn rsa_encrypt(
    data: &[u8],
    public_key: &str,
    level: Option<String>,
    algorithm: Option<String>,
) -> Result<String, JsValue> {
    js(rsa_cipher::encrypt(
        data,
        public_key,
        level.as_deref(),
        algorithm.as_deref(),
    ))
}

#[wasm_bindgen(js_name = rsaDecrypt)]
pub fn rsa_decrypt(token: &str, private_key: &str) -> Result<String, JsValue> {
    js(rsa_cipher::decrypt(token, private_key))
}

#[wasm_bindgen(js_name = rsaDecryptBytes)]
pub fn rsa_decrypt_bytes(token: &str, private_key: &str) -> Result<Vec<u8>, JsValue> {
    js(rsa_cipher::decrypt_bytes(token, private_key))
}

#[wasm_bindgen(js_name = signatureSign)]
pub fn signature_sign(
    data: &[u8],
    private_key: &str,
    level: Option<String>,
    algorithm: Option<String>,
) -> Result<String, JsValue> {
    js(signature::sign(
        data,
        private_key,
        level.as_deref(),
        algorithm.as_deref(),
    ))
}

#[wasm_bindgen(js_name = signatureVerify)]
pub fn signature_verify(data: &[u8], signature: &str, public_key: &str) -> Result<bool, JsValue> {
    js(signature::verify(data, signature, public_key))
}

#[wasm_bindgen(js_name = hashDigest)]
pub fn hash_digest(
    data: &[u8],
    level: Option<String>,
    algorithm: Option<String>,
) -> Result<String, JsValue> {
    js(hash::digest(data, level.as_deref(), algorithm.as_deref()))
}

#[wasm_bindgen(js_name = hashHmac)]
pub fn hash_hmac(
    data: &[u8],
    key: &str,
    level: Option<String>,
    algorithm: Option<String>,
) -> Result<String, JsValue> {
    js(hash::hmac(
        data,
        key,
        level.as_deref(),
        algorithm.as_deref(),
    ))
}

#[wasm_bindgen(js_name = jwtSign)]
pub fn jwt_sign(
    payload_json: &str,
    key: &str,
    options_json: &str,
    now: f64,
) -> Result<String, JsValue> {
    js(jwt::sign(payload_json, key, options_json, now))
}

#[wasm_bindgen(js_name = jwtVerify)]
pub fn jwt_verify(token: &str, key: &str, options_json: &str, now: f64) -> Result<String, JsValue> {
    js(jwt::verify(token, key, options_json, now))
}

#[wasm_bindgen(js_name = jwtDecode)]
pub fn jwt_decode(token: &str) -> Result<String, JsValue> {
    js(jwt::decode(token))
}
