//! archi_validation — WebAssembly validation library

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

// ─── Internal types ───────────────────────────────────────────────────────────
//
// RuleId stores either an integer code (fast path, zero string alloc) or a
// legacy string name (backward-compat path for the old check* string API).

enum RuleId {
    Code(u32),
    Str(String),
}

struct RuleEntry {
    id:      RuleId,
    params:  Vec<Param>,
    message: Option<String>,
}

struct FieldEntry {
    value: FieldValue,
    rules: Vec<RuleEntry>,
}

// ─── Validator class ──────────────────────────────────────────────────────────

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub struct Validator {
    fields: Vec<FieldEntry>,
    locale: String,
    errors: Vec<Vec<String>>,
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl Validator {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { fields: vec![], locale: "en".to_string(), errors: vec![] }
    }

    pub fn set_locale(&mut self, locale: &str) {
        self.locale = locale.to_string();
    }

    // ── Fast field methods — NO field name param (it was discarded anyway) ────
    //
    // Eliminates 1 string marshal per field vs the old str_field/num_field API.

    /// Add a string field without crossing the boundary for the field name.
    pub fn val_str(&mut self, value: &str) {
        self.fields.push(FieldEntry { value: FieldValue::Str(value.to_string()), rules: vec![] });
    }

    /// Add a numeric field.
    pub fn val_num(&mut self, value: f64) {
        self.fields.push(FieldEntry { value: FieldValue::Num(value), rules: vec![] });
    }

    /// Add a boolean field.
    pub fn val_bool(&mut self, value: bool) {
        self.fields.push(FieldEntry { value: FieldValue::Bool(value), rules: vec![] });
    }

    /// Add a null field.
    pub fn val_null(&mut self) {
        self.fields.push(FieldEntry { value: FieldValue::Null, rules: vec![] });
    }

    // ── Fast rule methods — integer code, zero string allocation ─────────────
    //
    // Rule names like "isEmail" (7 bytes) cost: malloc + UTF-8 copy + free.
    // Integer codes cost: nothing (passed as f64, fits in a register).

    pub fn chk(&mut self, rule: u32) { self.push_code(rule, vec![], None); }
    pub fn chk_n(&mut self, rule: u32, p: f64) { self.push_code(rule, vec![Param::Num(p)], None); }
    pub fn chk_nn(&mut self, rule: u32, p1: f64, p2: f64) { self.push_code(rule, vec![Param::Num(p1), Param::Num(p2)], None); }
    pub fn chk_s(&mut self, rule: u32, p: &str) { self.push_code(rule, vec![Param::Str(p.to_string())], None); }
    pub fn chk_msg(&mut self, rule: u32, msg: &str) { self.push_code(rule, vec![], Some(msg.to_string())); }
    pub fn chk_n_msg(&mut self, rule: u32, p: f64, msg: &str) { self.push_code(rule, vec![Param::Num(p)], Some(msg.to_string())); }
    pub fn chk_nn_msg(&mut self, rule: u32, p1: f64, p2: f64, msg: &str) { self.push_code(rule, vec![Param::Num(p1), Param::Num(p2)], Some(msg.to_string())); }
    pub fn chk_s_msg(&mut self, rule: u32, p: &str, msg: &str) { self.push_code(rule, vec![Param::Str(p.to_string())], Some(msg.to_string())); }

    // ── Legacy field methods (backward compat) ────────────────────────────────

    pub fn str_field(&mut self, _field: &str, value: &str) { self.val_str(value); }
    pub fn num_field(&mut self, _field: &str, value: f64)  { self.val_num(value); }
    pub fn bool_field(&mut self, _field: &str, value: bool){ self.val_bool(value); }
    pub fn null_field(&mut self, _field: &str)             { self.val_null(); }

    // ── Legacy rule methods (backward compat, string-name API) ───────────────

    pub fn check(&mut self, rule: &str)                                    { self.push_str(rule, vec![], None); }
    pub fn check_n(&mut self, rule: &str, p: f64)                          { self.push_str(rule, vec![Param::Num(p)], None); }
    pub fn check_nn(&mut self, rule: &str, p1: f64, p2: f64)               { self.push_str(rule, vec![Param::Num(p1), Param::Num(p2)], None); }
    pub fn check_s(&mut self, rule: &str, p: &str)                         { self.push_str(rule, vec![Param::Str(p.to_string())], None); }
    pub fn check_msg(&mut self, rule: &str, msg: &str)                     { self.push_str(rule, vec![], Some(msg.to_string())); }
    pub fn check_n_msg(&mut self, rule: &str, p: f64, msg: &str)           { self.push_str(rule, vec![Param::Num(p)], Some(msg.to_string())); }
    pub fn check_nn_msg(&mut self, rule: &str, p1: f64, p2: f64, msg: &str){ self.push_str(rule, vec![Param::Num(p1), Param::Num(p2)], Some(msg.to_string())); }
    pub fn check_s_msg(&mut self, rule: &str, p: &str, msg: &str)          { self.push_str(rule, vec![Param::Str(p.to_string())], Some(msg.to_string())); }

    // ── Run & results ─────────────────────────────────────────────────────────

    /// Run all validations. Returns true if every field passed.
    pub fn run(&mut self) -> bool {
        self.execute();
        self.errors.iter().all(|e| e.is_empty())
    }

    /// Run validations and return all failing rule codes in a single boundary crossing.
    ///
    /// Format: `[ok_byte, f0_count, f0_code0, f0_code1, …, f1_count, f1_code0, …]`
    ///
    /// - `ok_byte` = 1 if all passed, 0 if any failed
    /// - `fi_count` = number of failing rules for field i
    /// - `fi_codeN` = u8 rule code of the N-th failing rule for field i (0–42; 255 = unknown)
    ///
    /// Zero string marshaling: no error messages are generated or crossed.
    /// Replaces `run_flags()` + N calls to `field_error_at()`.
    pub fn run_codes(&mut self) -> Vec<u8> {
        let codes: Vec<Vec<u8>> = self.fields.iter().map(|f| {
            f.rules.iter().filter_map(|r| {
                let passed = match &r.id {
                    RuleId::Code(c) => orchestrator::dispatch_by_code(*c, &f.value, &r.params),
                    RuleId::Str(s)  => orchestrator::dispatch_validator(s, &f.value, &r.params),
                };
                if passed { None } else {
                    Some(match &r.id {
                        RuleId::Code(c) => *c as u8,
                        RuleId::Str(s)  => orchestrator::name_to_code(s),
                    })
                }
            }).collect()
        }).collect();

        let ok = codes.iter().all(|c| c.is_empty());
        let total: usize = codes.iter().map(|c| c.len()).sum();
        let mut buf = Vec::with_capacity(1 + codes.len() + total);
        buf.push(ok as u8);
        for field_codes in &codes {
            buf.push(field_codes.len().min(255) as u8);
            buf.extend_from_slice(field_codes);
        }
        buf
    }

    /// Run validations and return a packed result in a single boundary crossing.
    ///
    /// Format: `[ok_byte, err_count_field_0, err_count_field_1, …]`
    ///
    /// - `ok_byte` = 1 if all passed, 0 if any failed
    /// - `err_count_i` = number of errors for field i (capped at 255)
    ///
    /// For the happy path (all fields pass), this avoids N separate
    /// `field_error_count()` calls — 1 crossing instead of N.
    pub fn run_flags(&mut self) -> Vec<u8> {
        self.execute();
        let ok = self.errors.iter().all(|e| e.is_empty());
        let mut buf = Vec::with_capacity(1 + self.errors.len());
        buf.push(ok as u8);
        for errors in &self.errors {
            buf.push(errors.len().min(255) as u8);
        }
        buf
    }

    pub fn field_ok(&self, index: usize) -> bool {
        self.errors.get(index).map(|e| e.is_empty()).unwrap_or(true)
    }

    pub fn field_error_count(&self, index: usize) -> usize {
        self.errors.get(index).map(|e| e.len()).unwrap_or(0)
    }

    pub fn field_error_at(&self, field_index: usize, error_index: usize) -> String {
        self.errors
            .get(field_index)
            .and_then(|e| e.get(error_index))
            .cloned()
            .unwrap_or_default()
    }

    /// Clear all fields and results to reuse this instance (avoids constructor/destructor).
    pub fn reset(&mut self) {
        self.fields.clear();
        self.errors.clear();
    }
}

#[cfg(feature = "wasm")]
impl Validator {
    /// Execute all validations and populate self.errors.
    fn execute(&mut self) {
        self.errors = self.fields.iter().map(|f| {
            f.rules.iter().filter_map(|r| {
                let passed = match &r.id {
                    RuleId::Code(c) => orchestrator::dispatch_by_code(*c, &f.value, &r.params),
                    RuleId::Str(s)  => orchestrator::dispatch_validator(s, &f.value, &r.params),
                };
                if passed {
                    None
                } else {
                    let name: &str = match &r.id {
                        RuleId::Code(c) => orchestrator::code_to_name(*c),
                        RuleId::Str(s)  => s.as_str(),
                    };
                    Some(messages::get_message(name, &r.params, &self.locale, r.message.as_deref()))
                }
            }).collect()
        }).collect();
    }

    fn push_code(&mut self, code: u32, params: Vec<Param>, message: Option<String>) {
        if let Some(field) = self.fields.last_mut() {
            field.rules.push(RuleEntry { id: RuleId::Code(code), params, message });
        }
    }

    fn push_str(&mut self, name: &str, params: Vec<Param>, message: Option<String>) {
        if let Some(field) = self.fields.last_mut() {
            field.rules.push(RuleEntry { id: RuleId::Str(name.to_string()), params, message });
        }
    }
}

// ─── JSON batch validation (2 boundary crossings for the entire batch) ────────

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn validate_json(input: &str) -> String {
    let parsed: serde_json::Value = match serde_json::from_str(input) {
        Ok(v) => v,
        Err(_) => return r#"{"ok":false,"errors":{"_parse":["Invalid JSON input"]}}"#.to_string(),
    };

    let locale = parsed.get("locale").and_then(|v| v.as_str()).unwrap_or("en");

    let fields = match parsed.get("fields").and_then(|v| v.as_array()) {
        Some(f) => f,
        None => return r#"{"ok":true,"errors":{}}"#.to_string(),
    };

    let mut all_ok = true;
    let mut error_parts: Vec<String> = Vec::with_capacity(fields.len());

    for field_val in fields {
        let field_name = field_val.get("field").and_then(|v| v.as_str()).unwrap_or("");
        let raw_value = field_val.get("value").unwrap_or(&serde_json::Value::Null);
        let field_value = json_to_field_value(raw_value);

        let mut field_errors: Vec<String> = Vec::new();

        if let Some(rules) = field_val.get("validations").and_then(|v| v.as_array()) {
            for rule_val in rules {
                let (rule_name, params, custom_msg) = parse_json_rule(rule_val);
                if !orchestrator::dispatch_validator(&rule_name, &field_value, &params) {
                    field_errors.push(messages::get_message(
                        &rule_name,
                        &params,
                        locale,
                        custom_msg.as_deref(),
                    ));
                }
            }
        }

        if !field_errors.is_empty() {
            all_ok = false;
        }

        let errors_json = field_errors
            .iter()
            .map(|e| serde_json::to_string(e).unwrap_or_default())
            .collect::<Vec<_>>()
            .join(",");
        error_parts.push(format!(
            "{}:[{}]",
            serde_json::to_string(field_name).unwrap_or_default(),
            errors_json
        ));
    }

    format!("{{\"ok\":{},\"errors\":{{{}}}}}", all_ok, error_parts.join(","))
}

#[cfg(feature = "wasm")]
fn json_to_field_value(v: &serde_json::Value) -> FieldValue {
    match v {
        serde_json::Value::String(s) => FieldValue::Str(s.clone()),
        serde_json::Value::Number(n) => FieldValue::Num(n.as_f64().unwrap_or(0.0)),
        serde_json::Value::Bool(b)   => FieldValue::Bool(*b),
        _                            => FieldValue::Null,
    }
}

#[cfg(feature = "wasm")]
fn json_to_params(arr: &[serde_json::Value]) -> Vec<Param> {
    arr.iter()
        .map(|p| match p {
            serde_json::Value::Number(n) => Param::Num(n.as_f64().unwrap_or(0.0)),
            serde_json::Value::String(s) => Param::Str(s.clone()),
            _                            => Param::Str(String::new()),
        })
        .collect()
}

#[cfg(feature = "wasm")]
fn parse_json_rule(v: &serde_json::Value) -> (String, Vec<Param>, Option<String>) {
    match v {
        serde_json::Value::String(s) => (s.clone(), vec![], None),
        serde_json::Value::Array(arr) => {
            let name   = arr.first().and_then(|v| v.as_str()).unwrap_or("").to_string();
            let params = if arr.len() > 1 { json_to_params(&arr[1..]) } else { vec![] };
            (name, params, None)
        }
        serde_json::Value::Object(obj) => {
            let name    = obj.get("rule").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let params  = obj.get("params").and_then(|v| v.as_array()).map(|a| json_to_params(a)).unwrap_or_default();
            let message = obj.get("message").and_then(|v| v.as_str()).map(|s| s.to_string());
            (name, params, message)
        }
        _ => (String::new(), vec![], None),
    }
}

// ─── Direct single-rule checks — string API (1 boundary crossing per check) ───

#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_str(rule: &str, value: &str) -> bool { orchestrator::dispatch_validator(rule, &FieldValue::Str(value.to_string()), &[]) }
#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_str_n(rule: &str, value: &str, p: f64) -> bool { orchestrator::dispatch_validator(rule, &FieldValue::Str(value.to_string()), &[Param::Num(p)]) }
#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_str_nn(rule: &str, value: &str, p1: f64, p2: f64) -> bool { orchestrator::dispatch_validator(rule, &FieldValue::Str(value.to_string()), &[Param::Num(p1), Param::Num(p2)]) }
#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_str_s(rule: &str, value: &str, p: &str) -> bool { orchestrator::dispatch_validator(rule, &FieldValue::Str(value.to_string()), &[Param::Str(p.to_string())]) }
#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_num(rule: &str, value: f64) -> bool { orchestrator::dispatch_validator(rule, &FieldValue::Num(value), &[]) }
#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_num_n(rule: &str, value: f64, p: f64) -> bool { orchestrator::dispatch_validator(rule, &FieldValue::Num(value), &[Param::Num(p)]) }
#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_num_nn(rule: &str, value: f64, p1: f64, p2: f64) -> bool { orchestrator::dispatch_validator(rule, &FieldValue::Num(value), &[Param::Num(p1), Param::Num(p2)]) }
#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_bool(rule: &str, value: bool) -> bool { orchestrator::dispatch_validator(rule, &FieldValue::Bool(value), &[]) }

// ─── Direct single-rule checks — integer code API (fastest, no string alloc) ──
//
// Eliminates rule name string marshaling. Use these for hot paths.

#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_code_str(rule: u32, value: &str) -> bool { orchestrator::dispatch_by_code(rule, &FieldValue::Str(value.to_string()), &[]) }
#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_code_str_n(rule: u32, value: &str, p: f64) -> bool { orchestrator::dispatch_by_code(rule, &FieldValue::Str(value.to_string()), &[Param::Num(p)]) }
#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_code_str_nn(rule: u32, value: &str, p1: f64, p2: f64) -> bool { orchestrator::dispatch_by_code(rule, &FieldValue::Str(value.to_string()), &[Param::Num(p1), Param::Num(p2)]) }
#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_code_str_s(rule: u32, value: &str, p: &str) -> bool { orchestrator::dispatch_by_code(rule, &FieldValue::Str(value.to_string()), &[Param::Str(p.to_string())]) }
#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_code_num(rule: u32, value: f64) -> bool { orchestrator::dispatch_by_code(rule, &FieldValue::Num(value), &[]) }
#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_code_num_n(rule: u32, value: f64, p: f64) -> bool { orchestrator::dispatch_by_code(rule, &FieldValue::Num(value), &[Param::Num(p)]) }
#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_code_num_nn(rule: u32, value: f64, p1: f64, p2: f64) -> bool { orchestrator::dispatch_by_code(rule, &FieldValue::Num(value), &[Param::Num(p1), Param::Num(p2)]) }
#[cfg(feature = "wasm")] #[wasm_bindgen] pub fn check_code_bool(rule: u32, value: bool) -> bool { orchestrator::dispatch_by_code(rule, &FieldValue::Bool(value), &[]) }

// ─── Cast functions — coerce values to primitives or throw ────────────────────
//
// Naming: cast_{target}_{source}  (omit source when it is a string)
//   cast_bool(s)         — string  → bool
//   cast_bool_num(n)     — f64     → bool
//   cast_integer(s)      — string  → f64 (whole numbers only)
//   cast_integer_num(n)  — f64     → f64 (validates finite + no fractional part)
//   cast_num_bool(b)     — bool    → f64 (true=1, false=0; infallible)
//   cast_float(s)        — string  → f64 (any finite)
//   cast_float_num(n)    — f64     → f64 (validates finite)
//   cast_str_num(n)      — f64     → String
//   cast_str_bool(b)     — bool    → String ("true"/"false"; infallible)
//   cast_date(s)         — string  → f64 (timestamp ms)
//   cast_date_num(n)     — f64     → f64 (validates finite timestamp)
//   cast_json(s)         — string  → () (validates JSON; caller does JSON.parse)
//
// TypeScript cast.ts is a thin typeof-dispatcher — zero validation logic in TS.

// ── bool ──────────────────────────────────────────────────────────────────────

#[cfg(feature = "wasm")] #[wasm_bindgen]
pub fn cast_bool(value: &str) -> Result<bool, JsValue> {
    match value.trim().to_lowercase().as_str() {
        "true"  | "1" | "yes" | "on"  => Ok(true),
        "false" | "0" | "no"  | "off" => Ok(false),
        _ => Err(JsValue::from_str(&format!("Cannot convert {:?} to boolean", value))),
    }
}

#[cfg(feature = "wasm")] #[wasm_bindgen]
pub fn cast_bool_num(value: f64) -> Result<bool, JsValue> {
    if value == 1.0 { Ok(true)  }
    else if value == 0.0 { Ok(false) }
    else { Err(JsValue::from_str(&format!("Cannot convert {} to boolean: only 0 and 1 are valid", value))) }
}

// ── integer ───────────────────────────────────────────────────────────────────

#[cfg(feature = "wasm")] #[wasm_bindgen]
pub fn cast_integer(value: &str) -> Result<f64, JsValue> {
    let s = value.trim();
    if s.is_empty() {
        return Err(JsValue::from_str("Cannot convert empty string to integer"));
    }
    s.parse::<i64>()
        .map(|n| n as f64)
        .map_err(|_| JsValue::from_str(&format!("Cannot convert {:?} to integer", value)))
}

#[cfg(feature = "wasm")] #[wasm_bindgen]
pub fn cast_integer_num(value: f64) -> Result<f64, JsValue> {
    if !value.is_finite() {
        return Err(JsValue::from_str(&format!("Cannot convert {} to integer", value)));
    }
    if value.fract() != 0.0 {
        return Err(JsValue::from_str(&format!("Cannot convert {} to integer: has fractional part", value)));
    }
    Ok(value)
}

/// true → 1.0, false → 0.0. Infallible — used by both canBeInteger and canBeFloat.
#[cfg(feature = "wasm")] #[wasm_bindgen]
pub fn cast_num_bool(value: bool) -> f64 {
    if value { 1.0 } else { 0.0 }
}

// ── float ─────────────────────────────────────────────────────────────────────

#[cfg(feature = "wasm")] #[wasm_bindgen]
pub fn cast_float(value: &str) -> Result<f64, JsValue> {
    let s = value.trim();
    if s.is_empty() {
        return Err(JsValue::from_str("Cannot convert empty string to float"));
    }
    s.parse::<f64>()
        .map_err(|_| JsValue::from_str(&format!("Cannot convert {:?} to float", value)))
        .and_then(|n| if n.is_finite() {
            Ok(n)
        } else {
            Err(JsValue::from_str(&format!("Cannot convert {:?} to float: not finite", value)))
        })
}

#[cfg(feature = "wasm")] #[wasm_bindgen]
pub fn cast_float_num(value: f64) -> Result<f64, JsValue> {
    if value.is_finite() { Ok(value) }
    else { Err(JsValue::from_str(&format!("Cannot convert {} to float", value))) }
}

// ── string ────────────────────────────────────────────────────────────────────

#[cfg(feature = "wasm")] #[wasm_bindgen]
pub fn cast_str_num(value: f64) -> Result<String, JsValue> {
    if !value.is_finite() {
        return Err(JsValue::from_str(&format!("Cannot convert {} to string", value)));
    }
    // -0.0 must become "0", matching JavaScript's String(-0) behaviour
    if value == 0.0 { Ok("0".to_string()) } else { Ok(value.to_string()) }
}

/// true → "true", false → "false". Infallible.
#[cfg(feature = "wasm")] #[wasm_bindgen]
pub fn cast_str_bool(value: bool) -> String {
    if value { "true".to_string() } else { "false".to_string() }
}

// ── date ──────────────────────────────────────────────────────────────────────

/// Parse a date/datetime string and return Unix timestamp in milliseconds.
/// Formats: YYYY-MM-DD, RFC 3339, ISO 8601 with timezone.
/// TypeScript: new Date(cast_date(s))
#[cfg(feature = "wasm")] #[wasm_bindgen]
pub fn cast_date(value: &str) -> Result<f64, JsValue> {
    use chrono::{NaiveDate, DateTime};
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

/// Validate a Unix ms timestamp (f64). Passes it through if finite; throws for NaN/±Infinity.
/// Also used for Date objects on the TS side: cast_date_num(date.getTime()).
#[cfg(feature = "wasm")] #[wasm_bindgen]
pub fn cast_date_num(value: f64) -> Result<f64, JsValue> {
    if value.is_finite() { Ok(value) }
    else { Err(JsValue::from_str(&format!("Cannot convert {} to date: invalid timestamp", value))) }
}

// ── json ──────────────────────────────────────────────────────────────────────

/// Validate that a string is valid JSON. Throws if invalid; returns void on success.
/// TypeScript: wrapWasm(() => cast_json(s)); return JSON.parse(s);
#[cfg(feature = "wasm")] #[wasm_bindgen]
pub fn cast_json(value: &str) -> Result<(), JsValue> {
    serde_json::from_str::<serde_json::Value>(value)
        .map(|_| ())
        .map_err(|e| JsValue::from_str(&format!("Invalid JSON: {}", e)))
}
