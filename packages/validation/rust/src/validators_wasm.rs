//! WASM bindings — exposes every validator/sanitizer/converter as an individual
//! JS-callable function.  All names match the original validator.js API.
//!
//! Build with:  cargo build --target wasm32-unknown-unknown --features wasm
//!   or:        wasm-pack build --target web --features wasm

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::validators::{
    boolean, convert, date, email, finance, hash, identity, ip, locale_codes, misc, number,
    sanitizer, string, unicode, url, uuid,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn opt_str(s: Option<String>) -> Option<String> { s }

// ─── Email ────────────────────────────────────────────────────────────────────

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isEmail"))]
pub fn is_email(str: &str) -> bool { email::is_email(str) }

// ─── URL / URI ───────────────────────────────────────────────────────────────

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isURL"))]
pub fn is_url(str: &str) -> bool { url::is_url(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isDataURI"))]
pub fn is_data_uri(str: &str) -> bool { url::is_data_uri(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isMagnetURI"))]
pub fn is_magnet_uri(str: &str) -> bool { url::is_magnet_uri(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isMailtoURI"))]
pub fn is_mailto_uri(str: &str) -> bool { url::is_mailto_uri(str) }

// ─── Network ─────────────────────────────────────────────────────────────────

/// version: 0 = any, 4 = IPv4 only, 6 = IPv6 only
#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isIP"))]
pub fn is_ip(str: &str, version: u8) -> bool {
    match version {
        4 => ip::is_ipv4(str),
        6 => ip::is_ipv6(str),
        _ => ip::is_ip(str),
    }
}

/// version: 0 = any, 4 = IPv4 CIDR, 6 = IPv6 CIDR
#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isIPRange"))]
pub fn is_ip_range(str: &str, version: u8) -> bool {
    let v = if version == 0 { None } else { Some(version) };
    ip::is_ip_range(str, v)
}

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isMACAddress"))]
pub fn is_mac_address(str: &str) -> bool { ip::is_mac_address(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isFQDN"))]
pub fn is_fqdn(str: &str) -> bool { ip::is_fqdn(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isPort"))]
pub fn is_port(str: &str) -> bool { ip::is_port(str) }

// ─── Date / Time ─────────────────────────────────────────────────────────────

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isDate"))]
pub fn is_date(str: &str) -> bool { date::is_date(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isTime"))]
pub fn is_time(str: &str) -> bool { date::is_time(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isISO8601"))]
pub fn is_iso8601(str: &str) -> bool { date::is_iso8601(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isRFC3339"))]
pub fn is_rfc3339(str: &str) -> bool { date::is_rfc3339(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isAfter"))]
pub fn is_after(str: &str, date: &str) -> bool { date::is_after(str, date) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isBefore"))]
pub fn is_before(str: &str, date: &str) -> bool { date::is_before(str, date) }

// ─── Boolean ─────────────────────────────────────────────────────────────────

/// loose = true also accepts "yes"/"no"
#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isBoolean"))]
pub fn is_boolean(str: &str, loose: bool) -> bool {
    if loose { boolean::is_boolean_loose(str) } else { boolean::is_boolean(str) }
}

// ─── String ───────────────────────────────────────────────────────────────────

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isEmpty"))]
pub fn is_empty(str: &str) -> bool { string::is_empty(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isAlpha"))]
pub fn is_alpha(str: &str) -> bool { string::is_alpha(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isAlphanumeric"))]
pub fn is_alphanumeric(str: &str) -> bool { string::is_alphanumeric(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isNumeric"))]
pub fn is_numeric(str: &str) -> bool { string::is_numeric(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isAscii"))]
pub fn is_ascii(str: &str) -> bool { string::is_ascii(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isLowercase"))]
pub fn is_lowercase(str: &str) -> bool { string::is_lowercase(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isUppercase"))]
pub fn is_uppercase(str: &str) -> bool { string::is_uppercase(str) }

/// max = 0 means unlimited
#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isLength"))]
pub fn is_length(str: &str, min: usize, max: usize) -> bool { string::is_length(str, min, max) }

/// max = 0 means unlimited
#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isByteLength"))]
pub fn is_byte_length(str: &str, min: usize, max: usize) -> bool { string::is_byte_length(str, min, max) }

/// values_json: JSON array of strings, e.g. '["foo","bar"]'
#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isIn"))]
pub fn is_in(str: &str, values_json: &str) -> bool {
    if let Ok(arr) = serde_json::from_str::<Vec<String>>(values_json) {
        let refs: Vec<&str> = arr.iter().map(|s| s.as_str()).collect();
        return string::is_in(str, &refs);
    }
    false
}

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isWhitelisted"))]
pub fn is_whitelisted(str: &str, chars: &str) -> bool { string::is_whitelisted(str, chars) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "equals"))]
pub fn equals(a: &str, b: &str) -> bool { string::equals(a, b) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "contains"))]
pub fn contains(str: &str, seed: &str) -> bool { string::contains(str, seed) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "matches"))]
pub fn matches(str: &str, pattern: &str) -> bool { string::matches(str, pattern) }

// ─── Numbers ─────────────────────────────────────────────────────────────────

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isInt"))]
pub fn is_int(str: &str) -> bool { number::is_int(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isFloat"))]
pub fn is_float(str: &str) -> bool { number::is_float(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isDecimal"))]
pub fn is_decimal(str: &str) -> bool { number::is_decimal(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isHexadecimal"))]
pub fn is_hexadecimal(str: &str) -> bool { number::is_hexadecimal(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isOctal"))]
pub fn is_octal(str: &str) -> bool { number::is_octal(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isDivisibleBy"))]
pub fn is_divisible_by(str: &str, num: i64) -> bool { number::is_divisible_by(str, num) }

// ─── Colors ──────────────────────────────────────────────────────────────────

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isHexColor"))]
pub fn is_hex_color(str: &str) -> bool { misc::is_hex_color(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isRgbColor"))]
pub fn is_rgb_color(str: &str) -> bool { misc::is_rgb_color(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isHSL"))]
pub fn is_hsl(str: &str) -> bool { misc::is_hsl(str) }

// ─── Encoding ────────────────────────────────────────────────────────────────

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isBase32"))]
pub fn is_base32(str: &str) -> bool { misc::is_base32(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isBase58"))]
pub fn is_base58(str: &str) -> bool { misc::is_base58(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isBase64"))]
pub fn is_base64(str: &str) -> bool { misc::is_base64(str) }

// ─── Format / Media ──────────────────────────────────────────────────────────

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isMimeType"))]
pub fn is_mime_type(str: &str) -> bool { misc::is_mime_type(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isLatLong"))]
pub fn is_lat_long(str: &str) -> bool { misc::is_lat_long(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isLocale"))]
pub fn is_locale(str: &str) -> bool { misc::is_locale(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isSlug"))]
pub fn is_slug(str: &str) -> bool { misc::is_slug(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isSemVer"))]
pub fn is_sem_ver(str: &str) -> bool { misc::is_sem_ver(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isJSON"))]
pub fn is_json(str: &str) -> bool { misc::is_json(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isISO6346"))]
pub fn is_iso6346(str: &str) -> bool { misc::is_iso6346(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isFreightContainerID"))]
pub fn is_freight_container_id(str: &str) -> bool { misc::is_freight_container_id(str) }

// ─── UUID / ID ────────────────────────────────────────────────────────────────

/// version: 0 = any UUID, 4 = v4, 7 = v7
#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isUUID"))]
pub fn is_uuid(str: &str, version: u8) -> bool {
    match version {
        4 => uuid::is_uuid_v4(str),
        7 => uuid::is_uuid_v7(str),
        _ => uuid::is_uuid(str),
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isULID"))]
pub fn is_ulid(str: &str) -> bool { uuid::is_ulid(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isMongoId"))]
pub fn is_mongo_id(str: &str) -> bool { uuid::is_mongo_id(str) }

// ─── Finance ─────────────────────────────────────────────────────────────────

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isCreditCard"))]
pub fn is_credit_card(str: &str) -> bool { finance::is_credit_card(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isLuhnNumber"))]
pub fn is_luhn_number(str: &str) -> bool { finance::is_luhn_number(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isIBAN"))]
pub fn is_iban(str: &str) -> bool { finance::is_iban(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isBIC"))]
pub fn is_bic(str: &str) -> bool { finance::is_bic(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isEAN"))]
pub fn is_ean(str: &str) -> bool { finance::is_ean(str) }

/// version: 0 = any, 10 = ISBN-10, 13 = ISBN-13
#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isISBN"))]
pub fn is_isbn(str: &str, version: u8) -> bool {
    match version {
        10 => finance::is_isbn10(str),
        13 => finance::is_isbn13(str),
        _  => finance::is_isbn(str),
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isISIN"))]
pub fn is_isin(str: &str) -> bool { finance::is_isin(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isISSN"))]
pub fn is_issn(str: &str) -> bool { finance::is_issn(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isEthereumAddress"))]
pub fn is_ethereum_address(str: &str) -> bool { finance::is_ethereum_address(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isBtcAddress"))]
pub fn is_btc_address(str: &str) -> bool { finance::is_btc_address(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isCurrency"))]
pub fn is_currency(str: &str) -> bool { finance::is_currency(str) }

// ─── Hash ─────────────────────────────────────────────────────────────────────

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isMD5"))]
pub fn is_md5(str: &str) -> bool { hash::is_md5(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isHash"))]
pub fn is_hash(str: &str, algorithm: &str) -> bool { hash::is_hash(str, algorithm) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isJWT"))]
pub fn is_jwt(str: &str) -> bool { hash::is_jwt(str) }

// ─── Identity / Document ─────────────────────────────────────────────────────

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isIMEI"))]
pub fn is_imei(str: &str) -> bool { identity::is_imei(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isAbaRouting"))]
pub fn is_aba_routing(str: &str) -> bool { identity::is_aba_routing(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isISRC"))]
pub fn is_isrc(str: &str) -> bool { identity::is_isrc(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isPassportNumber"))]
pub fn is_passport_number(str: &str, locale: &str) -> bool { identity::is_passport_number(str, locale) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isIdentityCard"))]
pub fn is_identity_card(str: &str, locale: &str) -> bool { identity::is_identity_card(str, locale) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isTaxID"))]
pub fn is_tax_id(str: &str, locale: &str) -> bool { identity::is_tax_id(str, locale) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isMobilePhone"))]
pub fn is_mobile_phone(str: &str, locale: &str) -> bool { identity::is_mobile_phone(str, locale) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isPostalCode"))]
pub fn is_postal_code(str: &str, locale: &str) -> bool { identity::is_postal_code(str, locale) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isLicensePlate"))]
pub fn is_license_plate(str: &str, locale: &str) -> bool { identity::is_license_plate(str, locale) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isVAT"))]
pub fn is_vat(str: &str, locale: &str) -> bool { identity::is_vat(str, locale) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isStrongPassword"))]
pub fn is_strong_password(str: &str) -> bool { identity::is_strong_password(str) }

// ─── ISO codes ────────────────────────────────────────────────────────────────

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isISO6391"))]
pub fn is_iso6391(str: &str) -> bool { locale_codes::is_iso6391(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isISO31661Alpha2"))]
pub fn is_iso31661_alpha2(str: &str) -> bool { locale_codes::is_iso31661_alpha2(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isISO31661Alpha3"))]
pub fn is_iso31661_alpha3(str: &str) -> bool { locale_codes::is_iso31661_alpha3(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isISO31661Numeric"))]
pub fn is_iso31661_numeric(str: &str) -> bool { locale_codes::is_iso31661_numeric(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isISO4217"))]
pub fn is_iso4217(str: &str) -> bool { locale_codes::is_iso4217(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isISO15924"))]
pub fn is_iso15924(str: &str) -> bool { locale_codes::is_iso15924(str) }

// ─── Unicode ─────────────────────────────────────────────────────────────────

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isFullWidth"))]
pub fn is_full_width(str: &str) -> bool { unicode::is_full_width(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isHalfWidth"))]
pub fn is_half_width(str: &str) -> bool { unicode::is_half_width(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isVariableWidth"))]
pub fn is_variable_width(str: &str) -> bool { unicode::is_variable_width(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isMultibyte"))]
pub fn is_multibyte(str: &str) -> bool { unicode::is_multibyte(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "isSurrogatePair"))]
pub fn is_surrogate_pair(str: &str) -> bool { unicode::is_surrogate_pair(str) }

// ─── Sanitizers ──────────────────────────────────────────────────────────────

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "ltrim"))]
pub fn ltrim(str: &str, chars: Option<String>) -> String {
    sanitizer::ltrim(str, chars.as_deref())
}

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "rtrim"))]
pub fn rtrim(str: &str, chars: Option<String>) -> String {
    sanitizer::rtrim(str, chars.as_deref())
}

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "trim"))]
pub fn trim(str: &str, chars: Option<String>) -> String {
    sanitizer::trim(str, chars.as_deref())
}

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "escape"))]
pub fn escape(str: &str) -> String { sanitizer::escape(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "unescape"))]
pub fn unescape(str: &str) -> String { sanitizer::unescape(str) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "stripLow"))]
pub fn strip_low(str: &str, keep_new_lines: bool) -> String {
    sanitizer::strip_low(str, keep_new_lines)
}

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "whitelist"))]
pub fn whitelist(str: &str, chars: &str) -> String { sanitizer::whitelist(str, chars) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "blacklist"))]
pub fn blacklist(str: &str, chars: &str) -> String { sanitizer::blacklist(str, chars) }

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "normalizeEmail"))]
pub fn normalize_email(str: &str) -> Option<String> { sanitizer::normalize_email(str) }

// ─── Converters ──────────────────────────────────────────────────────────────

/// Returns timestamp (ms since epoch) or NaN if invalid
#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "toDate"))]
pub fn to_date_wasm(str: &str) -> f64 {
    match convert::to_date(str) {
        Some(d) => {
            // Convert NaiveDate to Unix timestamp (days * 86400 * 1000 ms)
            (d.and_hms_opt(0, 0, 0).map(|dt| dt.and_utc().timestamp_millis()).unwrap_or(0)) as f64
        }
        None => f64::NAN,
    }
}

/// Returns parsed float or NaN
#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "toFloat"))]
pub fn to_float_wasm(str: &str) -> f64 {
    convert::to_float(str).unwrap_or(f64::NAN)
}

/// Returns parsed integer or NaN (radix 10 default)
#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "toInt"))]
pub fn to_int_wasm(str: &str, radix: u32) -> f64 {
    convert::to_int(str, Some(radix)).map(|n| n as f64).unwrap_or(f64::NAN)
}

#[cfg_attr(feature = "wasm", wasm_bindgen(js_name = "toBoolean"))]
pub fn to_boolean_wasm(str: &str, strict: bool) -> bool {
    if strict { convert::to_boolean(str) } else { convert::to_boolean_loose(str) }
}
