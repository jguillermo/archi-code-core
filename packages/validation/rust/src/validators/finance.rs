use once_cell::sync::Lazy;
use regex::Regex;

// ─── Credit Card regexes ───────────────────────────────────────────────────

static AMEX_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^3[47][0-9]{13}$").unwrap());
static DINERS_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^3(?:0[0-5]|[68][0-9])[0-9]{11}$").unwrap());
static DISCOVER_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^6(?:011|5[0-9][0-9])[0-9]{12,15}$").unwrap());
static JCB_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^(?:2131|1800|35\d{3})\d{11}$").unwrap());
static MASTERCARD_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^(5[1-5][0-9]{2}|(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12})$").unwrap()
});
static UNIONPAY_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^(6[27][0-9]{14}|81[0-9]{14,17})$").unwrap());
static VISA_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^(?:4[0-9]{12})(?:[0-9]{3,6})?$").unwrap());

// ─── Finance regexes ───────────────────────────────────────────────────────

static BIC_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$").unwrap());
static EAN_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^(\d{8}|\d{13}|\d{14})$").unwrap());
static ISBN10_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^(?:[0-9]{9}X|[0-9]{10})$").unwrap());
static ISBN13_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[0-9]{13}$").unwrap());
static ISIN_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[A-Z]{2}[0-9A-Z]{9}[0-9]$").unwrap());
static ISSN_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^\d{4}-?\d{3}[\dXx]$").unwrap());
static ETH_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^(0x)[0-9a-fA-F]{40}$").unwrap());
static BTC_BECH32_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^(bc1|tb1|bc1p|tb1p)[ac-hj-np-z02-9]{39,58}$").unwrap());
static BTC_BASE58_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[123m][A-HJ-NP-Za-km-z1-9]{25,39}$").unwrap());
static CURRENCY_RE: Lazy<Regex> = Lazy::new(|| {
    // Default: symbol=$, thousands=,  decimal=.
    Regex::new(r"^(\$)?(([1-9]\d{0,2}(,\d{3})*|[1-9]\d*|0)(\.\d{1,2})?|-?(\$)?(([1-9]\d{0,2}(,\d{3})*|[1-9]\d*|0)(\.\d{1,2})?))$").unwrap()
});

// ─── ISO country codes for BIC ──────────────────────────────────────────────

static BIC_COUNTRY_CODES: Lazy<std::collections::HashSet<&'static str>> = Lazy::new(|| {
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
        "UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW",
    ].iter().copied().collect()
});

// ─── IBAN regexes per country ──────────────────────────────────────────────

fn iban_regex_for(country: &str) -> Option<Regex> {
    let pattern = match country {
        "AD" => r"^AD[0-9]{2}\d{8}[A-Z0-9]{12}$",
        "AE" => r"^AE[0-9]{2}\d{19}$",
        "AL" => r"^AL[0-9]{2}\d{8}[A-Z0-9]{16}$",
        "AT" => r"^AT[0-9]{2}\d{16}$",
        "AZ" => r"^AZ[0-9]{2}[A-Z0-9]{4}\d{20}$",
        "BA" => r"^BA[0-9]{2}\d{16}$",
        "BE" => r"^BE[0-9]{2}\d{12}$",
        "BG" => r"^BG[0-9]{2}[A-Z]{4}\d{6}[A-Z0-9]{8}$",
        "BH" => r"^BH[0-9]{2}[A-Z]{4}[A-Z0-9]{14}$",
        "BR" => r"^BR[0-9]{2}\d{23}[A-Z]{1}[A-Z0-9]{1}$",
        "BY" => r"^BY[0-9]{2}[A-Z0-9]{4}\d{20}$",
        "CH" => r"^CH[0-9]{2}\d{5}[A-Z0-9]{12}$",
        "CR" => r"^CR[0-9]{2}\d{18}$",
        "CY" => r"^CY[0-9]{2}\d{8}[A-Z0-9]{16}$",
        "CZ" => r"^CZ[0-9]{2}\d{20}$",
        "DE" => r"^DE[0-9]{2}\d{18}$",
        "DK" => r"^DK[0-9]{2}\d{14}$",
        "DO" => r"^DO[0-9]{2}[A-Z]{4}\d{20}$",
        "DZ" => r"^DZ\d{24}$",
        "EE" => r"^EE[0-9]{2}\d{16}$",
        "EG" => r"^EG[0-9]{2}\d{25}$",
        "ES" => r"^ES[0-9]{2}\d{20}$",
        "FI" => r"^FI[0-9]{2}\d{14}$",
        "FO" => r"^FO[0-9]{2}\d{14}$",
        "FR" => r"^FR[0-9]{2}\d{10}[A-Z0-9]{11}\d{2}$",
        "GB" => r"^GB[0-9]{2}[A-Z]{4}\d{14}$",
        "GE" => r"^GE[0-9]{2}[A-Z0-9]{2}\d{16}$",
        "GI" => r"^GI[0-9]{2}[A-Z]{4}[A-Z0-9]{15}$",
        "GL" => r"^GL[0-9]{2}\d{14}$",
        "GR" => r"^GR[0-9]{2}\d{7}[A-Z0-9]{16}$",
        "GT" => r"^GT[0-9]{2}[A-Z0-9]{4}[A-Z0-9]{20}$",
        "HR" => r"^HR[0-9]{2}\d{17}$",
        "HU" => r"^HU[0-9]{2}\d{24}$",
        "IE" => r"^IE[0-9]{2}[A-Z]{4}\d{14}$",
        "IL" => r"^IL[0-9]{2}\d{19}$",
        "IQ" => r"^IQ[0-9]{2}[A-Z]{4}\d{15}$",
        "IR" => r"^IR[0-9]{2}\d{22}$",
        "IS" => r"^IS[0-9]{2}\d{22}$",
        "IT" => r"^IT[0-9]{2}[A-Z]{1}\d{10}[A-Z0-9]{12}$",
        "JO" => r"^JO[0-9]{2}[A-Z]{4}\d{22}$",
        "KW" => r"^KW[0-9]{2}[A-Z]{4}[A-Z0-9]{22}$",
        "KZ" => r"^KZ[0-9]{2}\d{3}[A-Z0-9]{13}$",
        "LB" => r"^LB[0-9]{2}\d{4}[A-Z0-9]{20}$",
        "LC" => r"^LC[0-9]{2}[A-Z]{4}[A-Z0-9]{24}$",
        "LI" => r"^LI[0-9]{2}\d{5}[A-Z0-9]{12}$",
        "LT" => r"^LT[0-9]{2}\d{16}$",
        "LU" => r"^LU[0-9]{2}\d{3}[A-Z0-9]{13}$",
        "LV" => r"^LV[0-9]{2}[A-Z]{4}[A-Z0-9]{13}$",
        "MA" => r"^MA[0-9]{26}$",
        "MC" => r"^MC[0-9]{2}\d{10}[A-Z0-9]{11}\d{2}$",
        "MD" => r"^MD[0-9]{2}[A-Z0-9]{20}$",
        "ME" => r"^ME[0-9]{2}\d{18}$",
        "MK" => r"^MK[0-9]{2}\d{3}[A-Z0-9]{10}\d{2}$",
        "MR" => r"^MR[0-9]{2}\d{23}$",
        "MT" => r"^MT[0-9]{2}[A-Z]{4}\d{5}[A-Z0-9]{18}$",
        "MU" => r"^MU[0-9]{2}[A-Z]{4}\d{19}[A-Z]{3}$",
        "MZ" => r"^MZ[0-9]{2}\d{21}$",
        "NL" => r"^NL[0-9]{2}[A-Z]{4}\d{10}$",
        "NO" => r"^NO[0-9]{2}\d{11}$",
        "PK" => r"^PK[0-9]{2}[A-Z0-9]{4}\d{16}$",
        "PL" => r"^PL[0-9]{2}\d{24}$",
        "PS" => r"^PS[0-9]{2}[A-Z]{4}[A-Z0-9]{21}$",
        "PT" => r"^PT[0-9]{2}\d{21}$",
        "QA" => r"^QA[0-9]{2}[A-Z]{4}[A-Z0-9]{21}$",
        "RO" => r"^RO[0-9]{2}[A-Z]{4}[A-Z0-9]{16}$",
        "RS" => r"^RS[0-9]{2}\d{18}$",
        "SA" => r"^SA[0-9]{2}\d{2}[A-Z0-9]{18}$",
        "SC" => r"^SC[0-9]{2}[A-Z]{4}\d{20}[A-Z]{3}$",
        "SE" => r"^SE[0-9]{2}\d{20}$",
        "SI" => r"^SI[0-9]{2}\d{15}$",
        "SK" => r"^SK[0-9]{2}\d{20}$",
        "SM" => r"^SM[0-9]{2}[A-Z]{1}\d{10}[A-Z0-9]{12}$",
        "SV" => r"^SV[0-9]{2}[A-Z0-9]{4}\d{20}$",
        "TL" => r"^TL[0-9]{2}\d{19}$",
        "TN" => r"^TN[0-9]{2}\d{20}$",
        "TR" => r"^TR[0-9]{2}\d{5}[A-Z0-9]{17}$",
        "UA" => r"^UA[0-9]{2}\d{6}[A-Z0-9]{19}$",
        "VA" => r"^VA[0-9]{2}\d{18}$",
        "VG" => r"^VG[0-9]{2}[A-Z]{4}\d{16}$",
        "XK" => r"^XK[0-9]{2}\d{16}$",
        _ => return None,
    };
    Regex::new(pattern).ok()
}

fn iban_checksum_valid(iban: &str) -> bool {
    let stripped: String = iban
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect::<String>()
        .to_uppercase();
    let rearranged = format!("{}{}", &stripped[4..], &stripped[..4]);
    let numeric: String = rearranged
        .chars()
        .map(|c| {
            if c.is_ascii_digit() {
                c.to_string()
            } else {
                ((c as u32) - 55).to_string()
            }
        })
        .collect();
    let remainder = numeric
        .as_bytes()
        .chunks(7)
        .fold(String::new(), |acc, chunk| {
            let s = format!("{}{}", acc, std::str::from_utf8(chunk).unwrap_or(""));
            let n: u64 = s.parse().unwrap_or(0);
            (n % 97).to_string()
        });
    remainder == "1"
}

// ─── Public functions ────────────────────────────────────────────────────────

pub fn is_luhn_number(value: &str) -> bool {
    let sanitized: String = value.chars().filter(|c| c.is_ascii_digit()).collect();
    if sanitized.is_empty() {
        return false;
    }
    let mut sum = 0i32;
    let mut double = false;
    for ch in sanitized.chars().rev() {
        let mut d = ch.to_digit(10).unwrap_or(0) as i32;
        if double {
            d *= 2;
            if d >= 10 {
                d = d % 10 + 1;
            }
        }
        sum += d;
        double = !double;
    }
    sum % 10 == 0
}

pub fn is_credit_card(value: &str) -> bool {
    let sanitized: String = value.chars().filter(|c| !matches!(c, '-' | ' ')).collect();
    let matches_any = AMEX_RE.is_match(&sanitized)
        || DINERS_RE.is_match(&sanitized)
        || DISCOVER_RE.is_match(&sanitized)
        || JCB_RE.is_match(&sanitized)
        || MASTERCARD_RE.is_match(&sanitized)
        || UNIONPAY_RE.is_match(&sanitized)
        || VISA_RE.is_match(&sanitized);
    matches_any && is_luhn_number(&sanitized)
}

pub fn is_iban(value: &str) -> bool {
    let stripped: String = value
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect::<String>()
        .to_uppercase();
    if stripped.len() < 2 {
        return false;
    }
    let country = &stripped[..2];
    match iban_regex_for(country) {
        Some(re) => re.is_match(&stripped) && iban_checksum_valid(&stripped),
        None => false,
    }
}

pub fn is_bic(value: &str) -> bool {
    if !BIC_RE.is_match(value) {
        return false;
    }
    let country = value[4..6].to_uppercase();
    BIC_COUNTRY_CODES.contains(country.as_str()) || country == "XK"
}

pub fn is_ean(value: &str) -> bool {
    if !EAN_RE.is_match(value) {
        return false;
    }
    let digits: Vec<u32> = value.chars().filter_map(|c| c.to_digit(10)).collect();
    let len = digits.len();
    if len == 8 || len == 13 {
        // EAN-8/13 checksum
        let sum: u32 = digits[..len - 1]
            .iter()
            .enumerate()
            .map(|(i, &d)| if i % 2 == 0 { d } else { d * 3 })
            .sum();
        let check = (10 - (sum % 10)) % 10;
        check == digits[len - 1]
    } else if len == 14 {
        // EAN-14 checksum
        let sum: u32 = digits[..13]
            .iter()
            .enumerate()
            .map(|(i, &d)| if i % 2 == 0 { 3 * d } else { d })
            .sum();
        let check = (10 - (sum % 10)) % 10;
        check == digits[13]
    } else {
        false
    }
}

pub fn is_isbn10(value: &str) -> bool {
    let sanitized: String = value.chars().filter(|c| !matches!(c, '-' | ' ')).collect();
    if !ISBN10_RE.is_match(&sanitized) {
        return false;
    }
    let mut checksum: i32 = 0;
    for (i, ch) in sanitized.chars().take(9).enumerate() {
        let d = ch.to_digit(10).unwrap_or(0) as i32;
        checksum += (i as i32 + 1) * d;
    }
    let last = sanitized.chars().nth(9).unwrap_or('0');
    checksum += if last == 'X' { 100 } else { last.to_digit(10).unwrap_or(0) as i32 * 10 };
    checksum % 11 == 0
}

pub fn is_isbn13(value: &str) -> bool {
    let sanitized: String = value.chars().filter(|c| !matches!(c, '-' | ' ')).collect();
    if !ISBN13_RE.is_match(&sanitized) {
        return false;
    }
    let factors = [1i32, 3];
    let mut checksum: i32 = 0;
    for (i, ch) in sanitized.chars().take(12).enumerate() {
        let d = ch.to_digit(10).unwrap_or(0) as i32;
        checksum += factors[i % 2] * d;
    }
    let last = sanitized.chars().nth(12).unwrap_or('0').to_digit(10).unwrap_or(0) as i32;
    last == (10 - (checksum % 10)) % 10
}

pub fn is_isbn(value: &str) -> bool {
    is_isbn10(value) || is_isbn13(value)
}

pub fn is_isin(value: &str) -> bool {
    if !ISIN_RE.is_match(value) {
        return false;
    }
    let mut sum = 0i32;
    let mut double = true;
    // Process chars in reverse except last digit (check digit)
    for ch in value[..value.len() - 1].chars().rev() {
        if ch.is_ascii_alphabetic() {
            let val = (ch as i32) - 55; // A=10, B=11, ...
            let lo = val % 10;
            let hi = val / 10;
            for digit in &[lo, hi] {
                if double {
                    let d = digit * 2;
                    sum += if d >= 10 { d % 10 + 1 } else { d };
                } else {
                    sum += digit;
                }
                double = !double;
            }
        } else {
            let d = ch.to_digit(10).unwrap_or(0) as i32;
            if double {
                let v = d * 2;
                sum += if v >= 10 { v % 10 + 1 } else { v };
            } else {
                sum += d;
            }
            double = !double;
        }
    }
    let check = value.chars().last().unwrap_or('0').to_digit(10).unwrap_or(0) as i32;
    (10 - (sum % 10)) % 10 == check
}

pub fn is_issn(value: &str) -> bool {
    if !ISSN_RE.is_match(value) {
        return false;
    }
    let digits: String = value.replace('-', "").to_uppercase();
    let mut checksum: i32 = 0;
    for (i, ch) in digits.chars().enumerate() {
        let d: i32 = if ch == 'X' { 10 } else { ch.to_digit(10).unwrap_or(0) as i32 };
        checksum += d * (8 - i as i32);
    }
    checksum % 11 == 0
}

pub fn is_ethereum_address(value: &str) -> bool {
    ETH_RE.is_match(value)
}

pub fn is_btc_address(value: &str) -> bool {
    BTC_BECH32_RE.is_match(value) || BTC_BASE58_RE.is_match(value)
}

/// is_currency — validates default USD-style currency strings ($1,234.56)
pub fn is_currency(value: &str) -> bool {
    CURRENCY_RE.is_match(value)
}
