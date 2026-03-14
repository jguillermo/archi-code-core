//! archi_validation — WebAssembly validation library
//!
//! Zero-serialization API: typed values and rules cross the boundary directly.
//! No JSON.stringify, no JSON.parse, no string encoding.

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

// ─── Native value types — no serialization ───────────────────────────────────

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

struct RuleEntry {
    name: String,
    params: Vec<Param>,
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
    errors: Vec<Vec<String>>, // indexed parallel to fields, populated after run()
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

    // ── Add field (one method per value type — no encoding) ──────────────────

    pub fn str_field(&mut self, _field: &str, value: &str) {
        self.fields.push(FieldEntry { value: FieldValue::Str(value.to_string()), rules: vec![] });
    }

    pub fn num_field(&mut self, _field: &str, value: f64) {
        self.fields.push(FieldEntry { value: FieldValue::Num(value), rules: vec![] });
    }

    pub fn bool_field(&mut self, _field: &str, value: bool) {
        self.fields.push(FieldEntry { value: FieldValue::Bool(value), rules: vec![] });
    }

    pub fn null_field(&mut self, _field: &str) {
        self.fields.push(FieldEntry { value: FieldValue::Null, rules: vec![] });
    }

    // ── Add rule to last field (one method per param signature) ──────────────

    /// Rule with no params: `check("isEmail")`
    pub fn check(&mut self, rule: &str) {
        self.add_rule(rule, vec![], None);
    }

    /// Rule with one number param: `check_n("isMinLength", 5.0)`
    pub fn check_n(&mut self, rule: &str, p: f64) {
        self.add_rule(rule, vec![Param::Num(p)], None);
    }

    /// Rule with two number params: `check_nn("isInRange", 0.0, 100.0)`
    pub fn check_nn(&mut self, rule: &str, p1: f64, p2: f64) {
        self.add_rule(rule, vec![Param::Num(p1), Param::Num(p2)], None);
    }

    /// Rule with one string param: `check_s("isContains", "hello")`
    pub fn check_s(&mut self, rule: &str, p: &str) {
        self.add_rule(rule, vec![Param::Str(p.to_string())], None);
    }

    /// Rule with no params and custom message
    pub fn check_msg(&mut self, rule: &str, msg: &str) {
        self.add_rule(rule, vec![], Some(msg.to_string()));
    }

    /// Rule with one number param and custom message
    pub fn check_n_msg(&mut self, rule: &str, p: f64, msg: &str) {
        self.add_rule(rule, vec![Param::Num(p)], Some(msg.to_string()));
    }

    /// Rule with two number params and custom message
    pub fn check_nn_msg(&mut self, rule: &str, p1: f64, p2: f64, msg: &str) {
        self.add_rule(rule, vec![Param::Num(p1), Param::Num(p2)], Some(msg.to_string()));
    }

    /// Rule with one string param and custom message
    pub fn check_s_msg(&mut self, rule: &str, p: &str, msg: &str) {
        self.add_rule(rule, vec![Param::Str(p.to_string())], Some(msg.to_string()));
    }

    // ── Run & results ─────────────────────────────────────────────────────────

    /// Run all validations. Returns true if every field passed.
    pub fn run(&mut self) -> bool {
        self.errors = self.fields.iter().map(|f| {
            f.rules.iter().filter_map(|r| {
                if orchestrator::dispatch_validator(&r.name, &f.value, &r.params) {
                    None
                } else {
                    Some(messages::get_message(&r.name, &r.params, &self.locale, r.message.as_deref()))
                }
            }).collect()
        }).collect();

        self.errors.iter().all(|e| e.is_empty())
    }

    /// Returns true if the field has no errors. Call after run().
    pub fn field_ok(&self, index: usize) -> bool {
        self.errors.get(index).map(|e| e.is_empty()).unwrap_or(true)
    }

    /// Returns the number of errors for a field. Call after run().
    pub fn field_error_count(&self, index: usize) -> usize {
        self.errors.get(index).map(|e| e.len()).unwrap_or(0)
    }

    /// Returns a single error message by field index and error index. Call after run().
    pub fn field_error_at(&self, field_index: usize, error_index: usize) -> String {
        self.errors
            .get(field_index)
            .and_then(|e| e.get(error_index))
            .cloned()
            .unwrap_or_default()
    }

    /// Remove all fields and results to reuse this instance.
    pub fn reset(&mut self) {
        self.fields.clear();
        self.errors.clear();
    }
}

#[cfg(feature = "wasm")]
impl Validator {
    fn add_rule(&mut self, name: &str, params: Vec<Param>, message: Option<String>) {
        if let Some(field) = self.fields.last_mut() {
            field.rules.push(RuleEntry { name: name.to_string(), params, message });
        }
    }
}

// ─── JSON batch validation (2 boundary crossings for the entire batch) ────────
//
// Input:  JSON string matching ValidateInput  { locale?, fields: [...] }
// Output: JSON string matching ValidateOutput { ok, errors }
//
// All parsing, validation, and serialization happens inside WASM — the only
// JS↔WASM boundary crossings are the input string and the output string.

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
        serde_json::Value::Bool(b) => FieldValue::Bool(*b),
        _ => FieldValue::Null,
    }
}

#[cfg(feature = "wasm")]
fn json_to_params(arr: &[serde_json::Value]) -> Vec<Param> {
    arr.iter()
        .map(|p| match p {
            serde_json::Value::Number(n) => Param::Num(n.as_f64().unwrap_or(0.0)),
            serde_json::Value::String(s) => Param::Str(s.clone()),
            _ => Param::Str(String::new()),
        })
        .collect()
}

#[cfg(feature = "wasm")]
fn parse_json_rule(v: &serde_json::Value) -> (String, Vec<Param>, Option<String>) {
    match v {
        serde_json::Value::String(s) => (s.clone(), vec![], None),
        serde_json::Value::Array(arr) => {
            let name = arr.first().and_then(|v| v.as_str()).unwrap_or("").to_string();
            let params = if arr.len() > 1 { json_to_params(&arr[1..]) } else { vec![] };
            (name, params, None)
        }
        serde_json::Value::Object(obj) => {
            let name = obj.get("rule").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let params = obj
                .get("params")
                .and_then(|v| v.as_array())
                .map(|arr| json_to_params(arr))
                .unwrap_or_default();
            let message = obj.get("message").and_then(|v| v.as_str()).map(|s| s.to_string());
            (name, params, message)
        }
        _ => (String::new(), vec![], None),
    }
}

// ─── Direct single-rule check functions (1 boundary crossing per check) ───────
//
// Use these when you need to validate a single value against a single rule.
// Much faster than creating a Validator instance for one-off checks.

/// Check a string value against a rule with no params.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn check_str(rule: &str, value: &str) -> bool {
    orchestrator::dispatch_validator(rule, &FieldValue::Str(value.to_string()), &[])
}

/// Check a string value against a rule with one numeric param.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn check_str_n(rule: &str, value: &str, p: f64) -> bool {
    orchestrator::dispatch_validator(rule, &FieldValue::Str(value.to_string()), &[Param::Num(p)])
}

/// Check a string value against a rule with two numeric params.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn check_str_nn(rule: &str, value: &str, p1: f64, p2: f64) -> bool {
    orchestrator::dispatch_validator(rule, &FieldValue::Str(value.to_string()), &[Param::Num(p1), Param::Num(p2)])
}

/// Check a string value against a rule with one string param.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn check_str_s(rule: &str, value: &str, p: &str) -> bool {
    orchestrator::dispatch_validator(rule, &FieldValue::Str(value.to_string()), &[Param::Str(p.to_string())])
}

/// Check a numeric value against a rule with no params.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn check_num(rule: &str, value: f64) -> bool {
    orchestrator::dispatch_validator(rule, &FieldValue::Num(value), &[])
}

/// Check a numeric value against a rule with one numeric param.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn check_num_n(rule: &str, value: f64, p: f64) -> bool {
    orchestrator::dispatch_validator(rule, &FieldValue::Num(value), &[Param::Num(p)])
}

/// Check a numeric value against a rule with two numeric params.
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn check_num_nn(rule: &str, value: f64, p1: f64, p2: f64) -> bool {
    orchestrator::dispatch_validator(rule, &FieldValue::Num(value), &[Param::Num(p1), Param::Num(p2)])
}

/// Check a boolean value against a rule (e.g. isBooleanString).
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn check_bool(rule: &str, value: bool) -> bool {
    orchestrator::dispatch_validator(rule, &FieldValue::Bool(value), &[])
}
