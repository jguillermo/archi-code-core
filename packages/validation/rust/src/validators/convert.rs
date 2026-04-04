use chrono::NaiveDate;

pub fn to_boolean(value: &str) -> bool {
    matches!(value.trim(), "true" | "1")
}

pub fn to_boolean_loose(value: &str) -> bool {
    matches!(
        value.trim().to_lowercase().as_str(),
        "true" | "1" | "yes" | "on"
    )
}

pub fn to_float(value: &str) -> Option<f64> {
    value.trim().parse::<f64>().ok()
}

pub fn to_int(value: &str, radix: Option<u32>) -> Option<i64> {
    let r = radix.unwrap_or(10);
    let s = value.trim();
    // Handle hex prefix
    let (s, r) = if (r == 16 || r == 0) && (s.starts_with("0x") || s.starts_with("0X")) {
        (&s[2..], 16u32)
    } else {
        (s, r)
    };
    i64::from_str_radix(s, r).ok()
}

pub fn to_date(value: &str) -> Option<NaiveDate> {
    let s = value.trim();
    // YYYY-MM-DD
    if let Ok(d) = NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        return Some(d);
    }
    // MM/DD/YYYY
    if let Ok(d) = NaiveDate::parse_from_str(s, "%m/%d/%Y") {
        return Some(d);
    }
    // DD/MM/YYYY
    if let Ok(d) = NaiveDate::parse_from_str(s, "%d/%m/%Y") {
        return Some(d);
    }
    None
}
