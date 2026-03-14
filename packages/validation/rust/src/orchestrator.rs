use crate::validators::{boolean, date, email, ip, misc, number, string, url as url_val, uuid};
use crate::{FieldValue, Param};

// ─── Integer rule codes ───────────────────────────────────────────────────────
//
// Each rule name maps to a u32 constant. Passing codes instead of strings
// eliminates UTF-8 string marshaling (malloc + copy + free) per rule.
//
// MUST stay in sync with RC in validate.ts.

pub(crate) const C_IS_NOT_EMPTY: u32        = 0;
pub(crate) const C_IS_MIN_LENGTH: u32       = 1;
pub(crate) const C_IS_MAX_LENGTH: u32       = 2;
pub(crate) const C_IS_EXACT_LENGTH: u32     = 3;
pub(crate) const C_IS_LENGTH_BETWEEN: u32   = 4;
pub(crate) const C_IS_ALPHA: u32            = 5;
pub(crate) const C_IS_ALPHANUMERIC: u32     = 6;
pub(crate) const C_IS_NUMERIC: u32          = 7;
pub(crate) const C_IS_ASCII: u32            = 8;
pub(crate) const C_IS_LOWERCASE: u32        = 9;
pub(crate) const C_IS_UPPERCASE: u32        = 10;
pub(crate) const C_IS_CONTAINS: u32         = 11;
pub(crate) const C_IS_STARTS_WITH: u32      = 12;
pub(crate) const C_IS_ENDS_WITH: u32        = 13;
pub(crate) const C_IS_MATCHES_REGEX: u32    = 14;
pub(crate) const C_IS_INTEGER: u32          = 15;
pub(crate) const C_IS_POSITIVE_INTEGER: u32 = 16;
pub(crate) const C_IS_NEGATIVE_INTEGER: u32 = 17;
pub(crate) const C_IS_FLOAT: u32            = 18;
pub(crate) const C_IS_POSITIVE_NUMBER: u32  = 19;
pub(crate) const C_IS_NEGATIVE_NUMBER: u32  = 20;
pub(crate) const C_IS_IN_RANGE: u32         = 21;
pub(crate) const C_IS_MIN_VALUE: u32        = 22;
pub(crate) const C_IS_MAX_VALUE: u32        = 23;
pub(crate) const C_IS_MULTIPLE_OF: u32      = 24;
pub(crate) const C_IS_EMAIL: u32            = 25;
pub(crate) const C_IS_UUID: u32             = 26;
pub(crate) const C_IS_UUID_V4: u32          = 27;
pub(crate) const C_IS_UUID_V7: u32          = 28;
pub(crate) const C_IS_URL: u32              = 29;
pub(crate) const C_IS_URL_WITH_SCHEME: u32  = 30;
pub(crate) const C_IS_IP: u32               = 31;
pub(crate) const C_IS_IPV4: u32             = 32;
pub(crate) const C_IS_IPV6: u32             = 33;
pub(crate) const C_IS_DATE: u32             = 34;
pub(crate) const C_IS_DATETIME: u32         = 35;
pub(crate) const C_IS_TIME: u32             = 36;
pub(crate) const C_IS_BOOLEAN_STRING: u32   = 37;
pub(crate) const C_IS_CREDIT_CARD: u32      = 38;
pub(crate) const C_IS_JSON: u32             = 39;
pub(crate) const C_IS_HEX_COLOR: u32        = 40;
pub(crate) const C_IS_BASE64: u32           = 41;
pub(crate) const C_IS_SLUG: u32             = 42;

// ─── Integer dispatcher ───────────────────────────────────────────────────────
//
// Matches on u32 — zero string allocation, zero string comparison.

pub(crate) fn dispatch_by_code(code: u32, value: &FieldValue, params: &[Param]) -> bool {
    match code {
        C_IS_NOT_EMPTY        => string::is_not_empty(value_as_str(value)),
        C_IS_MIN_LENGTH       => string::is_min_length(value_as_str(value), param_usize(params, 0)),
        C_IS_MAX_LENGTH       => string::is_max_length(value_as_str(value), param_usize(params, 0)),
        C_IS_EXACT_LENGTH     => string::is_exact_length(value_as_str(value), param_usize(params, 0)),
        C_IS_LENGTH_BETWEEN   => string::is_length_between(value_as_str(value), param_usize(params, 0), param_usize(params, 1)),
        C_IS_ALPHA            => string::is_alpha(value_as_str(value)),
        C_IS_ALPHANUMERIC     => string::is_alphanumeric(value_as_str(value)),
        C_IS_NUMERIC          => string::is_numeric(value_as_str(value)),
        C_IS_ASCII            => string::is_ascii(value_as_str(value)),
        C_IS_LOWERCASE        => string::is_lowercase(value_as_str(value)),
        C_IS_UPPERCASE        => string::is_uppercase(value_as_str(value)),
        C_IS_CONTAINS         => string::contains(value_as_str(value), &param_string(params, 0)),
        C_IS_STARTS_WITH      => string::starts_with(value_as_str(value), &param_string(params, 0)),
        C_IS_ENDS_WITH        => string::ends_with(value_as_str(value), &param_string(params, 0)),
        C_IS_MATCHES_REGEX    => string::matches_regex(value_as_str(value), &param_string(params, 0)),
        C_IS_INTEGER          => number::is_integer(&value_as_string(value)),
        C_IS_POSITIVE_INTEGER => number::is_positive_integer(&value_as_string(value)),
        C_IS_NEGATIVE_INTEGER => number::is_negative_integer(&value_as_string(value)),
        C_IS_FLOAT            => number::is_float(&value_as_string(value)),
        C_IS_POSITIVE_NUMBER  => number::is_positive(value_as_f64(value)),
        C_IS_NEGATIVE_NUMBER  => number::is_negative(value_as_f64(value)),
        C_IS_IN_RANGE         => number::is_in_range(value_as_f64(value), param_f64(params, 0), param_f64(params, 1)),
        C_IS_MIN_VALUE        => number::is_min(value_as_f64(value), param_f64(params, 0)),
        C_IS_MAX_VALUE        => number::is_max(value_as_f64(value), param_f64(params, 0)),
        C_IS_MULTIPLE_OF      => number::is_multiple_of(value_as_f64(value), param_f64(params, 0)),
        C_IS_EMAIL            => email::is_email(value_as_str(value)),
        C_IS_UUID             => uuid::is_uuid(value_as_str(value)),
        C_IS_UUID_V4          => uuid::is_uuid_v4(value_as_str(value)),
        C_IS_UUID_V7          => uuid::is_uuid_v7(value_as_str(value)),
        C_IS_URL              => url_val::is_url(value_as_str(value)),
        C_IS_URL_WITH_SCHEME  => url_val::is_url_with_scheme(value_as_str(value), &param_string(params, 0)),
        C_IS_IP               => ip::is_ip(value_as_str(value)),
        C_IS_IPV4             => ip::is_ipv4(value_as_str(value)),
        C_IS_IPV6             => ip::is_ipv6(value_as_str(value)),
        C_IS_DATE             => date::is_date(value_as_str(value)),
        C_IS_DATETIME         => date::is_datetime(value_as_str(value)),
        C_IS_TIME             => date::is_time(value_as_str(value)),
        C_IS_BOOLEAN_STRING   => match value {
            FieldValue::Bool(_) => true,
            _ => boolean::is_boolean_string(value_as_str(value)),
        },
        C_IS_CREDIT_CARD      => misc::is_credit_card(value_as_str(value)),
        C_IS_JSON             => misc::is_json(value_as_str(value)),
        C_IS_HEX_COLOR        => misc::is_hex_color(value_as_str(value)),
        C_IS_BASE64           => misc::is_base64(value_as_str(value)),
        C_IS_SLUG             => misc::is_slug(value_as_str(value)),
        _                     => false,
    }
}

/// Convert a rule name string back to its u8 code — used only in the legacy Str path of run_codes().
pub(crate) fn name_to_code(name: &str) -> u8 {
    match name {
        "isNotEmpty"        => 0,  "isMinLength"       => 1,  "isMaxLength"       => 2,
        "isExactLength"     => 3,  "isLengthBetween"   => 4,  "isAlpha"           => 5,
        "isAlphanumeric"    => 6,  "isNumeric"         => 7,  "isAscii"           => 8,
        "isLowercase"       => 9,  "isUppercase"       => 10, "isContains"        => 11,
        "isStartsWith"      => 12, "isEndsWith"        => 13, "isMatchesRegex"    => 14,
        "isInteger"         => 15, "isPositiveInteger" => 16, "isNegativeInteger" => 17,
        "isFloat"           => 18, "isPositiveNumber"  => 19, "isNegativeNumber"  => 20,
        "isInRange"         => 21, "isMinValue"        => 22, "isMaxValue"        => 23,
        "isMultipleOf"      => 24, "isEmail"           => 25, "isUuid"            => 26,
        "isUuidV4"          => 27, "isUuidV7"          => 28, "isUrl"             => 29,
        "isUrlWithScheme"   => 30, "isIp"              => 31, "isIpv4"            => 32,
        "isIpv6"            => 33, "isDate"            => 34, "isDatetime"        => 35,
        "isTime"            => 36, "isBooleanString"   => 37, "isCreditCard"      => 38,
        "isJson"            => 39, "isHexColor"        => 40, "isBase64"          => 41,
        "isSlug"            => 42,
        _                   => 255,
    }
}

/// Convert a rule code back to its name string — used only when generating error messages.
pub(crate) fn code_to_name(code: u32) -> &'static str {
    match code {
        C_IS_NOT_EMPTY        => "isNotEmpty",
        C_IS_MIN_LENGTH       => "isMinLength",
        C_IS_MAX_LENGTH       => "isMaxLength",
        C_IS_EXACT_LENGTH     => "isExactLength",
        C_IS_LENGTH_BETWEEN   => "isLengthBetween",
        C_IS_ALPHA            => "isAlpha",
        C_IS_ALPHANUMERIC     => "isAlphanumeric",
        C_IS_NUMERIC          => "isNumeric",
        C_IS_ASCII            => "isAscii",
        C_IS_LOWERCASE        => "isLowercase",
        C_IS_UPPERCASE        => "isUppercase",
        C_IS_CONTAINS         => "isContains",
        C_IS_STARTS_WITH      => "isStartsWith",
        C_IS_ENDS_WITH        => "isEndsWith",
        C_IS_MATCHES_REGEX    => "isMatchesRegex",
        C_IS_INTEGER          => "isInteger",
        C_IS_POSITIVE_INTEGER => "isPositiveInteger",
        C_IS_NEGATIVE_INTEGER => "isNegativeInteger",
        C_IS_FLOAT            => "isFloat",
        C_IS_POSITIVE_NUMBER  => "isPositiveNumber",
        C_IS_NEGATIVE_NUMBER  => "isNegativeNumber",
        C_IS_IN_RANGE         => "isInRange",
        C_IS_MIN_VALUE        => "isMinValue",
        C_IS_MAX_VALUE        => "isMaxValue",
        C_IS_MULTIPLE_OF      => "isMultipleOf",
        C_IS_EMAIL            => "isEmail",
        C_IS_UUID             => "isUuid",
        C_IS_UUID_V4          => "isUuidV4",
        C_IS_UUID_V7          => "isUuidV7",
        C_IS_URL              => "isUrl",
        C_IS_URL_WITH_SCHEME  => "isUrlWithScheme",
        C_IS_IP               => "isIp",
        C_IS_IPV4             => "isIpv4",
        C_IS_IPV6             => "isIpv6",
        C_IS_DATE             => "isDate",
        C_IS_DATETIME         => "isDatetime",
        C_IS_TIME             => "isTime",
        C_IS_BOOLEAN_STRING   => "isBooleanString",
        C_IS_CREDIT_CARD      => "isCreditCard",
        C_IS_JSON             => "isJson",
        C_IS_HEX_COLOR        => "isHexColor",
        C_IS_BASE64           => "isBase64",
        C_IS_SLUG             => "isSlug",
        _                     => "unknown",
    }
}

// ─── String-name dispatcher (backward compat) ─────────────────────────────────

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
