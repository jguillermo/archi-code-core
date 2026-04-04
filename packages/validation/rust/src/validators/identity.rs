use once_cell::sync::Lazy;
use regex::Regex;

// ─── Compiled regexes ────────────────────────────────────────────────────────

static IMEI_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[0-9]{15}$").unwrap());
static IMEI_HYPHEN_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^\d{2}-\d{6}-\d{6}-\d{1}$").unwrap());
// Note: Rust regex doesn't support lookaheads. Validate the prefix range manually.
static ABA_DIGITS_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[0-9]{9}$").unwrap()
});
static ISRC_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[A-Z]{2}[0-9A-Z]{3}\d{2}\d{5}$").unwrap());

// ─── IMEI ─────────────────────────────────────────────────────────────────────

/// isIMEI — validates an IMEI number using Luhn algorithm
pub fn is_imei(value: &str) -> bool {
    let normalized = if IMEI_HYPHEN_RE.is_match(value) {
        value.replace('-', "")
    } else if IMEI_RE.is_match(value) {
        value.to_string()
    } else {
        return false;
    };

    let digits: Vec<u32> = normalized.chars().filter_map(|c| c.to_digit(10)).collect();
    if digits.len() != 15 {
        return false;
    }

    let sum: u32 = digits.iter().rev().enumerate().map(|(i, &d)| {
        if i % 2 == 1 {
            let doubled = d * 2;
            if doubled > 9 { doubled - 9 } else { doubled }
        } else {
            d
        }
    }).sum();

    sum % 10 == 0
}

// ─── ABA Routing Number ──────────────────────────────────────────────────────

pub fn is_aba_routing(value: &str) -> bool {
    if !ABA_DIGITS_RE.is_match(value) {
        return false;
    }
    // Valid first-two-digit prefixes per ABA spec (reserved are excluded)
    let prefix: u32 = value[..2].parse().unwrap_or(0);
    let valid_prefix = (1..=12).contains(&prefix)
        || (21..=32).contains(&prefix)
        || (61..=72).contains(&prefix)
        || prefix == 80;
    if !valid_prefix {
        return false;
    }
    let digits: Vec<u32> = value.chars().filter_map(|c| c.to_digit(10)).collect();
    let mut checksum: u32 = 0;
    for (i, &d) in digits.iter().enumerate() {
        checksum += match i % 3 {
            0 => d * 3,
            1 => d * 7,
            _ => d,
        };
    }
    checksum % 10 == 0
}

// ─── ISRC ────────────────────────────────────────────────────────────────────

pub fn is_isrc(value: &str) -> bool {
    ISRC_RE.is_match(value)
}

// ─── Strong Password ─────────────────────────────────────────────────────────

pub struct PasswordOptions {
    pub min_length: usize,
    pub min_lowercase: usize,
    pub min_uppercase: usize,
    pub min_numbers: usize,
    pub min_symbols: usize,
}

impl Default for PasswordOptions {
    fn default() -> Self {
        Self { min_length: 8, min_lowercase: 1, min_uppercase: 1, min_numbers: 1, min_symbols: 1 }
    }
}

pub fn is_strong_password(value: &str) -> bool {
    is_strong_password_with_options(value, &PasswordOptions::default())
}

pub fn is_strong_password_with_options(value: &str, opts: &PasswordOptions) -> bool {
    if value.len() < opts.min_length {
        return false;
    }
    let symbols = r#"-#!$@£%^&*()_+|~=`{}\[\]:";'<>?,./ \"#;
    let lowercase = value.chars().filter(|c| c.is_ascii_lowercase()).count();
    let uppercase = value.chars().filter(|c| c.is_ascii_uppercase()).count();
    let numbers = value.chars().filter(|c| c.is_ascii_digit()).count();
    let sym = value.chars().filter(|c| symbols.contains(*c)).count();
    lowercase >= opts.min_lowercase
        && uppercase >= opts.min_uppercase
        && numbers >= opts.min_numbers
        && sym >= opts.min_symbols
}

// ─── Passport Number (simplified common countries) ───────────────────────────

/// isPassportNumber — locale can be "any" for loose check, or an ISO 3166-1 alpha-2 code
pub fn is_passport_number(value: &str, locale: &str) -> bool {
    let pattern: Option<&str> = match locale.to_uppercase().as_str() {
        "AM" => Some(r"^[A-Z]{2}\d{7}$"),
        "AR" => Some(r"^[A-Z]{3}\d{6}$"),
        "AT" | "AU" | "CH" => Some(r"^[A-Z]\d{7}$"),
        "BE" | "BR" | "CA" | "BY" => Some(r"^[A-Z]{2}\d{6}$"),
        "BG" | "CZ" | "DK" => Some(r"^\d{9}$"),
        "DE" => Some(r"^[CFGHJKLMNPRTVWXYZ0-9]{9}$"),
        "US" => Some(r"^[A-Z0-9]{9}$"),
        "GB" => Some(r"^[0-9]{9}$"),
        "FR" => Some(r"^[0-9A-Z]{9}$"),
        "ES" => Some(r"^[A-Z0-9]{9}$"),
        "IT" => Some(r"^[A-Z0-9]{9}$"),
        "JP" => Some(r"^[A-Z]{2}[0-9]{7}$"),
        "CN" => Some(r"^G\d{8}$|^E[A-Z0-9]\d{7}$"),
        "RU" => Some(r"^[0-9]{9}$"),
        "IN" => Some(r"^[A-Z]{1}-?\d{7}$"),
        "MX" => Some(r"^[A-Z0-9]{9}$"),
        "NL" => Some(r"^[A-Z]{2}[A-Z0-9]{6}\d$"),
        "PL" => Some(r"^[A-Z]{2}\d{7}$"),
        "PT" => Some(r"^[A-Z]\d{6}$"),
        "SE" => Some(r"^\d{8}$"),
        "TR" => Some(r"^[A-Z]\d{8}$"),
        "UA" => Some(r"^[A-Z]{2}\d{6}$"),
        "ANY" | _ => None,
    };
    match pattern {
        Some(pat) => Regex::new(pat).map(|re| re.is_match(value)).unwrap_or(false),
        None => !value.is_empty() && value.len() >= 6 && value.len() <= 20,
    }
}

// ─── Mobile Phone ────────────────────────────────────────────────────────────

pub fn is_mobile_phone(value: &str, locale: &str) -> bool {
    let pattern = match locale {
        "en-US" | "en-CA" => r"^\+?1?[\s.\-]?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}$",
        "en-GB"           => r"^(\+44|0)7\d{9}$",
        "de-DE"           => r"^(\+49|0)(15|16|17)\d{8,9}$",
        "fr-FR"           => r"^(\+33|0)[67]\d{8}$",
        "es-ES"           => r"^(\+34)?[6-7]\d{8}$",
        "it-IT"           => r"^(\+39)?3\d{9}$",
        "zh-CN"           => r"^(\+86|0)?1[3-9]\d{9}$",
        "ja-JP"           => r"^(\+81|0)[789]0[\s\-]?\d{4}[\s\-]?\d{4}$",
        "pt-BR"           => r"^(\+55|0)?[1-9]{2}9?\d{8}$",
        "ru-RU"           => r"^(\+7|8)(9\d{9}|[3489]\d{9})$",
        "ar-SA"           => r"^(\+966)?05\d{8}$",
        "ko-KR"           => r"^(\+82)?01[0-9]\d{7,8}$",
        "tr-TR"           => r"^(\+90|0)5\d{9}$",
        "pl-PL"           => r"^(\+48)?[5-8]\d{8}$",
        _                 => r"^\+?[\d\s\-.()/]{7,20}$",
    };
    regex::Regex::new(pattern).map(|re| re.is_match(value)).unwrap_or(false)
}

// ─── Postal Code ─────────────────────────────────────────────────────────────

pub fn is_postal_code(value: &str, locale: &str) -> bool {
    let pattern = match locale {
        "US" => r"^\d{5}(-\d{4})?$",
        "GB" => r"^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$",
        "CA" => r"^[A-Z]\d[A-Z]\s?\d[A-Z]\d$",
        "DE" => r"^\d{5}$",
        "FR" => r"^\d{5}$",
        "IT" => r"^\d{5}$",
        "ES" => r"^\d{5}$",
        "BR" => r"^\d{5}-?\d{3}$",
        "JP" => r"^\d{3}-?\d{4}$",
        "CN" => r"^\d{6}$",
        "RU" => r"^\d{6}$",
        "AU" => r"^\d{4}$",
        "AT" | "BE" | "CH" | "DK" | "NL" | "NO" | "PT" | "SE" => r"^\d{4}$",
        "PL" => r"^\d{2}-\d{3}$",
        "IN" => r"^\d{6}$",
        "MX" => r"^\d{5}$",
        "NZ" => r"^\d{4}$",
        "ZA" => r"^\d{4}$",
        "AR" => r"^([A-Z]\d{4}[A-Z]{3}|\d{4})$",
        _    => r"^[\d\s\-A-Z]{3,10}$",
    };
    regex::Regex::new(pattern).map(|re| re.is_match(value.trim())).unwrap_or(false)
}

// ─── License Plate ───────────────────────────────────────────────────────────

pub fn is_license_plate(value: &str, locale: &str) -> bool {
    let pattern = match locale {
        "de-DE" => r"^[A-ZÄÖÜ]{1,3}-[A-Z]{1,2}\d{1,4}(E|H)?$",
        "en-US" => r"^[A-Z0-9\s\-]{2,8}$",
        "en-GB" => r"^[A-Z]{2}\d{2}\s?[A-Z]{3}$",
        "fr-FR" => r"^[A-Z]{2}-?\d{3}-?[A-Z]{2}$",
        "es-ES" => r"^\d{4}[A-Z]{3}$",
        "it-IT" => r"^[A-Z]{2}\d{3}[A-Z]{2}$",
        "pt-BR" => r"^[A-Z]{3}-?\d[A-Z0-9]\d{2}$",
        "zh-CN" => r"^[\u4e00-\u9fa5][A-Z][A-Z0-9]{5}$",
        "ja-JP" => r"^[\u3040-\u30ff\u4e00-\u9faf]{1,4}\s?\d{2,3}\s?[A-Zあ-ん\u30a0-\u30ff]\s?\d{4}$",
        "ru-RU" => r"^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$",
        "pl-PL" => r"^[A-Z]{2,3}\s?\d{4,5}$",
        "nl-NL" => r"^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$",
        "sv-SE" => r"^[A-Z]{3}\s?\d{2}[A-Z0-9]$",
        _       => r"^[A-Z0-9\s\-]{4,10}$",
    };
    regex::Regex::new(pattern).map(|re| re.is_match(value)).unwrap_or(false)
}

// ─── Identity Card ───────────────────────────────────────────────────────────

pub fn is_identity_card(value: &str, locale: &str) -> bool {
    let pattern = match locale {
        "US" => r"^\d{9}$",                         // SSN (no dashes)
        "GB" => r"^[A-Z]{2}\d{6}[A-D]?$",          // NI number
        "DE" => r"^[A-Z0-9]{9}$",                   // Personalausweis
        "FR" => r"^\d{12}$",                         // CNI
        "ES" => r"^\d{8}[A-Z]$",                    // DNI
        "IT" => r"^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$", // codice fiscale
        "CN" => r"^\d{17}[\dX]$",                   // 18-digit ID
        "IN" => r"^\d{12}$",                         // Aadhaar
        "BR" => r"^\d{11}$",                         // CPF
        "MX" => r"^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$",
        "TR" => r"^\d{11}$",
        "KR" => r"^\d{6}-?\d{7}$",
        "PL" => r"^\d{11}$",                         // PESEL
        "NL" => r"^\d{9}$",                          // BSN
        "SE" => r"^\d{6}[-+]\d{4}$",                // personnummer
        "NO" => r"^\d{11}$",
        "ZA" => r"^\d{13}$",
        _    => r"^[A-Z0-9]{6,20}$",
    };
    regex::Regex::new(pattern).map(|re| re.is_match(value)).unwrap_or(false)
}

// ─── Tax ID ───────────────────────────────────────────────────────────────────

pub fn is_tax_id(value: &str, locale: &str) -> bool {
    let pattern = match locale {
        "US" => r"^\d{2}-?\d{7}$",                         // EIN
        "GB" => r"^\d{10}$",                               // UTR
        "DE" => r"^\d{11}$",                               // Steuernummer
        "FR" => r"^\d{13}$",                               // NIF
        "ES" => r"^[A-Z]\d{7}[A-Z0-9]$",                  // CIF
        "IT" => r"^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$", // codice fiscale
        "BR" => r"^\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}$", // CNPJ
        "CA" => r"^\d{9}$",                               // BN
        "AU" => r"^\d{11}$",                              // ABN
        "IN" => r"^[A-Z]{5}\d{4}[A-Z]$",                  // PAN
        "CN" => r"^[\dA-Z]{15,20}$",
        "MX" => r"^[A-Z]{4}\d{6}[A-Z0-9]{3}$",
        "RU" => r"^\d{10}(\d{2})?$",
        "JP" => r"^\d{12}$",
        "KR" => r"^\d{10}$",
        "TR" => r"^\d{10}$",
        "ZA" => r"^\d{10}$",
        _    => r"^[A-Z0-9\-]{6,20}$",
    };
    regex::Regex::new(pattern).map(|re| re.is_match(value)).unwrap_or(false)
}

// ─── VAT ─────────────────────────────────────────────────────────────────────

pub fn is_vat(value: &str, locale: &str) -> bool {
    let pattern = match locale {
        "AT" => r"^ATU\d{8}$",
        "BE" => r"^BE0\d{9}$",
        "BG" => r"^BG\d{9,10}$",
        "CY" => r"^CY\d{8}[A-Z]$",
        "CZ" => r"^CZ\d{8,10}$",
        "DE" => r"^DE\d{9}$",
        "DK" => r"^DK\d{8}$",
        "EE" => r"^EE\d{9}$",
        "GR" => r"^(EL|GR)\d{9}$",
        "ES" => r"^ES[A-Z0-9]\d{7}[A-Z0-9]$",
        "FI" => r"^FI\d{8}$",
        "FR" => r"^FR[A-Z0-9]{2}\d{9}$",
        "HR" => r"^HR\d{11}$",
        "HU" => r"^HU\d{8}$",
        "IE" => r"^IE\d[A-Z0-9\+\*]\d{5}[A-Z]{1,2}$",
        "IT" => r"^IT\d{11}$",
        "LT" => r"^LT(\d{9}|\d{12})$",
        "LU" => r"^LU\d{8}$",
        "LV" => r"^LV\d{11}$",
        "MT" => r"^MT\d{8}$",
        "NL" => r"^NL\d{9}B\d{2}$",
        "PL" => r"^PL\d{10}$",
        "PT" => r"^PT\d{9}$",
        "RO" => r"^RO\d{2,10}$",
        "SE" => r"^SE\d{12}$",
        "SI" => r"^SI\d{8}$",
        "SK" => r"^SK\d{10}$",
        "GB" => r"^GB(\d{9}|\d{12}|GD\d{3}|HA\d{3})$",
        _    => r"^[A-Z]{2}[A-Z0-9\+\*]{2,12}$",
    };
    regex::Regex::new(pattern).map(|re| re.is_match(value)).unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_imei() {
        assert!(is_imei("536498459191226"));
        assert!(!is_imei("536498459191225")); // bad checksum
        assert!(!is_imei("not-an-imei"));
    }

    #[test]
    fn test_aba_routing() {
        assert!(is_aba_routing("111000025"));
        assert!(!is_aba_routing("111000026")); // bad checksum
        assert!(!is_aba_routing("000000000"));
    }

    #[test]
    fn test_isrc() {
        assert!(is_isrc("USRC17607839"));
        assert!(!is_isrc("not-an-isrc"));
    }

    #[test]
    fn test_strong_password() {
        assert!(is_strong_password("Test@1234"));
        assert!(!is_strong_password("weakpassword"));
        assert!(!is_strong_password("SHORT1!A"));
    }

    #[test]
    fn test_passport() {
        assert!(is_passport_number("A12345678", "US"));
        assert!(!is_passport_number("INVALID", "DE"));
    }
}
