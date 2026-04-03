//! Type coercion functions — convert values to a target primitive or throw on failure.
//!
//! Naming convention: cast_{target}_{source}
//!   cast_bool       — string → bool
//!   cast_bool_num   — number → bool
//!   cast_integer    — string → integer
//!   cast_integer_num — number → integer
//!   cast_num_bool   — bool → number
//!   cast_float      — string → float
//!   cast_float_num  — number → float
//!   cast_str_num    — number → string
//!   cast_str_bool   — bool → string
//!   cast_date       — string → timestamp (ms)
//!   cast_date_num   — number → timestamp (ms)
//!   cast_json       — string → void (validates only)

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

// ─── bool ─────────────────────────────────────────────────────────────────────

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn cast_bool(value: &str) -> Result<bool, JsValue> {
    match value.trim().to_lowercase().as_str() {
        "true" | "1" | "yes" | "on" => Ok(true),
        "false" | "0" | "no" | "off" => Ok(false),
        _ => Err(JsValue::from_str(&format!("Cannot convert {:?} to boolean", value))),
    }
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn cast_bool_num(value: f64) -> Result<bool, JsValue> {
    if value == 1.0 {
        Ok(true)
    } else if value == 0.0 {
        Ok(false)
    } else {
        Err(JsValue::from_str(&format!("Cannot convert {} to boolean: only 0 and 1 are valid", value)))
    }
}

// ─── integer ──────────────────────────────────────────────────────────────────

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn cast_integer(value: &str) -> Result<f64, JsValue> {
    let s = value.trim();
    if s.is_empty() {
        return Err(JsValue::from_str("Cannot convert empty string to integer"));
    }
    s.parse::<i64>()
        .map(|n| n as f64)
        .map_err(|_| JsValue::from_str(&format!("Cannot convert {:?} to integer", value)))
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn cast_integer_num(value: f64) -> Result<f64, JsValue> {
    if !value.is_finite() {
        return Err(JsValue::from_str(&format!("Cannot convert {} to integer", value)));
    }
    if value.fract() != 0.0 {
        return Err(JsValue::from_str(&format!("Cannot convert {} to integer: has fractional part", value)));
    }
    Ok(value)
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn cast_num_bool(value: bool) -> f64 {
    if value { 1.0 } else { 0.0 }
}

// ─── float ────────────────────────────────────────────────────────────────────

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn cast_float(value: &str) -> Result<f64, JsValue> {
    let s = value.trim();
    if s.is_empty() {
        return Err(JsValue::from_str("Cannot convert empty string to float"));
    }
    s.parse::<f64>()
        .map_err(|_| JsValue::from_str(&format!("Cannot convert {:?} to float", value)))
        .and_then(|n| {
            if n.is_finite() {
                Ok(n)
            } else {
                Err(JsValue::from_str(&format!("Cannot convert {:?} to float: not finite", value)))
            }
        })
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn cast_float_num(value: f64) -> Result<f64, JsValue> {
    if value.is_finite() {
        Ok(value)
    } else {
        Err(JsValue::from_str(&format!("Cannot convert {} to float", value)))
    }
}

// ─── string ───────────────────────────────────────────────────────────────────

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn cast_str_num(value: f64) -> Result<String, JsValue> {
    if !value.is_finite() {
        return Err(JsValue::from_str(&format!("Cannot convert {} to string", value)));
    }
    if value == 0.0 { Ok("0".to_string()) } else { Ok(value.to_string()) }
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn cast_str_bool(value: bool) -> String {
    if value { "true".to_string() } else { "false".to_string() }
}

// ─── date ─────────────────────────────────────────────────────────────────────

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn cast_date(value: &str) -> Result<f64, JsValue> {
    use chrono::{DateTime, NaiveDate};
    let s = value.trim();
    if let Ok(d) = NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        if let Some(dt) = d.and_hms_opt(0, 0, 0) {
            return Ok(dt.and_utc().timestamp_millis() as f64);
        }
    }
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return Ok(dt.timestamp_millis() as f64);
    }
    if let Ok(dt) = DateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.f%z") {
        return Ok(dt.timestamp_millis() as f64);
    }
    Err(JsValue::from_str(&format!("Cannot convert {:?} to date", value)))
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn cast_date_num(value: f64) -> Result<f64, JsValue> {
    if value.is_finite() {
        Ok(value)
    } else {
        Err(JsValue::from_str(&format!("Cannot convert {} to date: invalid timestamp", value)))
    }
}

// ─── json ─────────────────────────────────────────────────────────────────────

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn cast_json(value: &str) -> Result<(), JsValue> {
    serde_json::from_str::<serde_json::Value>(value)
        .map(|_| ())
        .map_err(|e| JsValue::from_str(&format!("Invalid JSON: {}", e)))
}
