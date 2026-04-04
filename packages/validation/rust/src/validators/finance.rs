use once_cell::sync::Lazy;
use regex::Regex;

// ─── Compiled regexes ────────────────────────────────────────────────────────

static BIC_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$").unwrap()
});
static EAN_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^(\d{8}|\d{13}|\d{14})$").unwrap()
});
static ISBN10_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^(?:[0-9]{9}X|[0-9]{10})$").unwrap()
});
static ISBN13_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[0-9]{13}$").unwrap()
});
static ISIN_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[A-Z]{2}[0-9A-Z]{9}[0-9]$").unwrap()
});
static ISSN_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^\d{4}-?\d{3}[\dXx]$").unwrap()
});
static ETH_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^0x[0-9a-fA-F]{40}$").unwrap()
});
static BTC_BECH32_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^(bc1|tb1|bc1p|tb1p)[ac-hj-np-z02-9]{39,58}$").unwrap()
});
static BTC_BASE58_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[123m][A-HJ-NP-Za-km-z1-9]{25,39}$").unwrap()
});

// Country codes for BIC validation (ISO 3166-1 alpha-2 + XK)
static ISO_COUNTRY_CODES: Lazy<std::collections::HashSet<&'static str>> = Lazy::new(|| {
    [
        "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
        "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ",
        "CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ",
        "DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET",
        "FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY",
        "HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT",
        "JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ",
        "LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ",
        "NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY",
        "QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ",
        "TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ",
        "UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW","XK",
    ].iter().cloned().collect()
});

// ─── Luhn algorithm ──────────────────────────────────────────────────────────

pub fn luhn(value: &str) -> bool {
    let digits: Vec<u32> = value
        .chars()
        .filter(|c| c.is_ascii_digit())
        .filter_map(|c| c.to_digit(10))
        .collect();

    if digits.is_empty() {
        return false;
    }

    let sum: u32 = digits
        .iter()
        .rev()
        .enumerate()
        .map(|(i, &d)| {
            if i % 2 == 1 {
                let doubled = d * 2;
                if doubled > 9 { doubled - 9 } else { doubled }
            } else {
                d
            }
        })
        .sum();

    sum % 10 == 0
}

pub fn is_luhn_number(value: &str) -> bool {
    luhn(value)
}

pub fn is_credit_card(value: &str) -> bool {
    let digits: Vec<u32> = value
        .chars()
        .filter(|c| c.is_ascii_digit())
        .filter_map(|c| c.to_digit(10))
        .collect();

    if digits.len() < 13 || digits.len() > 19 {
        return false;
    }

    luhn(value)
}

// ─── IBAN ─────────────────────────────────────────────────────────────────────

/// isIBAN — validates format + mod-97 checksum
pub fn is_iban(value: &str) -> bool {
    if value.len() < 5 || value.len() > 34 {
        return false;
    }
    let upper = value.to_uppercase();
    // Move first 4 chars to end
    let rearranged = format!("{}{}", &upper[4..], &upper[..4]);
    // Convert letters to digits (A=10, B=11, ...)
    let numeric: String = rearranged.chars().map(|c| {
        if c.is_ascii_alphabetic() {
            format!("{}", c as u32 - 'A' as u32 + 10)
        } else {
            c.to_string()
        }
    }).collect();
    // Compute mod 97 using chunks to avoid overflow
    let mut remainder: u64 = 0;
    for ch in numeric.chars() {
        remainder = remainder * 10 + ch.to_digit(10).unwrap_or(0) as u64;
        remainder %= 97;
    }
    remainder == 1
}

// ─── BIC / SWIFT ──────────────────────────────────────────────────────────────

pub fn is_bic(value: &str) -> bool {
    if !BIC_RE.is_match(value) {
        return false;
    }
    let country_code = &value[4..6].to_uppercase();
    ISO_COUNTRY_CODES.contains(country_code.as_str())
}

// ─── EAN ─────────────────────────────────────────────────────────────────────

pub fn is_ean(value: &str) -> bool {
    if !EAN_RE.is_match(value) {
        return false;
    }
    let digits: Vec<u32> = value.chars().filter_map(|c| c.to_digit(10)).collect();
    let len = digits.len();

    let (weights, expected_pos) = match len {
        8 => (vec![3u32, 1, 3, 1, 3, 1, 3], 7usize),
        13 => (vec![1u32, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3], 12usize),
        14 => (vec![3u32, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3], 13usize),
        _ => return false,
    };

    let sum: u32 = digits[..expected_pos].iter().zip(weights.iter()).map(|(d, w)| d * w).sum();
    let check = (10 - (sum % 10)) % 10;
    check == digits[expected_pos]
}

// ─── ISBN ─────────────────────────────────────────────────────────────────────

pub fn is_isbn10(value: &str) -> bool {
    let sanitized = value.replace([' ', '-'], "");
    if !ISBN10_RE.is_match(&sanitized) {
        return false;
    }
    let chars: Vec<char> = sanitized.chars().collect();
    let mut checksum: u32 = 0;
    for (i, &c) in chars[..9].iter().enumerate() {
        checksum += (i as u32 + 1) * c.to_digit(10).unwrap_or(0);
    }
    let last = chars[9];
    let last_val = if last == 'X' || last == 'x' { 10 } else { last.to_digit(10).unwrap_or(0) };
    checksum += 10 * last_val;
    checksum % 11 == 0
}

pub fn is_isbn13(value: &str) -> bool {
    let sanitized = value.replace([' ', '-'], "");
    if !ISBN13_RE.is_match(&sanitized) {
        return false;
    }
    let factor = [1u32, 3];
    let checksum: u32 = sanitized.chars().enumerate().map(|(i, c)| {
        factor[i % 2] * c.to_digit(10).unwrap_or(0)
    }).sum();
    checksum % 10 == 0
}

pub fn is_isbn(value: &str) -> bool {
    is_isbn10(value) || is_isbn13(value)
}

// ─── ISIN ─────────────────────────────────────────────────────────────────────

pub fn is_isin(value: &str) -> bool {
    if !ISIN_RE.is_match(value) {
        return false;
    }
    // Convert each char: letters become 2 digits (A=10..Z=35)
    let digits: Vec<u32> = value.chars().flat_map(|c| {
        if c.is_ascii_alphabetic() {
            let n = c as u32 - 'A' as u32 + 10;
            vec![n / 10, n % 10]
        } else {
            vec![c.to_digit(10).unwrap_or(0)]
        }
    }).collect();

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

// ─── ISSN ─────────────────────────────────────────────────────────────────────

pub fn is_issn(value: &str) -> bool {
    if !ISSN_RE.is_match(value) {
        return false;
    }
    let digits: String = value.replace('-', "").to_uppercase();
    let chars: Vec<char> = digits.chars().collect();
    if chars.len() != 8 {
        return false;
    }
    let checksum: u32 = chars[..7].iter().enumerate().map(|(i, &c)| {
        let d = if c == 'X' { 10 } else { c.to_digit(10).unwrap_or(0) };
        d * (8 - i as u32)
    }).sum();
    let last_d = if chars[7] == 'X' { 10 } else { chars[7].to_digit(10).unwrap_or(255) };
    (checksum + last_d) % 11 == 0
}

// ─── Ethereum / Bitcoin ───────────────────────────────────────────────────────

pub fn is_ethereum_address(value: &str) -> bool {
    ETH_RE.is_match(value)
}

pub fn is_btc_address(value: &str) -> bool {
    BTC_BECH32_RE.is_match(value) || BTC_BASE58_RE.is_match(value)
}

// ─── Currency ────────────────────────────────────────────────────────────────

static CURRENCY_RE: Lazy<Regex> = Lazy::new(|| {
    // Basic currency: optional symbol, optional negative, integer part, optional decimal
    Regex::new(r"^[+-]?[$€£¥₹₽¢]?[1-9]\d{0,2}(,\d{3})*(\.\d{1,4})?$|^[+-]?[$€£¥₹₽¢]?0(\.\d{1,4})?$").unwrap()
});

pub fn is_currency(value: &str) -> bool {
    CURRENCY_RE.is_match(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_luhn() {
        assert!(is_luhn_number("4532015112830366"));
        assert!(!is_luhn_number("1234567890123456"));
    }

    #[test]
    fn test_credit_card() {
        assert!(is_credit_card("4532015112830366")); // Visa
        assert!(is_credit_card("5425233430109903")); // Mastercard
        assert!(is_credit_card("378282246310005"));  // Amex test number
        assert!(!is_credit_card("1234567890123456"));
    }

    #[test]
    fn test_iban() {
        assert!(is_iban("GB82WEST12345698765432"));
        assert!(is_iban("DE89370400440532013000"));
        assert!(!is_iban("GB00WEST12345698765432")); // bad checksum
        assert!(!is_iban("INVALID"));
    }

    #[test]
    fn test_bic() {
        assert!(is_bic("DEUTDEDB"));
        assert!(is_bic("NEDSZAJJ"));
        assert!(!is_bic("INVALID"));
    }

    #[test]
    fn test_ean() {
        assert!(is_ean("96385074"));    // EAN-8
        assert!(is_ean("9780306406157")); // EAN-13
        assert!(!is_ean("12345678"));   // bad checksum
    }

    #[test]
    fn test_isbn() {
        assert!(is_isbn("978-3-16-148410-0")); // ISBN-13
        assert!(is_isbn("3-16-148410-X"));     // ISBN-10
        assert!(is_isbn("0-306-40615-2"));     // ISBN-10
        assert!(!is_isbn("invalid-isbn"));
    }

    #[test]
    fn test_isin() {
        assert!(is_isin("US0378331005"));
        assert!(is_isin("AU0000XVGZA3"));
        assert!(!is_isin("US0378331004")); // bad checksum
    }

    #[test]
    fn test_issn() {
        assert!(is_issn("0378-5955"));
        assert!(is_issn("03785955"));
        assert!(is_issn("2049-3630")); // valid ISSN
        assert!(!is_issn("1234-5678")); // bad checksum
    }

    #[test]
    fn test_eth() {
        assert!(is_ethereum_address("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"));
        assert!(!is_ethereum_address("0xINVALID"));
    }

    #[test]
    fn test_btc() {
        assert!(is_btc_address("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")); // genesis block
        assert!(is_btc_address("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")); // bech32
        assert!(!is_btc_address("invalid-btc-address"));
    }
}
