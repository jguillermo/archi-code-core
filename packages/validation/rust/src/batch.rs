//! Binary protocol batch validation.
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
//!     For each rule: [code: u8][param_type: u8][params…]
//!
//! Split format — values buffer (built per call):
//!   For each field (same order as schema):
//!     [type: u8][data…]

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{FieldValue, Param};

// ─── Binary read helpers ──────────────────────────────────────────────────────

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
    };
}

// ─── Field value decoder (flat format) ───────────────────────────────────────

fn decode_field_value_flat(data: &[u8], pos: &mut usize) -> Option<FieldValue> {
    if *pos >= data.len() {
        return None;
    }
    let field_type = data[*pos];
    *pos += 1;
    Some(match field_type {
        0 => FieldValue::Null,
        1 => FieldValue::Bool(false),
        2 => FieldValue::Bool(true),
        3 => {
            if *pos + 8 > data.len() {
                return None;
            }
            let v = f64::from_le_bytes(data[*pos..*pos + 8].try_into().unwrap());
            *pos += 8;
            FieldValue::Num(v)
        }
        4 => {
            if *pos + 2 > data.len() {
                return None;
            }
            let slen = u16::from_le_bytes([data[*pos], data[*pos + 1]]) as usize;
            *pos += 2;
            if *pos + slen > data.len() {
                return None;
            }
            let s = std::str::from_utf8(&data[*pos..*pos + slen]).unwrap_or("").to_string();
            *pos += slen;
            FieldValue::Str(s)
        }
        _ => FieldValue::Null,
    })
}

// ─── Rule dispatcher helper ───────────────────────────────────────────────────

fn dispatch_rule_flat(data: &[u8], pos: &mut usize, field_value: &FieldValue) -> Option<bool> {
    if *pos + 2 > data.len() {
        return None;
    }
    let code = data[*pos] as u32;
    *pos += 1;
    let param_type = data[*pos];
    *pos += 1;

    let passed = match param_type {
        0 => crate::orchestrator::dispatch_by_code(code, field_value, &[]),
        1 => {
            if *pos + 8 > data.len() {
                return None;
            }
            let p0 = f64::from_le_bytes(data[*pos..*pos + 8].try_into().unwrap());
            *pos += 8;
            crate::orchestrator::dispatch_by_code(code, field_value, &[Param::Num(p0)])
        }
        2 => {
            if *pos + 16 > data.len() {
                return None;
            }
            let p0 = f64::from_le_bytes(data[*pos..*pos + 8].try_into().unwrap());
            *pos += 8;
            let p1 = f64::from_le_bytes(data[*pos..*pos + 8].try_into().unwrap());
            *pos += 8;
            crate::orchestrator::dispatch_by_code(code, field_value, &[Param::Num(p0), Param::Num(p1)])
        }
        3 => {
            if *pos + 2 > data.len() {
                return None;
            }
            let plen = u16::from_le_bytes([data[*pos], data[*pos + 1]]) as usize;
            *pos += 2;
            if *pos + plen > data.len() {
                return None;
            }
            let p_str = std::str::from_utf8(&data[*pos..*pos + plen]).unwrap_or("").to_string();
            *pos += plen;
            crate::orchestrator::dispatch_by_code(code, field_value, &[Param::Str(p_str)])
        }
        _ => true,
    };
    Some(passed)
}

// ─── WASM exports ─────────────────────────────────────────────────────────────

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
        let Some(field_value) = decode_field_value_flat(data, &mut pos) else { return 0 };
        let num_rules = rd_u8!() as usize;
        for _ in 0..num_rules {
            match dispatch_rule_flat(data, &mut pos, &field_value) {
                Some(passed) if !passed => ok = false,
                None => return 0,
                _ => {}
            }
        }
    }
    ok as u8
}

/// Run all validations and return per-field failing rule codes.
///
/// Output format: `[ok_byte, f0_count, f0_code0, f0_code1, …, f1_count, …]`
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn run_flat_codes(data: &[u8]) -> Vec<u8> {
    let mut pos = 0usize;
    flat_parse_setup!(data, pos);

    let num_fields = rd_u16!() as usize;
    let mut field_codes: Vec<Vec<u8>> = Vec::with_capacity(num_fields);

    for _ in 0..num_fields {
        let Some(field_value) = decode_field_value_flat(data, &mut pos) else { return vec![] };
        let num_rules = rd_u8!() as usize;
        let mut failing: Vec<u8> = Vec::new();

        for _ in 0..num_rules {
            // Peek code before dispatching (needed to record failing codes)
            if pos >= data.len() {
                return vec![];
            }
            let code = data[pos] as u32;
            match dispatch_rule_flat(data, &mut pos, &field_value) {
                Some(false) => failing.push(code as u8),
                None => return vec![],
                _ => {}
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
/// Returns the same format as run_flat_codes: `[ok_byte, f0_count, f0_code0, …]`
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn run_split(schema: &[u8], values: &[u8]) -> Vec<u8> {
    if schema.len() < 2 {
        return vec![1];
    }

    let num_fields = u16::from_le_bytes([schema[0], schema[1]]) as usize;
    let mut sp = 2usize;
    let mut vp = 0usize;
    let mut field_codes: Vec<Vec<u8>> = Vec::with_capacity(num_fields);

    for _ in 0..num_fields {
        // ── Decode value from values buffer ──────────────────────────────────
        let Some(field_value) = decode_field_value_flat(values, &mut vp) else { return vec![] };

        // ── Decode and dispatch rules from schema buffer ──────────────────────
        if sp >= schema.len() {
            return vec![];
        }
        let num_rules = schema[sp] as usize;
        sp += 1;
        let mut failing: Vec<u8> = Vec::new();

        for _ in 0..num_rules {
            if sp + 2 > schema.len() {
                return vec![];
            }
            let code = schema[sp] as u32;
            sp += 1;
            let param_type = schema[sp];
            sp += 1;

            let passed = match param_type {
                0 => crate::orchestrator::dispatch_by_code(code, &field_value, &[]),
                1 => {
                    if sp + 8 > schema.len() {
                        return vec![];
                    }
                    let p0 = f64::from_le_bytes(schema[sp..sp + 8].try_into().unwrap());
                    sp += 8;
                    crate::orchestrator::dispatch_by_code(code, &field_value, &[Param::Num(p0)])
                }
                2 => {
                    if sp + 16 > schema.len() {
                        return vec![];
                    }
                    let p0 = f64::from_le_bytes(schema[sp..sp + 8].try_into().unwrap());
                    sp += 8;
                    let p1 = f64::from_le_bytes(schema[sp..sp + 8].try_into().unwrap());
                    sp += 8;
                    crate::orchestrator::dispatch_by_code(code, &field_value, &[Param::Num(p0), Param::Num(p1)])
                }
                3 => {
                    if sp + 2 > schema.len() {
                        return vec![];
                    }
                    let plen = u16::from_le_bytes([schema[sp], schema[sp + 1]]) as usize;
                    sp += 2;
                    if sp + plen > schema.len() {
                        return vec![];
                    }
                    let p_str = std::str::from_utf8(&schema[sp..sp + plen]).unwrap_or("").to_string();
                    sp += plen;
                    crate::orchestrator::dispatch_by_code(code, &field_value, &[Param::Str(p_str)])
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
