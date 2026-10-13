use crate::error::{CryptoError, CryptoResult};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Level {
    Basic,
    Standard,
    Strong,
    Cnsa,
}

impl Level {
    pub const ALL: [Level; 4] = [Level::Basic, Level::Standard, Level::Strong, Level::Cnsa];

    pub fn parse(value: &str) -> CryptoResult<Level> {
        match value {
            "basic" => Ok(Level::Basic),
            "standard" => Ok(Level::Standard),
            "strong" => Ok(Level::Strong),
            "cnsa" | "military" => Ok(Level::Cnsa),
            other => Err(CryptoError::unsupported(format!(
                "Unsupported security level: {other}. Use basic, standard, strong, cnsa or military."
            ))),
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Level::Basic => "basic",
            Level::Standard => "standard",
            Level::Strong => "strong",
            Level::Cnsa => "cnsa",
        }
    }
}

pub trait Algorithm: Sized + Copy + PartialEq {
    fn parse(value: &str) -> CryptoResult<Self>;
    fn name(self) -> &'static str;
    fn for_level(level: Level) -> Self;
}

pub fn resolve<A: Algorithm>(level: Option<&str>, algorithm: Option<&str>) -> CryptoResult<A> {
    let level = level.map(Level::parse).transpose()?;
    let algorithm = algorithm.map(A::parse).transpose()?;
    match (level, algorithm) {
        (None, None) => Ok(A::for_level(Level::Standard)),
        (Some(level), None) => Ok(A::for_level(level)),
        (None, Some(algorithm)) => Ok(algorithm),
        (Some(level), Some(algorithm)) => {
            let expected = A::for_level(level);
            if expected == algorithm {
                Ok(algorithm)
            } else {
                Err(CryptoError::unsupported(format!(
                    "Algorithm {} does not match level {}, which uses {}.",
                    algorithm.name(),
                    level.name(),
                    expected.name()
                )))
            }
        }
    }
}

pub fn explicit_level(level: Option<&str>) -> CryptoResult<Option<Level>> {
    level.map(Level::parse).transpose()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Debug, Clone, Copy, PartialEq)]
    enum Sample {
        Small,
        Large,
    }

    impl Algorithm for Sample {
        fn parse(value: &str) -> CryptoResult<Self> {
            match value {
                "small" => Ok(Sample::Small),
                "large" => Ok(Sample::Large),
                _ => Err(CryptoError::unsupported("no")),
            }
        }

        fn name(self) -> &'static str {
            match self {
                Sample::Small => "small",
                Sample::Large => "large",
            }
        }

        fn for_level(level: Level) -> Self {
            match level {
                Level::Basic | Level::Standard => Sample::Small,
                Level::Strong | Level::Cnsa => Sample::Large,
            }
        }
    }

    #[test]
    fn parses_every_level_and_the_military_alias() {
        for level in Level::ALL {
            assert_eq!(Level::parse(level.name()).unwrap(), level);
        }
        assert_eq!(Level::parse("military").unwrap(), Level::Cnsa);
        assert!(Level::parse("top-secret").is_err());
    }

    #[test]
    fn defaults_to_the_standard_level() {
        assert_eq!(resolve::<Sample>(None, None).unwrap(), Sample::Small);
    }

    #[test]
    fn picks_the_algorithm_of_the_level() {
        assert_eq!(
            resolve::<Sample>(Some("military"), None).unwrap(),
            Sample::Large
        );
    }

    #[test]
    fn accepts_an_explicit_algorithm() {
        assert_eq!(
            resolve::<Sample>(None, Some("large")).unwrap(),
            Sample::Large
        );
        assert_eq!(
            resolve::<Sample>(Some("strong"), Some("large")).unwrap(),
            Sample::Large
        );
    }

    #[test]
    fn rejects_an_algorithm_that_contradicts_the_level() {
        let error = resolve::<Sample>(Some("basic"), Some("large")).unwrap_err();
        assert_eq!(
            error.message,
            "Algorithm large does not match level basic, which uses small."
        );
    }

    #[test]
    fn reads_an_optional_explicit_level() {
        assert_eq!(explicit_level(None).unwrap(), None);
        assert_eq!(explicit_level(Some("cnsa")).unwrap(), Some(Level::Cnsa));
    }
}
