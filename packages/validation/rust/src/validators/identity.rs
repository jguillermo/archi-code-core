use once_cell::sync::Lazy;
use regex::Regex;

// ─── IMEI ────────────────────────────────────────────────────────────────────

static IMEI_NO_HYPHENS: Lazy<Regex> = Lazy::new(|| Regex::new(r"^\d{15}$").unwrap());
static IMEI_WITH_HYPHENS: Lazy<Regex> = Lazy::new(|| Regex::new(r"^\d{2}-\d{6}-\d{6}-\d{1}$").unwrap());

/// Validate an IMEI number (without hyphens, Luhn-like check).
pub fn is_imei(value: &str) -> bool {
    if !IMEI_NO_HYPHENS.is_match(value) && !IMEI_WITH_HYPHENS.is_match(value) {
        return false;
    }
    let s: String = value.replace('-', "");
    let mut sum = 0i32;
    let mut mul = 2i32;
    let l = 14usize;
    for i in 0..l {
        let digit: i32 = s[l - i - 1..l - i].parse().unwrap_or(0);
        let tp = digit * mul;
        if tp >= 10 {
            sum += (tp % 10) + 1;
        } else {
            sum += tp;
        }
        if mul == 1 {
            mul += 1;
        } else {
            mul -= 1;
        }
    }
    let chk = (10 - (sum % 10)) % 10;
    let last: i32 = s[14..15].parse().unwrap_or(-1);
    chk == last
}

// ─── ABA Routing ─────────────────────────────────────────────────────────────

static ABA_ROUTING_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^(?!(1[3-9])|(20)|(3[3-9])|(4[0-9])|(5[0-9])|(60)|(7[3-9])|(8[1-9])|(9[0-2])|(9[3-9]))\d{9}$").unwrap()
});

/// Validate an ABA routing number (format + weighted checksum).
pub fn is_aba_routing(value: &str) -> bool {
    if !ABA_ROUTING_RE.is_match(value) {
        return false;
    }
    let digits: Vec<u32> = value.chars().filter_map(|c| c.to_digit(10)).collect();
    if digits.len() != 9 {
        return false;
    }
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

// ─── ISRC ─────────────────────────────────────────────────────────────────────

static ISRC_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[A-Z]{2}[0-9A-Z]{3}\d{2}\d{5}$").unwrap());

/// Validate an International Standard Recording Code (ISRC).
pub fn is_isrc(value: &str) -> bool {
    ISRC_RE.is_match(value)
}

// ─── Strong Password ──────────────────────────────────────────────────────────

/// Validate password strength with defaults:
/// minLength=8, minLowercase=1, minUppercase=1, minNumbers=1, minSymbols=1.
pub fn is_strong_password(value: &str) -> bool {
    if value.len() < 8 {
        return false;
    }
    let symbol_chars: &[char] = &[
        '-', '#', '!', '$', '@', '£', '%', '^', '&', '*', '(', ')', '_', '+', '|', '~', '=',
        '`', '{', '}', '[', ']', ':', '"', ';', '\'', '<', '>', '?', ',', '.', '/', '\\', ' ',
    ];
    let mut lower = 0u32;
    let mut upper = 0u32;
    let mut numbers = 0u32;
    let mut symbols = 0u32;
    for c in value.chars() {
        if c.is_ascii_lowercase() {
            lower += 1;
        } else if c.is_ascii_uppercase() {
            upper += 1;
        } else if c.is_ascii_digit() {
            numbers += 1;
        } else if symbol_chars.contains(&c) {
            symbols += 1;
        }
    }
    lower >= 1 && upper >= 1 && numbers >= 1 && symbols >= 1
}

// ─── Mobile Phone ─────────────────────────────────────────────────────────────

fn mobile_phone_regex(locale: &str) -> Option<&'static str> {
    match locale {
        "am-AM" => Some(r"^(\+?374|0)(33|4[134]|55|77|88|9[13-689])\d{6}$"),
        "ar-AE" => Some(r"^((\+?971)|0)?5[024568]\d{7}$"),
        "ar-BH" => Some(r"^(\+?973)?(3|6)\d{7}$"),
        "ar-DZ" => Some(r"^(\+?213|0)(5|6|7)\d{8}$"),
        "ar-LB" => Some(r"^(\+?961)?((3|81)\d{6}|7\d{7})$"),
        "ar-EG" => Some(r"^((\+?20)|0)?1[0125]\d{8}$"),
        "ar-IQ" => Some(r"^(\+?964|0)?7[0-9]\d{8}$"),
        "ar-JO" => Some(r"^(\+?962|0)?7[789]\d{7}$"),
        "ar-KW" => Some(r"^(\+?965)([569]\d{7}|41\d{6})$"),
        "ar-LY" => Some(r"^((\+?218)|0)?(9[1-6]\d{7}|[1-8]\d{7,9})$"),
        "ar-MA" => Some(r"^(?:(?:\+|00)212|0)[5-7]\d{8}$"),
        "ar-OM" => Some(r"^((\+|00)968)?([79][1-9])\d{6}$"),
        "ar-PS" => Some(r"^(\+?970|0)5[69]\d{7}$"),
        "ar-SA" => Some(r"^(!?(\+?966)|0)?5\d{8}$"),
        "ar-SD" => Some(r"^((\+?249)|0)?(9[012369]|1[012])\d{7}$"),
        "ar-SY" => Some(r"^(!?(\+?963)|0)?9\d{8}$"),
        "ar-TN" => Some(r"^(\+?216)?[2459]\d{7}$"),
        "az-AZ" => Some(r"^(\+994|0)(10|5[015]|7[07]|99)\d{7}$"),
        "ar-QA" => Some(r"^(\+?974|0)?([3567]\d{7})$"),
        "bs-BA" => Some(r"^((((\+|00)3876)|06))((([0-3]|[5-6])\d{6})|(4\d{7}))$"),
        "be-BY" => Some(r"^(\+?375)?(24|25|29|33|44)\d{7}$"),
        "bg-BG" => Some(r"^(\+?359|0)?8[789]\d{7}$"),
        "bn-BD" => Some(r"^(\+?880|0)1[13456789][0-9]{8}$"),
        "ca-AD" => Some(r"^(\+376)?[346]\d{5}$"),
        "cs-CZ" => Some(r"^(\+?420)? ?[1-9][0-9]{2} ?[0-9]{3} ?[0-9]{3}$"),
        "da-DK" => Some(r"^(\+?45)?\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}$"),
        "de-DE" => Some(r"^((\+49|0)1)(5[0-25-9]\d|6([23]|0\d?)|7([0-57-9]|6\d))\d{7,9}$"),
        "de-AT" => Some(r"^(\+43|0)\d{1,4}\d{3,12}$"),
        "de-CH" | "fr-CH" | "it-CH" => Some(r"^(\+41|0)([1-9])\d{1,9}$"),
        "de-LU" => Some(r"^(\+352)?((6\d1)\d{6})$"),
        "dv-MV" => Some(r"^(\+?960)?(7[2-9]|9[1-9])\d{5}$"),
        "el-GR" => Some(r"^(\+?30|0)?6(8[5-9]|9(?![26])[0-9])\d{7}$"),
        "el-CY" => Some(r"^(\+?357?)?(9(9|7|6|5|4)\d{6})$"),
        "en-AI" => Some(r"^(\+?1|0)264(?:2(35|92)|4(?:6[1-2]|76|97)|5(?:3[6-9]|8[1-4])|7(?:2(4|9)|72))\d{4}$"),
        "en-AU" => Some(r"^(\+?61|0)4\d{8}$"),
        "en-AG" => Some(r"^(?:\+1|1)268(?:464|7(?:1[3-9]|[28]\d|3[0246]|64|7[0-689]))\d{4}$"),
        "en-BM" => Some(r"^(\+?1)?441(((3|7)\d{6}$)|(5[0-3][0-9]\d{4}$)|(59\d{5}$))"),
        "en-BS" => Some(r"^(\+?1[-\s]?|0)?\(?242\)?[-\s]?\d{3}[-\s]?\d{4}$"),
        "en-GB" => Some(r"^(\+?44|0)7[1-9]\d{8}$"),
        "en-GG" => Some(r"^(\+?44|0)1481\d{6}$"),
        "en-GH" => Some(r"^(\+233|0)(20|50|24|54|27|57|26|56|23|53|28|55|59)\d{7}$"),
        "en-GY" => Some(r"^(\+592|0)6\d{6}$"),
        "en-HK" | "zh-HK" => Some(r"^(\+?852[-\s]?)?[456789]\d{3}[-\s]?\d{4}$"),
        "en-MO" | "zh-MO" => Some(r"^(\+?853[-\s]?)?[6]\d{3}[-\s]?\d{4}$"),
        "en-IE" | "ga-IE" => Some(r"^(\+?353|0)8[356789]\d{7}$"),
        "en-IN" => Some(r"^(\+?91|0)?[6789]\d{9}$"),
        "en-JM" => Some(r"^(\+?876)?\d{7}$"),
        "en-KE" => Some(r"^(\+?254|0)(7|1)\d{8}$"),
        "fr-CF" => Some(r"^(\+?236| ?)(70|75|77|72|21|22)\d{6}$"),
        "en-SS" => Some(r"^(\+?211|0)(9[1257])\d{7}$"),
        "en-KI" => Some(r"^((\+686|686)?)?( )?((6|7)(2|3|8)[0-9]{6})$"),
        "en-KN" => Some(r"^(?:\+1|1)869(?:46\d|48[89]|55[6-8]|66\d|76[02-7])\d{4}$"),
        "en-LS" => Some(r"^(\+?266)(22|28|57|58|59|27|52)\d{6}$"),
        "en-MT" => Some(r"^(\+?356|0)?(99|79|77|21|27|22|25)[0-9]{6}$"),
        "en-MU" => Some(r"^(\+?230|0)?\d{8}$"),
        "en-MW" => Some(r"^(\+?265|0)(((77|88|31|99|98|21)\d{7})|(((111)|1)\d{6})|(32000\d{4}))$"),
        "en-NA" => Some(r"^(\+?264|0)(6|8)\d{7}$"),
        "en-NG" => Some(r"^(\+?234|0)?[789]\d{9}$"),
        "en-NZ" => Some(r"^(\+?64|0)[28]\d{7,9}$"),
        "en-PG" => Some(r"^(\+?675|0)?(7\d|8[18])\d{6}$"),
        "en-PK" => Some(r"^((00|\+)?92|0)3[0-6]\d{8}$"),
        "en-PH" => Some(r"^(09|\+639)\d{9}$"),
        "en-RW" => Some(r"^(\+?250|0)?[7]\d{8}$"),
        "en-SG" => Some(r"^(\+65)?[3689]\d{7}$"),
        "en-SL" => Some(r"^(\+?232|0)\d{8}$"),
        "en-TZ" => Some(r"^(\+?255|0)?[67]\d{8}$"),
        "en-UG" => Some(r"^(\+?256|0)?[7]\d{8}$"),
        "en-US" | "en-CA" | "fr-CA" => Some(r"^((\+1|1)?( |-)?)?(\([2-9][0-9]{2}\)|[2-9][0-9]{2})( |-)?([2-9][0-9]{2}( |-)?[0-9]{4})$"),
        "en-ZA" => Some(r"^(\+?27|0)\d{9}$"),
        "en-ZM" => Some(r"^(\+?26)?0[79][567]\d{7}$"),
        "en-ZW" => Some(r"^(\+263)[0-9]{9}$"),
        "en-BW" => Some(r"^(\+?267)?(7[1-8]{1})\d{6}$"),
        "es-AR" => Some(r"^\+?549(11|[2368]\d)\d{8}$"),
        "es-BO" => Some(r"^(\+?591)?(6|7)\d{7}$"),
        "es-CO" => Some(r"^(\+?57)?3(0(0|1|2|4|5)|1\d|2[0-4]|5(0|1))\d{7}$"),
        "es-CL" => Some(r"^(\+?56|0)[2-9]\d{1}\d{7}$"),
        "es-CR" => Some(r"^(\+506)?[2-8]\d{7}$"),
        "es-CU" => Some(r"^(\+53|0053)?5\d{7}$"),
        "es-DO" => Some(r"^(\+?1)?8[024]9\d{7}$"),
        "es-HN" => Some(r"^(\+?504)?[9|8|3|2]\d{7}$"),
        "es-EC" => Some(r"^(\+?593|0)([2-7]|9[2-9])\d{7}$"),
        "es-ES" => Some(r"^(\+?34)?[6|7]\d{8}$"),
        "es-GT" => Some(r"^(\+?502)?[2|6|7]\d{7}$"),
        "es-PE" => Some(r"^(\+?51)?9\d{8}$"),
        "es-MX" => Some(r"^(\+?52)?(1|01)?\d{10,11}$"),
        "es-NI" => Some(r"^(\+?505)\d{7,8}$"),
        "es-PA" => Some(r"^(\+?507)\d{7,8}$"),
        "es-PY" => Some(r"^(\+?595|0)9[9876]\d{7}$"),
        "es-SV" => Some(r"^(\+?503)?[67]\d{7}$"),
        "es-UY" => Some(r"^(\+598|0)9[1-9][\d]{6}$"),
        "es-VE" => Some(r"^(\+?58)?(2|4)\d{9}$"),
        "et-EE" => Some(r"^(\+?372)?\s?(5|8[1-4])\s?([0-9]\s?){6,7}$"),
        "fa-IR" => Some(r"^(\+?98[\-\s]?|0)9[0-39]\d[\-\s]?\d{3}[\-\s]?\d{4}$"),
        "fi-FI" => Some(r"^(\+?358|0)\s?(4[0-6]|50)\s?(\d\s?){4,8}$"),
        "fj-FJ" => Some(r"^(\+?679)?\s?\d{3}\s?\d{4}$"),
        "fo-FO" => Some(r"^(\+?298)?\s?\d{2}\s?\d{2}\s?\d{2}$"),
        "fr-BF" => Some(r"^(\+226|0)[67]\d{7}$"),
        "fr-BJ" => Some(r"^(\+229)\d{8}$"),
        "fr-CD" => Some(r"^(\+?243|0)?(8|9)\d{8}$"),
        "fr-CM" => Some(r"^(\+?237)6[0-9]{8}$"),
        "fr-DJ" => Some(r"^(?:\+253)?77[6-8]\d{5}$"),
        "fr-FR" => Some(r"^(\+?33|0)[67]\d{8}$"),
        "fr-GF" => Some(r"^(\+?594|0|00594)[67]\d{8}$"),
        "fr-GP" => Some(r"^(\+?590|0|00590)[67]\d{8}$"),
        "fr-MQ" => Some(r"^(\+?596|0|00596)[67]\d{8}$"),
        "fr-PF" => Some(r"^(\+?689)?8[789]\d{6}$"),
        "fr-RE" => Some(r"^(\+?262|0|00262)[67]\d{8}$"),
        "fr-WF" => Some(r"^(\+681)?\d{6}$"),
        "fr-BE" | "nl-BE" => Some(r"^(\+?32|0)4\d{8}$"),
        "he-IL" => Some(r"^(\+972|0)([23489]|5[012345689]|77)[1-9]\d{6}$"),
        "hu-HU" => Some(r"^(\+?36|06)(20|30|31|50|70)\d{7}$"),
        "id-ID" => Some(r"^(\+?62|0)8(1[123456789]|2[1238]|3[1238]|5[12356789]|7[78]|9[56789]|8[123456789])([\s?\d]{5,11})$"),
        "ir-IR" => Some(r"^(\+98|0)?9\d{9}$"),
        "it-IT" => Some(r"^(\+?39)?\s?3\d{2} ?\d{6,7}$"),
        "it-SM" => Some(r"^((\+378)|(0549)|(\+390549)|(\+3780549))?6\d{5,9}$"),
        "ja-JP" => Some(r"^(\+81[ \-]?(\(0\))?|0)[6789]0[ \-]?\d{4}[ \-]?\d{4}$"),
        "ka-GE" => Some(r"^(\+?995)?(79\d{7}|5\d{8})$"),
        "kk-KZ" => Some(r"^(\+?7|8)?7\d{9}$"),
        "kl-GL" => Some(r"^(\+?299)?\s?\d{2}\s?\d{2}\s?\d{2}$"),
        "ko-KR" => Some(r"^((\+?82)[ \-]?)?0?1([0|1|6|7|8|9]{1})[ \-]?\d{3,4}[ \-]?\d{4}$"),
        "ky-KG" => Some(r"^(\+996\s?)?(22[0-9]|50[0-9]|55[0-9]|70[0-9]|75[0-9]|77[0-9]|880|990|995|996|997|998)\s?\d{3}\s?\d{3}$"),
        "lt-LT" => Some(r"^(\+370|8)\d{8}$"),
        "lv-LV" => Some(r"^(\+?371)2\d{7}$"),
        "mg-MG" => Some(r"^((\+?261|0)(2|3)\d)?\d{7}$"),
        "mn-MN" => Some(r"^(\+|00|011)?976(77|81|88|91|94|95|96|99)\d{6}$"),
        "my-MM" => Some(r"^(\+?959|09|9)(2[5-7]|3[1-2]|4[0-5]|6[6-9]|7[5-9]|9[6-9])[0-9]{7}$"),
        "ms-MY" => Some(r"^(\+?60|0)1(([0145](-|\s)?\d{7,8})|([236-9](-|\s)?\d{7}))$"),
        "mz-MZ" => Some(r"^(\+?258)?8[234567]\d{7}$"),
        "nb-NO" | "nn-NO" => Some(r"^(\+?47)?[49]\d{7}$"),
        "ne-NP" => Some(r"^(\+?977)?9[78]\d{8}$"),
        "nl-NL" => Some(r"^(((\+|00)?31\(0\))|((\+|00)?31)|0)6{1}\d{8}$"),
        "nl-AW" => Some(r"^(\+)?297(56|59|64|73|74|99)\d{5}$"),
        "pl-PL" => Some(r"^(\+?48)? ?([5-8]\d|45) ?\d{3} ?\d{2} ?\d{2}$"),
        "pt-BR" => Some(r"^((\+?55\ ?[1-9]{2}\ ?)|(\+?55\ ?\([1-9]{2}\)\ ?)|(0[1-9]{2}\ ?)|(\([1-9]{2}\)\ ?)|([1-9]{2}\ ?))((\d{4}\-?\d{4})|(9[1-9]{1}\d{3}\-?\d{4}))$"),
        "pt-PT" => Some(r"^(\+?351)?9[1236]\d{7}$"),
        "pt-AO" => Some(r"^(\+?244)?9\d{8}$"),
        "ro-MD" => Some(r"^(\+?373|0)((6(0|1|2|6|7|8|9))|(7(6|7|8|9)))\d{6}$"),
        "ro-RO" => Some(r"^(\+?40|0)\s?7\d{2}(\/|\s|\.|-)?\d{3}(\s|\.|-)?\d{3}$"),
        "ru-RU" => Some(r"^(\+?7|8)?9\d{9}$"),
        "si-LK" => Some(r"^(?:0|94|\+94)?(7(0|1|2|4|5|6|7|8)( |-)?)\d{7}$"),
        "sl-SI" => Some(r"^(\+386\s?|0)(\d{1}\s?\d{3}\s?\d{2}\s?\d{2}|\d{2}\s?\d{3}\s?\d{3})$"),
        "sk-SK" => Some(r"^(\+?421)? ?[1-9][0-9]{2} ?[0-9]{3} ?[0-9]{3}$"),
        "so-SO" => Some(r"^(\+?252|0)((6[0-9])\d{7}|(7[1-9])\d{7})$"),
        "sq-AL" => Some(r"^(\+355|0)6[2-9]\d{7}$"),
        "sr-RS" => Some(r"^(\+3816|06)[- \d]{5,9}$"),
        "sv-SE" => Some(r"^(\+?46|0)[\s\-]?7[\s\-]?[02369]([\s\-]?\d){7}$"),
        "tg-TJ" => Some(r"^(\+?992)?[5][5]\d{7}$"),
        "th-TH" => Some(r"^(\+66|66|0)\d{9}$"),
        "tr-TR" => Some(r"^(\+?90|0)?5\d{9}$"),
        "tk-TM" => Some(r"^(\+993|993|8)\d{8}$"),
        "uk-UA" => Some(r"^(\+?38)?0(50|6[36-8]|7[357]|9[1-9])\d{7}$"),
        "uz-UZ" => Some(r"^(\+?998)?(6[125-79]|7[1-69]|88|9\d)\d{7}$"),
        "vi-VN" => Some(r"^((\+?84)|0)((3([2-9]))|(5([25689]))|(7([06-9]))|(8([1-9]))|(9([0-9])))([0-9]{7})$"),
        "zh-CN" => Some(r"^((\+|00)86)?(1[3-9]|9[28])\d{9}$"),
        "zh-TW" => Some(r"^(\+?886\-?|0)?9\d{8}$"),
        "dz-BT" => Some(r"^(\+?975|0)?(17|16|77|02)\d{6}$"),
        "ar-YE" => Some(r"^(((\+|00)9677|0?7)[0137]\d{7}|((\+|00)967|0)[1-7]\d{6})$"),
        "ar-EH" => Some(r"^(\+?212|0)[\s\-]?(5288|5289)[\s\-]?\d{5}$"),
        "fa-AF" => Some(r"^(\+93|0)?(2{1}[0-8]{1}|[3-5]{1}[0-4]{1})(\d{7})$"),
        "mk-MK" => Some(r"^(\+?389|0)?((?:2[2-9]\d{6}|(?:3[1-4]|4[2-8])\d{6}|500\d{5}|5[2-9]\d{6}|7[0-9][2-9]\d{5}|8[1-9]\d{6}|800\d{5}|8009\d{4}))$"),
        _ => None,
    }
}

/// Validate a mobile phone number for a given locale.
/// Returns false for unknown locales (does not panic).
pub fn is_mobile_phone(value: &str, locale: &str) -> bool {
    if let Some(pat) = mobile_phone_regex(locale) {
        Regex::new(pat).map(|re| re.is_match(value)).unwrap_or(false)
    } else {
        false
    }
}

// ─── Postal Code ──────────────────────────────────────────────────────────────

fn postal_code_pattern(locale: &str) -> Option<&'static str> {
    match locale {
        "AD" => Some(r"^AD\d{3}$"),
        "AT" => Some(r"^\d{4}$"),
        "AU" => Some(r"^\d{4}$"),
        "AZ" => Some(r"^AZ\d{4}$"),
        "BA" => Some(r"^([7-8]\d{4})$"),
        "BD" => Some(r"^([1-8][0-9]{3}|9[0-4][0-9]{2})$"),
        "BE" => Some(r"^\d{4}$"),
        "BG" => Some(r"^\d{4}$"),
        "BR" => Some(r"^\d{5}-?\d{3}$"),
        "BY" => Some(r"^2[1-4]\d{4}$"),
        "CA" => Some(r"^(?i)[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][\s\-]?\d[ABCEGHJ-NPRSTV-Z]\d$"),
        "CH" => Some(r"^\d{4}$"),
        "CN" => Some(r"^(0[1-7]|1[012356]|2[0-7]|3[0-6]|4[0-7]|5[1-7]|6[1-7]|7[1-5]|8[1345]|9[09])\d{4}$"),
        "CO" => Some(r"^(05|08|11|13|15|17|18|19|20|23|25|27|41|44|47|50|52|54|63|66|68|70|73|76|81|85|86|88|91|94|95|97|99)(\d{4})$"),
        "CZ" => Some(r"^\d{3}\s?\d{2}$"),
        "DE" => Some(r"^\d{5}$"),
        "DK" => Some(r"^\d{4}$"),
        "DO" => Some(r"^\d{5}$"),
        "DZ" => Some(r"^\d{5}$"),
        "EE" => Some(r"^\d{5}$"),
        "ES" => Some(r"^(5[0-2]{1}|[0-4]{1}\d{1})\d{3}$"),
        "FI" => Some(r"^\d{5}$"),
        "FR" => Some(r"^(?:(?:0[1-9]|[1-8]\d|9[0-5])\d{3}|97[1-46]\d{2})$"),
        "GB" => Some(r"^(?i)(gir\s?0aa|[a-z]{1,2}\d[\da-z]?\s?(\d[a-z]{2})?)$"),
        "GR" => Some(r"^\d{3}\s?\d{2}$"),
        "HR" => Some(r"^([1-5]\d{4})$"),
        "HT" => Some(r"^HT\d{4}$"),
        "HU" => Some(r"^\d{4}$"),
        "ID" => Some(r"^\d{5}$"),
        "IE" => Some(r"^(?i)(?!.*(?:o))[A-Za-z]\d[\dw]\s\w{4}$"),
        "IL" => Some(r"^(\d{5}|\d{7})$"),
        "IN" => Some(r"^((?!10|29|35|54|55|65|66|86|87|88|89)[1-9][0-9]{5})$"),
        "IR" => Some(r"^(?!(\d)\1{3})[13-9]{4}[1346-9][013-9]{5}$"),
        "IS" => Some(r"^\d{3}$"),
        "IT" => Some(r"^\d{5}$"),
        "JP" => Some(r"^\d{3}\-\d{4}$"),
        "KE" => Some(r"^\d{5}$"),
        "KR" => Some(r"^(\d{5}|\d{6})$"),
        "LI" => Some(r"^(948[5-9]|949[0-7])$"),
        "LT" => Some(r"^LT\-\d{5}$"),
        "LU" => Some(r"^\d{4}$"),
        "LV" => Some(r"^LV\-\d{4}$"),
        "LK" => Some(r"^\d{5}$"),
        "MC" => Some(r"^980\d{2}$"),
        "MG" => Some(r"^\d{3}$"),
        "MX" => Some(r"^\d{5}$"),
        "MT" => Some(r"^[A-Za-z]{3}\s{0,1}\d{4}$"),
        "MY" => Some(r"^\d{5}$"),
        "NL" => Some(r"^(?i)[1-9]\d{3}\s?(?!sa|sd|ss)[a-z]{2}$"),
        "NO" => Some(r"^\d{4}$"),
        "NP" => Some(r"^(?i)(10|21|22|32|33|34|44|45|56|57)\d{3}$|^(977)$"),
        "NZ" => Some(r"^\d{4}$"),
        "PK" => Some(r"^\d{5}$"),
        "PL" => Some(r"^\d{2}\-\d{3}$"),
        "PR" => Some(r"^00[679]\d{2}([ -]\d{4})?$"),
        "PT" => Some(r"^\d{4}\-\d{3}?$"),
        "RO" => Some(r"^\d{6}$"),
        "RU" => Some(r"^\d{6}$"),
        "SA" => Some(r"^\d{5}$"),
        "SE" => Some(r"^[1-9]\d{2}\s?\d{2}$"),
        "SG" => Some(r"^\d{6}$"),
        "SI" => Some(r"^\d{4}$"),
        "SK" => Some(r"^\d{3}\s?\d{2}$"),
        "TH" => Some(r"^\d{5}$"),
        "TN" => Some(r"^\d{4}$"),
        "TW" => Some(r"^\d{3}(\d{2,3})?$"),
        "UA" => Some(r"^\d{5}$"),
        "US" => Some(r"^\d{5}(-\d{4})?$"),
        "ZA" => Some(r"^\d{4}$"),
        "ZM" => Some(r"^\d{5}$"),
        _ => None,
    }
}

/// Validate a postal code for a given locale.
/// Returns false for unknown locales (does not panic).
pub fn is_postal_code(value: &str, locale: &str) -> bool {
    if let Some(pat) = postal_code_pattern(locale) {
        Regex::new(pat).map(|re| re.is_match(value)).unwrap_or(false)
    } else {
        false
    }
}

// ─── Passport Number ──────────────────────────────────────────────────────────

fn passport_regex(locale: &str) -> Option<&'static str> {
    match locale {
        "AM" => Some(r"^[A-Z]{2}\d{7}$"),
        "AR" => Some(r"^[A-Z]{3}\d{6}$"),
        "AT" => Some(r"^[A-Z]\d{7}$"),
        "AU" => Some(r"^[A-Z]\d{7}$"),
        "AZ" => Some(r"^[A-Z]{1}\d{8}$"),
        "BE" => Some(r"^[A-Z]{2}\d{6}$"),
        "BG" => Some(r"^\d{9}$"),
        "BR" => Some(r"^[A-Z]{2}\d{6}$"),
        "BY" => Some(r"^[A-Z]{2}\d{7}$"),
        "CA" => Some(r"^[A-Z]{2}\d{6}$|^[A-Z]\d{6}[A-Z]{2}$"),
        "CH" => Some(r"^[A-Z]\d{7}$"),
        "CN" => Some(r"^G\d{8}$|^E(?![IO])[A-Z0-9]\d{7}$"),
        "CY" => Some(r"^[A-Z](\d{6}|\d{8})$"),
        "CZ" => Some(r"^\d{8}$"),
        "DE" => Some(r"^[CFGHJKLMNPRTVWXYZ0-9]{9}$"),
        "DK" => Some(r"^\d{9}$"),
        "DZ" => Some(r"^\d{9}$"),
        "EE" => Some(r"^([A-Z]\d{7}|[A-Z]{2}\d{7})$"),
        "ES" => Some(r"^[A-Z0-9]{2}([A-Z0-9]?)\d{6}$"),
        "FI" => Some(r"^[A-Z]{2}\d{7}$"),
        "FR" => Some(r"^\d{2}[A-Z]{2}\d{5}$"),
        "GB" => Some(r"^\d{9}$"),
        "GR" => Some(r"^[A-Z]{2}\d{7}$"),
        "HR" => Some(r"^\d{9}$"),
        "HU" => Some(r"^[A-Z]{2}(\d{6}|\d{7})$"),
        "IE" => Some(r"^[A-Z0-9]{2}\d{7}$"),
        "IN" => Some(r"^[A-Z]{1}-?\d{7}$"),
        "ID" => Some(r"^[A-C]\d{7}$"),
        "IR" => Some(r"^[A-Z]\d{8}$"),
        "IS" => Some(r"^(A)\d{7}$"),
        "IT" => Some(r"^[A-Z0-9]{2}\d{7}$"),
        "JM" => Some(r"^[Aa]\d{7}$"),
        "JP" => Some(r"^[A-Z]{2}\d{7}$"),
        "KR" => Some(r"^[MS]\d{8}$"),
        "KZ" => Some(r"^[a-zA-Z]\d{7}$"),
        "LI" => Some(r"^[a-zA-Z]\d{5}$"),
        "LT" => Some(r"^[A-Z0-9]{8}$"),
        "LU" => Some(r"^[A-Z0-9]{8}$"),
        "LV" => Some(r"^[A-Z0-9]{2}\d{7}$"),
        "LY" => Some(r"^[A-Z0-9]{8}$"),
        "MT" => Some(r"^\d{7}$"),
        "MZ" => Some(r"^([A-Z]{2}\d{7})|(\d{2}[A-Z]{2}\d{5})$"),
        "MY" => Some(r"^[AHK]\d{8}$"),
        "MX" => Some(r"^[A-Z]\d{8}$"),
        "NL" => Some(r"^[A-Z]{2}[A-Z0-9]{6}\d$"),
        "NZ" => Some(r"^([Ll]([Aa]|[Dd]|[Ff]|[Hh])|[Ee]([Aa]|[Pp])|[Nn])\d{6}$"),
        "PH" => Some(r"^([A-Z](\d{6}|\d{7}[A-Z]))|([A-Z]{2}(\d{6}|\d{7}))$"),
        "PK" => Some(r"^[A-Z]{2}\d{7}$"),
        "PL" => Some(r"^[A-Z]{2}\d{7}$"),
        "PT" => Some(r"^[A-Z]\d{6}$"),
        "RO" => Some(r"^\d{8,9}$"),
        "RU" => Some(r"^\d{9}$"),
        "SE" => Some(r"^\d{8}$"),
        "SL" => Some(r"^(P)[A-Z]\d{7}$"),
        "SK" => Some(r"^[0-9A-Z]\d{7}$"),
        "TH" => Some(r"^[A-Z]{1,2}\d{6,7}$"),
        "TR" => Some(r"^[A-Z]\d{8}$"),
        "UA" => Some(r"^[A-Z]{2}\d{6}$"),
        "US" => Some(r"^\d{9}$|^[A-Z]\d{8}$"),
        "ZA" => Some(r"^[TAMD]\d{8}$"),
        _ => None,
    }
}

/// Validate a passport number for a given country code (ISO 3166-1 alpha-2).
/// Input is normalized: whitespace removed, converted to uppercase.
/// Returns false for unknown locales (does not panic).
pub fn is_passport_number(value: &str, locale: &str) -> bool {
    let normalized: String = value.chars().filter(|c| !c.is_whitespace()).collect::<String>().to_uppercase();
    let lc = locale.to_uppercase();
    if let Some(pat) = passport_regex(&lc) {
        Regex::new(pat).map(|re| re.is_match(&normalized)).unwrap_or(false)
    } else {
        false
    }
}

// ─── Identity Card ────────────────────────────────────────────────────────────

fn identity_card_pattern(locale: &str) -> Option<&'static str> {
    match locale {
        // PL — PESEL (regex-only approximation: 11 digits)
        "PL" => Some(r"^\d{11}$"),
        // ES — DNI/NIE
        "ES" => Some(r"^[0-9X-Z][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$"),
        // FI — Finnish PIC
        "FI" => Some(r"^\d{6}[\-A\+]\d{3}[0-9ABCDEFHJKLMNPRSTUVWXY]{1}$"),
        // IN — Aadhaar (12 digits, first non-zero)
        "IN" => Some(r"^[1-9]\d{3}\s?\d{4}\s?\d{4}$"),
        // IR — Iranian NID (10 digits)
        "IR" => Some(r"^\d{10}$"),
        // IT — Italian Electronic ID
        "IT" => Some(r"^C[A-Z]\d{5}[A-Z]{2}$"),
        // NO — Norwegian national identity (11 digits)
        "NO" => Some(r"^\d{11}$"),
        // TH — Thai NID (13 digits, first 1-8)
        "TH" => Some(r"^[1-8]\d{12}$"),
        // LK — Sri Lanka NIC
        "LK" => Some(r"^([1-9]\d{8}[vxVX]|[1-9]\d{11})$"),
        // he-IL — Israeli ID (9 digits)
        "he-IL" => Some(r"^\d{9}$"),
        // ar-LY — Libyan NIN (12 digits, first 1 or 2)
        "ar-LY" => Some(r"^(1|2)\d{11}$"),
        // ar-TN — Tunisian CIN (8 digits)
        "ar-TN" => Some(r"^\d{8}$"),
        // zh-CN — Chinese RIC (15 or 18 digits/chars)
        "zh-CN" => Some(r"^(\d{15}|(\d{17}(\d|x|X)))$"),
        // zh-HK — Hong Kong HKID
        "zh-HK" => Some(r"^[A-Z]{1,2}[0-9]{6}((\([0-9A]\))|(\[[0-9A]\])|([0-9A]))$"),
        // zh-TW — Taiwanese NID
        "zh-TW" => Some(r"^[A-Z][0-9]{9}$"),
        // PK — Pakistani CNIC
        "PK" => Some(r"^[1-7][0-9]{4}-[0-9]{7}-[1-9]$"),
        _ => None,
    }
}

/// Validate an identity card number for a given locale (regex-based only).
/// Returns false for unknown locales (does not panic).
pub fn is_identity_card(value: &str, locale: &str) -> bool {
    if let Some(pat) = identity_card_pattern(locale) {
        Regex::new(pat).map(|re| re.is_match(value)).unwrap_or(false)
    } else {
        false
    }
}

// ─── License Plate ────────────────────────────────────────────────────────────

fn license_plate_pattern(locale: &str) -> Option<&'static str> {
    match locale {
        "cs-CZ" => Some(r"^(([ABCDEFHIJKLMNPRSTUVXYZ]|[0-9])-?){5,8}$"),
        "de-DE" => Some(concat!(
            r"^((A|AA|AB|AC|AE|AH|AK|AM|AN|A[ÖO]|AP|AS|AT|AU|AW|AZ|B|BA|BB|BC|BE|BF|BH|BI|BK|BL|BM|BN|BO|B[ÖO]|BS|BT|BZ|C|CA|CB|CE|CO|CR|CW|D|DA|DD|DE|DH|DI|DL|DM|DN|DO|DU|DW|DZ|E|EA|EB|ED|EE|EF|EG|EH|EI|EL|EM|EN|ER|ES|EU|EW|F|FB|FD|FF|FG|FI|FL|FN|FO|FR|FS|FT|F[ÜU]|FW|FZ|G|GA|GC|GD|GE|GF|GG|GI|GK|GL|GM|GN|G[ÖO]|GP|GR|GS|GT|G[ÜU]|GV|GW|GZ|H|HA|HB|HC|HD|HE|HF|HG|HH|HI|HK|HL|HM|HN|HO|HP|HR|HS|HU|HV|HX|HY|HZ|IK|IL|IN|IZ|J|JE|JL|K|KA|KB|KC|KE|KF|KG|KH|KI|KK|KL|KM|KN|KO|KR|KS|KT|KU|KW|KY|L|LA|LB|LC|LD|LF|LG|LH|LI|LL|LM|LN|L[ÖO]|LP|LR|LU|M|MA|MB|MC|MD|ME|MG|MH|MI|MK|ML|MM|MN|MO|MQ|MR|MS|M[ÜU]|MW|MY|MZ|N|NB|ND|NE|NF|NH|NI|NK|NM|N[ÖO]|NP|NR|NT|NU|NW|NY|NZ|OA|OB|OC|OD|OE|OF|OG|OH|OK|OL|OP|OS|OZ|P|PA|PB|PE|PF|PI|PL|PM|PN|PR|PS|PW|PZ|R|RA|RC|RD|RE|RG|RH|RI|RL|RM|RN|RO|RP|RS|RT|RU|RV|RW|RZ|S|SB|SC|SE|SG|SI|SK|SL|SM|SN|SO|SP|SR|ST|SU|SW|SY|SZ|TE|TF|TG|TO|TP|TR|TS|TT|T[ÜU]|[ÜU]B|UE|UH|UL|UM|UN|V|VB|VG|VK|VR|VS|W|WA|WB|WE|WF|WI|WK|WL|WM|WN|WO|WR|WS|WT|W[ÜU]|WW|WZ|Z|ZE|ZI|ZP|ZR|ZW|ZZ)[- ]?[A-Z]{1,2}[- ]?\d{1,4}|",
            r"(ABG|ABI|AIB|AIC|ALF|ALZ|ANA|ANG|ANK|APD|ARN|ART|ASL|ASZ|AUR|AZE|BAD|BAR|BBG|BCH|BED|BER|BGD|BGL|BID|BIN|BIR|BIT|BIW|BKS|BLB|BLK|BNA|BOG|BOH|BOR|BOT|BRA|BRB|BRG|BRK|BRL|BRV|BSB|BSK|BTF|B[ÜU]D|BUL|B[ÜU]R|B[ÜU]S|B[ÜU]Z|CAS|CHA|CLP|CLZ|COC|COE|CUX|DAH|DAN|DAU|DBR|DEG|DEL|DGF|DIL|DIN|DIZ|DKB|DLG|DON|DUD|D[ÜU]W|EBE|EBN|EBS|ECK|EIC|EIL|EIN|EIS|EMD|EMS|ERB|ERH|ERK|ERZ|ESB|ESW|FDB|FDS|FEU|FFB|FKB|FL[ÖO]|FOR|FRG|FRI|FRW|FTL|F[ÜU]S|GAN|GAP|GDB|GEL|GEO|GER|GHA|GHC|GLA|GMN|GNT|GOA|GOH|GRA|GRH|GRI|GRM|GRZ|GTH|GUB|GUN|GVM|HAB|HAL|HAM|HAS|HBN|HBS|HCH|HDH|HDL|HEB|HEF|HEI|HER|HET|HGN|HGW|HHM|HIG|HIP|HM[ÜU]|HOG|HOH|HOL|HOM|HOR|H[ÖO]S|HOT|HRO|HSK|HST|HVL|HWI|IGB|ILL|J[ÜU]L|KEH|KEL|KEM|KIB|KLE|KLZ|K[ÖO]N|K[ÖO]T|K[ÖO]Z|KRU|K[ÜU]N|KUS|KYF|LAN|LAU|LBS|LBZ|LDK|LDS|LEO|LER|LEV|LIB|LIF|LIP|L[ÖO]B|LOS|LRO|LSZ|L[ÜU]N|LUP|LWL|MAB|MAI|MAK|MAL|MED|MEG|MEI|MEK|MEL|MER|MET|MGH|MGN|MHL|MIL|MKK|MOD|MOL|MON|MOS|MSE|MSH|MSP|MST|MTK|MTL|M[ÜU]B|M[ÜU]R|MYK|MZG|NAB|NAI|NAU|NDH|NEA|NEB|NEC|NEN|NES|NEW|NMB|NMS|NOH|NOL|NOM|NOR|NVP|NWM|OAL|OBB|OBG|OCH|OHA|[ÖO]HR|OHV|OHZ|OPR|OSL|OVI|OVL|OVP|PAF|PAN|PAR|PCH|PEG|PIR|PL[ÖO]|PR[ÜU]|QFT|QLB|RDG|REG|REH|REI|RID|RIE|ROD|ROF|ROK|ROL|ROS|ROT|ROW|RSL|R[ÜU]D|R[ÜU]G|SAB|SAD|SAN|SAW|SBG|SBK|SCZ|SDH|SDL|SDT|SEB|SEE|SEF|SEL|SFB|SFT|SGH|SHA|SHG|SHK|SHL|SIG|SIM|SLE|SLF|SLK|SLN|SLS|SL[ÜU]|SLZ|SM[ÜU]|SOB|SOG|SOK|S[ÖO]M|SON|SPB|SPN|SRB|SRO|STA|STB|STD|STE|STL|SUL|S[ÜU]W|SWA|SZB|TBB|TDO|TET|TIR|T[ÖO]L|TUT|UEM|UER|UFF|USI|VAI|VEC|VER|VIB|VIE|VIT|VOH|WAF|WAK|WAN|WAR|WAT|WBS|WDA|WEL|WEN|WER|WES|WHV|WIL|WIS|WIT|WIZ|WLG|WMS|WND|WOB|WOH|WOL|WOR|WOS|WRN|WSF|WST|WSW|WTL|WTM|WUG|W[ÜU]M|WUN|WUR|WZL|ZEL|ZIG)[- ]?(([A-Z][- ]?\d{1,4})|([A-Z]{2}[- ]?\d{1,3})))[- ]?(E|H)?$"
        )),
        "de-LI" => Some(r"^FL[- ]?\d{1,5}[UZ]?$"),
        "en-IN" => Some(r"^[A-Z]{2}[ -]?[0-9]{1,2}(?:[ -]?[A-Z])(?:[ -]?[A-Z]*)?[ -]?[0-9]{4}$"),
        "en-SG" => Some(r"^[A-Z]{3}[ -]?[\d]{4}[ -]?[A-Z]{1}$"),
        "es-AR" => Some(r"^(([A-Z]{2} ?[0-9]{3} ?[A-Z]{2})|([A-Z]{3} ?[0-9]{3}))$"),
        "fi-FI" => Some(r"^(?=.{4,7})(([A-Z]{1,3}|[0-9]{1,3})[\s-]?([A-Z]{1,3}|[0-9]{1,5}))$"),
        "hu-HU" => Some(r"^((((?!AAA)(([A-NPRSTVZWXY]{1})([A-PR-Z]{1})([A-HJ-NPR-Z]))|(A[ABC]I)|A[ABC]O|A[A-W]Q|BPI|BPO|UCO|UDO|XAO)-(?!000)\d{3})|(M\d{6})|((CK|DT|CD|HC|H[ABEFIKLMNPRSTVX]|MA|OT|R[A-Z]) \d{2}-\d{2})|(CD \d{3}-\d{3})|(C-(C|X) \d{4})|(X-(A|B|C) \d{4})|(([EPVZ]-\d{5}))|(S A[A-Z]{2} \d{2})|(SP \d{2}-\d{2}))$"),
        "pt-BR" => Some(r"^[A-Z]{3}[ -]?[0-9][A-Z][0-9]{2}|[A-Z]{3}[ -]?[0-9]{4}$"),
        "pt-PT" => Some(r"^(([A-Z]{2}[ -·]?[0-9]{2}[ -·]?[0-9]{2})|([0-9]{2}[ -·]?[A-Z]{2}[ -·]?[0-9]{2})|([0-9]{2}[ -·]?[0-9]{2}[ -·]?[A-Z]{2})|([A-Z]{2}[ -·]?[0-9]{2}[ -·]?[A-Z]{2}))$"),
        "sq-AL" => Some(r"^[A-Z]{2}[- ]?((\d{3}[- ]?(([A-Z]{2})|T))|(R[- ]?\d{3}))$"),
        "sv-SE" => Some(r"^[A-HJ-PR-UW-Z]{3} ?[\d]{2}[A-HJ-PR-UW-Z1-9]$|^[A-ZÅÄÖ ]{2,7}$"),
        "en-PK" => Some(r"(^[A-Z]{2}((\s|-){0,1})[0-9]{3,4}((\s|-)[0-9]{2}){0,1}$)|(^[A-Z]{3}((\s|-){0,1})[0-9]{3,4}((\s|-)[0-9]{2}){0,1}$)|(^[A-Z]{4}((\s|-){0,1})[0-9]{3,4}((\s|-)[0-9]{2}){0,1}$)|(^[A-Z]((\s|-){0,1})[0-9]{4}((\s|-)[0-9]{2}){0,1}$)"),
        _ => None,
    }
}

/// Validate a license plate for a given locale.
/// Returns false for unknown locales (does not panic).
pub fn is_license_plate(value: &str, locale: &str) -> bool {
    // sv-SE needs trimmed input
    let trimmed;
    let input = if locale == "sv-SE" {
        trimmed = value.trim().to_string();
        &trimmed as &str
    } else {
        value
    };
    if let Some(pat) = license_plate_pattern(locale) {
        Regex::new(pat).map(|re| re.is_match(input)).unwrap_or(false)
    } else {
        false
    }
}

// ─── VAT ──────────────────────────────────────────────────────────────────────

fn vat_pattern(locale: &str) -> Option<&'static str> {
    match locale {
        // EU
        "AT" => Some(r"^(AT)?U\d{8}$"),
        "BE" => Some(r"^(BE)?\d{10}$"),
        "BG" => Some(r"^(BG)?\d{9,10}$"),
        "HR" => Some(r"^(HR)?\d{11}$"),
        "CY" => Some(r"^(CY)?\w{9}$"),
        "CZ" => Some(r"^(CZ)?\d{8,10}$"),
        "DK" => Some(r"^(DK)?\d{8}$"),
        "EE" => Some(r"^(EE)?\d{9}$"),
        "FI" => Some(r"^(FI)?\d{8}$"),
        "FR" => Some(r"^(FR)([A-Z0-9]{2}\d{9})$"),
        "DE" => Some(r"^(DE)?\d{9}$"),
        "EL" => Some(r"^(EL)?\d{9}$"),
        "HU" => Some(r"^(HU)?\d{8}$"),
        "IE" => Some(r"^(IE)?\d{7}\w{1}(W)?$"),
        "IT" => Some(r"^(IT)?\d{11}$"),
        "LV" => Some(r"^(LV)?\d{11}$"),
        "LT" => Some(r"^(LT)?\d{9,12}$"),
        "LU" => Some(r"^(LU)?\d{8}$"),
        "MT" => Some(r"^(MT)?\d{8}$"),
        "NL" => Some(r"^(NL)?\d{9}B\d{2}$"),
        "PL" => Some(r"^(PL)?(\d{10}|(\d{3}-\d{3}-\d{2}-\d{2})|(\d{3}-\d{2}-\d{2}-\d{3}))$"),
        "PT" => Some(r"^(PT)?\d{9}$"),
        "RO" => Some(r"^(RO)?\d{2,10}$"),
        "SK" => Some(r"^(SK)?\d{10}$"),
        "SI" => Some(r"^(SI)?\d{8}$"),
        "ES" => Some(r"^(ES)?\w\d{7}[A-Z]$"),
        "SE" => Some(r"^(SE)?\d{12}$"),
        // Non-EU
        "AL" => Some(r"^(AL)?\w{9}[A-Z]$"),
        "MK" => Some(r"^(MK)?\d{13}$"),
        "AU" => Some(r"^(AU)?\d{11}$"),
        "BY" => Some(r"^(\xd0\xa3\xd0\x9d\xd0\x9f )?\d{9}$"), // "УНП " prefix
        "CA" => Some(r"^(CA)?\d{9}$"),
        "IS" => Some(r"^(IS)?\d{5,6}$"),
        "IN" => Some(r"^(IN)?\d{15}$"),
        "ID" => Some(r"^(ID)?(\d{15}|(\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}))$"),
        "IL" => Some(r"^(IL)?\d{9}$"),
        "KZ" => Some(r"^(KZ)?\d{12}$"),
        "NZ" => Some(r"^(NZ)?\d{9}$"),
        "NG" => Some(r"^(NG)?(\d{12}|(\d{8}-\d{4}))$"),
        "NO" => Some(r"^(NO)?\d{9}MVA$"),
        "PH" => Some(r"^(PH)?(\d{12}|\d{3} \d{3} \d{3} \d{3})$"),
        "RU" => Some(r"^(RU)?(\d{10}|\d{12})$"),
        "SM" => Some(r"^(SM)?\d{5}$"),
        "SA" => Some(r"^(SA)?\d{15}$"),
        "RS" => Some(r"^(RS)?\d{9}$"),
        "CH" => Some(r"^(CHE[- ]?)?(\d{9}|(\d{3}\.\d{3}\.\d{3})|(\d{3} \d{3} \d{3})) ?(TVA|MWST|IVA)?$"),
        "TR" => Some(r"^(TR)?\d{10}$"),
        "UA" => Some(r"^(UA)?\d{12}$"),
        "GB" => Some(r"^GB((\d{3} \d{4} ([0-8][0-9]|9[0-6]))|(\d{9} \d{3})|(((GD[0-4])|(HA[5-9]))[0-9]{2}))$"),
        "UZ" => Some(r"^(UZ)?\d{9}$"),
        // Latin America
        "AR" => Some(r"^(AR)?\d{11}$"),
        "BO" => Some(r"^(BO)?\d{7}$"),
        "BR" => Some(r"^(BR)?((\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})|(\d{3}\.\d{3}\.\d{3}-\d{2}))$"),
        "CL" => Some(r"^(CL)?\d{8}-\d{1}$"),
        "CO" => Some(r"^(CO)?\d{10}$"),
        "CR" => Some(r"^(CR)?\d{9,12}$"),
        "EC" => Some(r"^(EC)?\d{13}$"),
        "SV" => Some(r"^(SV)?\d{4}-\d{6}-\d{3}-\d{1}$"),
        "GT" => Some(r"^(GT)?\d{7}-\d{1}$"),
        "HN" => Some(r"^(HN)?$"),
        "MX" => Some(r"^(MX)?\w{3,4}\d{6}\w{3}$"),
        "NI" => Some(r"^(NI)?\d{3}-\d{6}-\d{4}\w{1}$"),
        "PA" => Some(r"^(PA)?$"),
        "PY" => Some(r"^(PY)?\d{6,8}-\d{1}$"),
        "PE" => Some(r"^(PE)?\d{11}$"),
        "DO" => Some(r"^(DO)?(\d{11}|(\d{3}-\d{7}-\d{1})|[145]\d{8}|([145])-\d{2}-\d{5}-\d{1})$"),
        "UY" => Some(r"^(UY)?\d{12}$"),
        "VE" => Some(r"^(VE)?[JGVE]{1}-(\d{9}|(\d{8}-\d{1}))$"),
        _ => None,
    }
}

// ─── Tax ID ───────────────────────────────────────────────────────────────────

fn tax_id_pattern(locale: &str) -> Option<&'static str> {
    match locale {
        "bg-BG" => Some(r"^\d{10}$"),
        "cs-CZ" | "sk-SK" => Some(r"^\d{6}\/{0,1}\d{3,4}$"),
        "de-AT" => Some(r"^\d{9}$"),
        "de-DE" => Some(r"^[1-9]\d{10}$"),
        "dk-DK" => Some(r"^\d{6}-{0,1}\d{4}$"),
        "el-CY" => Some(r"^[09]\d{7}[A-Z]$"),
        "el-GR" => Some(r"^([0-4]|[7-9])\d{8}$"),
        "en-CA" | "fr-CA" => Some(r"^\d{9}$"),
        "en-GB" => Some(r"^\d{10}$|^(?!GB|NK|TN|ZZ)(?![DFIQUV])[A-Z](?![DFIQUVO])[A-Z]\d{6}[ABCD ]$"),
        "en-IE" => Some(r"^\d{7}[A-W][A-IW]{0,1}$"),
        "en-US" => Some(r"^\d{2}[- ]{0,1}\d{7}$"),
        "es-AR" => Some(r"(20|23|24|27|30|33|34)[0-9]{8}[0-9]"),
        "es-ES" => Some(r"^(\d{0,8}|[XYZKLM]\d{7})[A-HJ-NP-TV-Z]$"),
        "et-EE" | "lt-LT" => Some(r"^[1-6]\d{6}(00[1-9]|0[1-9][0-9]|[1-6][0-9]{2}|70[0-9]|710)\d$"),
        "fi-FI" => Some(r"^\d{6}[-+A]\d{3}[0-9A-FHJ-NPR-Y]$"),
        "fr-BE" | "nl-BE" => Some(r"^\d{11}$"),
        "fr-FR" => Some(r"^[0-3]\d{12}$|^[0-3]\d\s\d{2}(\s\d{3}){3}$"),
        "fr-LU" | "lb-LU" => Some(r"^\d{13}$"),
        "hr-HR" => Some(r"^\d{11}$"),
        "hu-HU" => Some(r"^8\d{9}$"),
        "it-IT" => Some(r"^[A-Z]{6}[L-NP-V0-9]{2}[A-EHLMPRST][L-NP-V0-9]{2}[A-ILMZ][L-NP-V0-9]{3}[A-Z]$"),
        "lv-LV" => Some(r"^\d{6}-{0,1}\d{5}$"),
        "mt-MT" => Some(r"^\d{3,7}[APMGLHBZ]$|^([1-8])\1\d{7}$"),
        "nl-NL" => Some(r"^\d{9}$"),
        "pl-PL" => Some(r"^\d{10,11}$"),
        "pt-BR" => Some(r"(?:^\d{3}\.\d{3}\.\d{3}-\d{2}$)|(?:^\d{11}$)|(?:^[A-Z0-9]{12}\d{2}$)"),
        "pt-PT" => Some(r"^\d{9}$"),
        "ro-RO" => Some(r"^\d{13}$"),
        "sl-SI" => Some(r"^[1-9]\d{7}$"),
        "sv-SE" => Some(r"^(\d{6}[-+]{0,1}\d{4}|(18|19|20)\d{6}[-+]{0,1}\d{4})$"),
        "uk-UA" => Some(r"^\d{10}$"),
        _ => None,
    }
}

/// Validate a Tax Identification Number (TIN) for a given locale (regex-based only).
/// Returns false for unknown locales (does not panic).
pub fn is_tax_id(value: &str, locale: &str) -> bool {
    if let Some(pat) = tax_id_pattern(locale) {
        // Some locales need sanitization before matching
        let sanitized: String = match locale {
            "de-AT" | "fr-BE" | "nl-BE" => {
                value.chars().filter(|c| !matches!(c, '-' | '\\' | '/' | '!' | '@' | '#' | '$' | '%' | '^' | '&' | '*' | '(' | ')' | '+' | '=' | '[' | ']')).collect()
            }
            "de-DE" => value.chars().filter(|c| !matches!(c, '/' | '\\')).collect(),
            _ => value.to_string(),
        };
        Regex::new(pat).map(|re| re.is_match(&sanitized)).unwrap_or(false)
    } else {
        false
    }
}

/// Validate a VAT number for a given country code.
/// Returns false for unknown country codes (does not panic).
pub fn is_vat(value: &str, locale: &str) -> bool {
    if let Some(pat) = vat_pattern(locale) {
        Regex::new(pat).map(|re| re.is_match(value)).unwrap_or(false)
    } else {
        false
    }
}
