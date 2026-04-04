/// isBoolean strict — only "true", "false", "1", "0"
pub fn is_boolean(value: &str) -> bool {
    matches!(value, "true" | "false" | "1" | "0")
}

/// isBoolean loose — also accepts "yes"/"no"
pub fn is_boolean_loose(value: &str) -> bool {
    matches!(
        value.to_lowercase().as_str(),
        "true" | "false" | "1" | "0" | "yes" | "no"
    )
}

/// isBooleanString — accepts "true"/"false"/"1"/"0"/"yes"/"no"/"on"/"off"
pub fn is_boolean_string(value: &str) -> bool {
    matches!(
        value.to_lowercase().as_str(),
        "true" | "false" | "1" | "0" | "yes" | "no" | "on" | "off"
    )
}
