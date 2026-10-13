use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCode {
    InvalidKey,
    InvalidInput,
    Tampered,
    Expired,
    Malformed,
    Unsupported,
}

impl ErrorCode {
    pub fn as_str(self) -> &'static str {
        match self {
            ErrorCode::InvalidKey => "INVALID_KEY",
            ErrorCode::InvalidInput => "INVALID_INPUT",
            ErrorCode::Tampered => "TAMPERED",
            ErrorCode::Expired => "EXPIRED",
            ErrorCode::Malformed => "MALFORMED",
            ErrorCode::Unsupported => "UNSUPPORTED",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CryptoError {
    pub code: ErrorCode,
    pub message: String,
}

impl CryptoError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        CryptoError {
            code,
            message: message.into(),
        }
    }

    pub fn invalid_key(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::InvalidKey, message)
    }

    pub fn invalid_input(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::InvalidInput, message)
    }

    pub fn tampered(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::Tampered, message)
    }

    pub fn expired(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::Expired, message)
    }

    pub fn malformed(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::Malformed, message)
    }

    pub fn unsupported(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::Unsupported, message)
    }

    pub fn encoded(&self) -> String {
        format!("{}|{}", self.code.as_str(), self.message)
    }
}

impl fmt::Display for CryptoError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.code.as_str(), self.message)
    }
}

pub type CryptoResult<T> = Result<T, CryptoError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encodes_code_and_message_for_the_javascript_side() {
        let error = CryptoError::tampered("Data may have been tampered with.");
        assert_eq!(
            error.encoded(),
            "TAMPERED|Data may have been tampered with."
        );
        assert_eq!(
            error.to_string(),
            "TAMPERED: Data may have been tampered with."
        );
    }

    #[test]
    fn names_every_code() {
        let codes = [
            (CryptoError::invalid_key(""), "INVALID_KEY"),
            (CryptoError::invalid_input(""), "INVALID_INPUT"),
            (CryptoError::expired(""), "EXPIRED"),
            (CryptoError::malformed(""), "MALFORMED"),
            (CryptoError::unsupported(""), "UNSUPPORTED"),
        ];
        for (error, name) in codes {
            assert_eq!(error.code.as_str(), name);
        }
    }
}
