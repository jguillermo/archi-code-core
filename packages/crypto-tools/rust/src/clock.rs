use time::OffsetDateTime;
use time::format_description::well_known::Rfc3339;

use crate::error::{CryptoError, CryptoResult};

pub fn check_now(now: f64) -> CryptoResult<i64> {
    if !now.is_finite() || now < 0.0 {
        return Err(CryptoError::invalid_input(
            "Current time must be a positive number of seconds.",
        ));
    }
    Ok(now.floor() as i64)
}

pub fn check_duration(seconds: f64, what: &str) -> CryptoResult<i64> {
    if !seconds.is_finite() || seconds <= 0.0 {
        return Err(CryptoError::invalid_input(format!(
            "{what} must be a positive number of seconds."
        )));
    }
    Ok(seconds.floor() as i64)
}

pub fn to_rfc3339(seconds: i64) -> CryptoResult<String> {
    OffsetDateTime::from_unix_timestamp(seconds)
        .ok()
        .and_then(|date| date.format(&Rfc3339).ok())
        .ok_or_else(|| CryptoError::invalid_input("Date is out of range."))
}

pub fn from_rfc3339(text: &str) -> CryptoResult<i64> {
    OffsetDateTime::parse(text, &Rfc3339)
        .map(|date| date.unix_timestamp())
        .map_err(|_| CryptoError::malformed(format!("Invalid date: {text}.")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_and_parses_rfc3339() {
        assert_eq!(to_rfc3339(1_640_995_200).unwrap(), "2022-01-01T00:00:00Z");
        assert_eq!(
            from_rfc3339("2022-01-01T00:00:00+00:00").unwrap(),
            1_640_995_200
        );
        assert_eq!(
            from_rfc3339("2022-01-01T01:00:00+01:00").unwrap(),
            1_640_995_200
        );
        assert!(from_rfc3339("yesterday").is_err());
        assert!(to_rfc3339(i64::MAX).is_err());
    }

    #[test]
    fn validates_times_and_durations() {
        assert_eq!(check_now(10.9).unwrap(), 10);
        assert!(check_now(f64::NAN).is_err());
        assert!(check_now(-1.0).is_err());
        assert_eq!(check_duration(60.5, "expiresIn").unwrap(), 60);
        assert_eq!(
            check_duration(0.0, "expiresIn").unwrap_err().message,
            "expiresIn must be a positive number of seconds."
        );
    }
}
