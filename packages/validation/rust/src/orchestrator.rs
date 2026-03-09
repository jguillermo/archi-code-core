use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::messages;
use crate::validators::{boolean, date, email, ip, misc, number, string, url as url_val, uuid};

// ─── Input types ─────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct ValidateInput {
    #[serde(default = "default_locale")]
    pub locale: String,
    pub fields: Vec<FieldInput>,
}

fn default_locale() -> String {
    "en".to_string()
}

#[derive(Deserialize)]
pub struct FieldInput {
    pub field: String,
    pub value: Value,
    pub validations: Vec<ValidationRule>,
}

/// Three ways to specify a validation rule:
/// - `"isEmail"`                                    → simple string, no params
/// - `["isMinLength", 5]`                           → array: rule + params
/// - `{ "rule": "isMinLength", "params": [5], "message": "..." }` → object with optional custom message
#[derive(Deserialize)]
#[serde(untagged)]
pub enum ValidationRule {
    Simple(String),
    Array(Vec<Value>),
    Config(ValidationConfig),
}

#[derive(Deserialize)]
pub struct ValidationConfig {
    pub rule: String,
    #[serde(default)]
    pub params: Vec<Value>,
    pub message: Option<String>,
}

// ─── Output types ────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct ValidateOutput {
    pub ok: bool,
    pub errors: HashMap<String, Vec<String>>,
}

// ─── Entry point ─────────────────────────────────────────────────────────────

pub fn process(input: ValidateInput) -> ValidateOutput {
    let mut errors: HashMap<String, Vec<String>> = HashMap::new();

    for field in &input.fields {
        let field_errors: Vec<String> = field
            .validations
            .iter()
            .filter_map(|rule| {
                let (rule_name, params, custom_msg) = extract_rule(rule)?;
                let is_valid = dispatch_validator(&rule_name, &field.value, &params);
                if !is_valid {
                    Some(messages::get_message(&rule_name, &params, &input.locale, custom_msg.as_deref()))
                } else {
                    None
                }
            })
            .collect();

        errors.insert(field.field.clone(), field_errors);
    }

    let ok = errors.values().all(|e| e.is_empty());
    ValidateOutput { ok, errors }
}

fn extract_rule(rule: &ValidationRule) -> Option<(String, Vec<Value>, Option<String>)> {
    match rule {
        ValidationRule::Simple(name) => Some((name.clone(), vec![], None)),
        ValidationRule::Array(arr) => {
            if let Some(Value::String(name)) = arr.first() {
                Some((name.clone(), arr[1..].to_vec(), None))
            } else {
                None
            }
        }
        ValidationRule::Config(cfg) => Some((cfg.rule.clone(), cfg.params.clone(), cfg.message.clone())),
    }
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

fn dispatch_validator(rule: &str, value: &Value, params: &[Value]) -> bool {
    match rule {
        // ── String ──────────────────────────────────────────────────────────
        "isNotEmpty" => string::is_not_empty(value_as_str(value)),
        "isMinLength" => string::is_min_length(value_as_str(value), param_usize(params, 0)),
        "isMaxLength" => string::is_max_length(value_as_str(value), param_usize(params, 0)),
        "isExactLength" => string::is_exact_length(value_as_str(value), param_usize(params, 0)),
        "isLengthBetween" => string::is_length_between(value_as_str(value), param_usize(params, 0), param_usize(params, 1)),
        "isAlpha" => string::is_alpha(value_as_str(value)),
        "isAlphanumeric" => string::is_alphanumeric(value_as_str(value)),
        "isNumeric" => string::is_numeric(value_as_str(value)),
        "isAscii" => string::is_ascii(value_as_str(value)),
        "isLowercase" => string::is_lowercase(value_as_str(value)),
        "isUppercase" => string::is_uppercase(value_as_str(value)),
        "isContains" => string::contains(value_as_str(value), &param_string(params, 0)),
        "isStartsWith" => string::starts_with(value_as_str(value), &param_string(params, 0)),
        "isEndsWith" => string::ends_with(value_as_str(value), &param_string(params, 0)),
        "isMatchesRegex" => string::matches_regex(value_as_str(value), &param_string(params, 0)),
        // ── Number ──────────────────────────────────────────────────────────
        "isInteger" => number::is_integer(&value_as_string(value)),
        "isPositiveInteger" => number::is_positive_integer(&value_as_string(value)),
        "isNegativeInteger" => number::is_negative_integer(&value_as_string(value)),
        "isFloat" => number::is_float(&value_as_string(value)),
        "isPositiveNumber" => number::is_positive(value_as_f64(value)),
        "isNegativeNumber" => number::is_negative(value_as_f64(value)),
        "isInRange" => number::is_in_range(value_as_f64(value), param_f64(params, 0), param_f64(params, 1)),
        "isMinValue" => number::is_min(value_as_f64(value), param_f64(params, 0)),
        "isMaxValue" => number::is_max(value_as_f64(value), param_f64(params, 0)),
        "isMultipleOf" => number::is_multiple_of(value_as_f64(value), param_f64(params, 0)),
        // ── Email ────────────────────────────────────────────────────────────
        "isEmail" => email::is_email(value_as_str(value)),
        // ── UUID ─────────────────────────────────────────────────────────────
        "isUuid" => uuid::is_uuid(value_as_str(value)),
        "isUuidV4" => uuid::is_uuid_v4(value_as_str(value)),
        "isUuidV7" => uuid::is_uuid_v7(value_as_str(value)),
        // ── URL ──────────────────────────────────────────────────────────────
        "isUrl" => url_val::is_url(value_as_str(value)),
        "isUrlWithScheme" => url_val::is_url_with_scheme(value_as_str(value), &param_string(params, 0)),
        // ── IP ───────────────────────────────────────────────────────────────
        "isIp" => ip::is_ip(value_as_str(value)),
        "isIpv4" => ip::is_ipv4(value_as_str(value)),
        "isIpv6" => ip::is_ipv6(value_as_str(value)),
        // ── Date ─────────────────────────────────────────────────────────────
        "isDate" => date::is_date(value_as_str(value)),
        "isDatetime" => date::is_datetime(value_as_str(value)),
        "isTime" => date::is_time(value_as_str(value)),
        // ── Boolean ──────────────────────────────────────────────────────────
        "isBooleanString" => match value {
            Value::Bool(_) => true,
            _ => boolean::is_boolean_string(value_as_str(value)),
        },
        // ── Misc ─────────────────────────────────────────────────────────────
        "isCreditCard" => misc::is_credit_card(value_as_str(value)),
        "isJson" => misc::is_json(value_as_str(value)),
        "isHexColor" => misc::is_hex_color(value_as_str(value)),
        "isBase64" => misc::is_base64(value_as_str(value)),
        "isSlug" => misc::is_slug(value_as_str(value)),
        // Unknown rule → fail
        _ => false,
    }
}

// ─── Value helpers ───────────────────────────────────────────────────────────

fn value_as_str(value: &Value) -> &str {
    value.as_str().unwrap_or("")
}

fn value_as_string(value: &Value) -> String {
    match value {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        _ => String::new(),
    }
}

fn value_as_f64(value: &Value) -> f64 {
    value
        .as_f64()
        .or_else(|| value.as_str().and_then(|s| s.parse().ok()))
        .unwrap_or(0.0)
}

fn param_usize(params: &[Value], i: usize) -> usize {
    params.get(i).and_then(|v| v.as_u64()).unwrap_or(0) as usize
}

fn param_f64(params: &[Value], i: usize) -> f64 {
    params.get(i).and_then(|v| v.as_f64()).unwrap_or(0.0)
}

fn param_string(params: &[Value], i: usize) -> String {
    params
        .get(i)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_default()
}
