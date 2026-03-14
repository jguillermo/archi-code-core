use crate::validators::{boolean, date, email, ip, misc, number, string, url as url_val, uuid};
use crate::{FieldValue, Param};

// ─── Dispatcher ──────────────────────────────────────────────────────────────

pub(crate) fn dispatch_validator(rule: &str, value: &FieldValue, params: &[Param]) -> bool {
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
            FieldValue::Bool(_) => true,
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

fn value_as_str(value: &FieldValue) -> &str {
    match value {
        FieldValue::Str(s) => s,
        _ => "",
    }
}

fn value_as_string(value: &FieldValue) -> String {
    match value {
        FieldValue::Str(s) => s.clone(),
        FieldValue::Num(n) => n.to_string(),
        FieldValue::Bool(b) => b.to_string(),
        FieldValue::Null => String::new(),
    }
}

fn value_as_f64(value: &FieldValue) -> f64 {
    match value {
        FieldValue::Num(n) => *n,
        FieldValue::Str(s) => s.parse().unwrap_or(0.0),
        _ => 0.0,
    }
}

// ─── Param helpers ───────────────────────────────────────────────────────────

fn param_usize(params: &[Param], i: usize) -> usize {
    match params.get(i) {
        Some(Param::Num(n)) => *n as usize,
        _ => 0,
    }
}

fn param_f64(params: &[Param], i: usize) -> f64 {
    match params.get(i) {
        Some(Param::Num(n)) => *n,
        _ => 0.0,
    }
}

fn param_string(params: &[Param], i: usize) -> String {
    match params.get(i) {
        Some(Param::Str(s)) => s.clone(),
        Some(Param::Num(n)) => n.to_string(),
        _ => String::new(),
    }
}
