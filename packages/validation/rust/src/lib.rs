//! archi_validation — WebAssembly validation library
//!
//! Validation API:
//!   run_flat(data)                → 1 if all pass, 0 if any fail
//!   run_flat_codes(data)          → [ok, f0_count, f0_code0, ..., f1_count, ...]
//!   run_split(schema, values)     → same as run_flat_codes but schema is cached separately
//!
//! Flat binary format (little-endian):
//!   [num_fields: u16]
//!   For each field:
//!     [type: u8]  0=null 1=bool_false 2=bool_true 3=num 4=str
//!     if 3: [f64: 8B]
//!     if 4: [len: u16][utf8...]
//!     [num_rules: u8]
//!     For each rule:
//!       [code: u8][param_type: u8]
//!       if 1: [f64: 8B]
//!       if 2: [f64: 8B][f64: 8B]
//!       if 3: [len: u16][utf8...]
//!
//! Split format — schema buffer (built once, cached):
//!   [num_fields: u16]
//!   For each field:
//!     [num_rules: u8]
//!     For each rule:
//!       [code: u8][param_type: u8]
//!       if 1: [f64: 8B]
//!       if 2: [f64: 8B][f64: 8B]
//!       if 3: [len: u16][utf8...]
//!
//! Split format — values buffer (built per call):
//!   For each field (same order as schema):
//!     [type: u8]  0=null 1=bool_false 2=bool_true 3=num 4=str
//!     if 3: [f64: 8B]
//!     if 4: [len: u16][utf8...]

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg_attr(not(feature = "wasm"), allow(dead_code))]
mod messages;
#[cfg_attr(not(feature = "wasm"), allow(dead_code))]
mod orchestrator;
mod validators;

// ─── WASM setup ──────────────────────────────────────────────────────────────

#[cfg(feature = "wasm")]
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// ─── Native value types ───────────────────────────────────────────────────────

pub enum FieldValue {
    Str(String),
    Num(f64),
    Bool(bool),
    Null,
}

pub enum Param {
    Num(f64),
    Str(String),
}

// ─── Binary batch validation — single boundary crossing ───────────────────────

macro_rules! flat_parse_setup {
    ($data:ident, $pos:ident) => {
        macro_rules! need {
            ($n:expr) => {
                if $pos + $n > $data.len() {
                    return Default::default();
                }
            };
        }
        macro_rules! rd_u8 {
            () => {{
                need!(1);
                let v = $data[$pos];
                $pos += 1;
                v
            }};
        }
        macro_rules! rd_u16 {
            () => {{
                need!(2);
                let v = u16::from_le_bytes([$data[$pos], $data[$pos + 1]]);
                $pos += 2;
                v
            }};
        }
        macro_rules! rd_f64 {
            () => {{
                need!(8);
                let v = f64::from_le_bytes($data[$pos..$pos + 8].try_into().unwrap());
                $pos += 8;
                v
            }};
        }
    };
}

/// Run all validations from a pre-encoded binary payload.
/// Returns 1 if every rule passes, 0 if any fail.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn run_flat(data: &[u8]) -> u8 {
    let mut pos = 0usize;
    let mut ok = true;
    flat_parse_setup!(data, pos);

    let num_fields = rd_u16!() as usize;

    for _ in 0..num_fields {
        let field_type = rd_u8!();
        let field_value = match field_type {
            0 => FieldValue::Null,
            1 => FieldValue::Bool(false),
            2 => FieldValue::Bool(true),
            3 => FieldValue::Num(rd_f64!()),
            4 => {
                let slen = rd_u16!() as usize;
                need!(slen);
                let s = std::str::from_utf8(&data[pos..pos + slen]).unwrap_or("");
                pos += slen;
                FieldValue::Str(s.to_string())
            }
            _ => FieldValue::Null,
        };

        let num_rules = rd_u8!() as usize;

        for _ in 0..num_rules {
            let code = rd_u8!() as u32;
            let param_type = rd_u8!();
            let passed = match param_type {
                0 => orchestrator::dispatch_by_code(code, &field_value, &[]),
                1 => {
                    let p0 = rd_f64!();
                    orchestrator::dispatch_by_code(code, &field_value, &[Param::Num(p0)])
                }
                2 => {
                    let p0 = rd_f64!();
                    let p1 = rd_f64!();
                    orchestrator::dispatch_by_code(code, &field_value, &[Param::Num(p0), Param::Num(p1)])
                }
                3 => {
                    let plen = rd_u16!() as usize;
                    need!(plen);
                    let p_str = std::str::from_utf8(&data[pos..pos + plen]).unwrap_or("").to_string();
                    pos += plen;
                    orchestrator::dispatch_by_code(code, &field_value, &[Param::Str(p_str)])
                }
                _ => true,
            };
            if !passed {
                ok = false;
            }
        }
    }

    ok as u8
}

/// Run all validations and return per-field failing rule codes in a single crossing.
///
/// Format: `[ok_byte, f0_count, f0_code0, f0_code1, …, f1_count, …]`
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn run_flat_codes(data: &[u8]) -> Vec<u8> {
    let mut pos = 0usize;
    flat_parse_setup!(data, pos);

    let num_fields = rd_u16!() as usize;
    let mut field_codes: Vec<Vec<u8>> = Vec::with_capacity(num_fields);

    for _ in 0..num_fields {
        let field_type = rd_u8!();
        let field_value = match field_type {
            0 => FieldValue::Null,
            1 => FieldValue::Bool(false),
            2 => FieldValue::Bool(true),
            3 => FieldValue::Num(rd_f64!()),
            4 => {
                let slen = rd_u16!() as usize;
                need!(slen);
                let s = std::str::from_utf8(&data[pos..pos + slen]).unwrap_or("");
                pos += slen;
                FieldValue::Str(s.to_string())
            }
            _ => FieldValue::Null,
        };

        let num_rules = rd_u8!() as usize;
        let mut failing: Vec<u8> = Vec::new();

        for _ in 0..num_rules {
            let code = rd_u8!() as u32;
            let param_type = rd_u8!();
            let passed = match param_type {
                0 => orchestrator::dispatch_by_code(code, &field_value, &[]),
                1 => {
                    let p0 = rd_f64!();
                    orchestrator::dispatch_by_code(code, &field_value, &[Param::Num(p0)])
                }
                2 => {
                    let p0 = rd_f64!();
                    let p1 = rd_f64!();
                    orchestrator::dispatch_by_code(code, &field_value, &[Param::Num(p0), Param::Num(p1)])
                }
                3 => {
                    let plen = rd_u16!() as usize;
                    need!(plen);
                    let p_str = std::str::from_utf8(&data[pos..pos + plen]).unwrap_or("").to_string();
                    pos += plen;
                    orchestrator::dispatch_by_code(code, &field_value, &[Param::Str(p_str)])
                }
                _ => true,
            };
            if !passed {
                failing.push(code as u8);
            }
        }

        field_codes.push(failing);
    }

    let all_ok = field_codes.iter().all(|c| c.is_empty());
    let total: usize = field_codes.iter().map(|c| c.len()).sum();
    let mut buf = Vec::with_capacity(1 + num_fields + total);
    buf.push(all_ok as u8);
    for codes in &field_codes {
        buf.push(codes.len().min(255) as u8);
        buf.extend_from_slice(codes);
    }
    buf
}

/// Run validations from a pre-compiled schema buffer + a per-call values buffer.
///
/// Schema is built once and cached in JS; values are encoded on each call.
/// Returns the same format as run_flat_codes: `[ok_byte, f0_count, f0_code0, ..., f1_count, ...]`
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn run_split(schema: &[u8], values: &[u8]) -> Vec<u8> {
    if schema.len() < 2 {
        return vec![1];
    }

    let num_fields = u16::from_le_bytes([schema[0], schema[1]]) as usize;
    let mut sp = 2usize; // schema cursor
    let mut vp = 0usize; // values cursor
    let mut field_codes: Vec<Vec<u8>> = Vec::with_capacity(num_fields);

    macro_rules! need_s {
        ($n:expr) => {
            if sp + $n > schema.len() {
                return Default::default();
            }
        };
    }
    macro_rules! need_v {
        ($n:expr) => {
            if vp + $n > values.len() {
                return Default::default();
            }
        };
    }

    for _ in 0..num_fields {
        // ── Read value from values buffer ────────────────────────────────────
        need_v!(1);
        let field_type = values[vp];
        vp += 1;
        let field_value = match field_type {
            0 => FieldValue::Null,
            1 => FieldValue::Bool(false),
            2 => FieldValue::Bool(true),
            3 => {
                need_v!(8);
                let v = f64::from_le_bytes(values[vp..vp + 8].try_into().unwrap());
                vp += 8;
                FieldValue::Num(v)
            }
            4 => {
                need_v!(2);
                let slen = u16::from_le_bytes([values[vp], values[vp + 1]]) as usize;
                vp += 2;
                need_v!(slen);
                let s = std::str::from_utf8(&values[vp..vp + slen]).unwrap_or("").to_string();
                vp += slen;
                FieldValue::Str(s)
            }
            _ => FieldValue::Null,
        };

        // ── Read rules from schema buffer ────────────────────────────────────
        need_s!(1);
        let num_rules = schema[sp] as usize;
        sp += 1;
        let mut failing: Vec<u8> = Vec::new();

        for _ in 0..num_rules {
            need_s!(2);
            let code = schema[sp] as u32;
            sp += 1;
            let param_type = schema[sp];
            sp += 1;
            let passed = match param_type {
                0 => orchestrator::dispatch_by_code(code, &field_value, &[]),
                1 => {
                    need_s!(8);
                    let p0 = f64::from_le_bytes(schema[sp..sp + 8].try_into().unwrap());
                    sp += 8;
                    orchestrator::dispatch_by_code(code, &field_value, &[Param::Num(p0)])
                }
                2 => {
                    need_s!(16);
                    let p0 = f64::from_le_bytes(schema[sp..sp + 8].try_into().unwrap());
                    sp += 8;
                    let p1 = f64::from_le_bytes(schema[sp..sp + 8].try_into().unwrap());
                    sp += 8;
                    orchestrator::dispatch_by_code(code, &field_value, &[Param::Num(p0), Param::Num(p1)])
                }
                3 => {
                    need_s!(2);
                    let plen = u16::from_le_bytes([schema[sp], schema[sp + 1]]) as usize;
                    sp += 2;
                    need_s!(plen);
                    let p_str = std::str::from_utf8(&schema[sp..sp + plen]).unwrap_or("").to_string();
                    sp += plen;
                    orchestrator::dispatch_by_code(code, &field_value, &[Param::Str(p_str)])
                }
                _ => true,
            };
            if !passed {
                failing.push(code as u8);
            }
        }
        field_codes.push(failing);
    }

    let all_ok = field_codes.iter().all(|c| c.is_empty());
    let total: usize = field_codes.iter().map(|c| c.len()).sum();
    let mut buf = Vec::with_capacity(1 + num_fields + total);
    buf.push(all_ok as u8);
    for codes in &field_codes {
        buf.push(codes.len().min(255) as u8);
        buf.extend_from_slice(codes);
    }
    buf
}

// ─── Cast functions — coerce values to primitives or throw ────────────────────

// ── bool ──────────────────────────────────────────────────────────────────────

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

// ── integer ───────────────────────────────────────────────────────────────────

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

// ── float ─────────────────────────────────────────────────────────────────────

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

// ── string ────────────────────────────────────────────────────────────────────

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

// ── date ──────────────────────────────────────────────────────────────────────

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

// ── json ──────────────────────────────────────────────────────────────────────

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn cast_json(value: &str) -> Result<(), JsValue> {
    serde_json::from_str::<serde_json::Value>(value)
        .map(|_| ())
        .map_err(|e| JsValue::from_str(&format!("Invalid JSON: {}", e)))
}
