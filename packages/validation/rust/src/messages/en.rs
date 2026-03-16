pub fn get(rule: &str) -> &'static str {
    match rule {
        // String
        "isNotEmpty" => "must not be empty",
        "isMinLength" => "must be at least {0} characters long",
        "isMaxLength" => "must be at most {0} characters long",
        "isExactLength" => "must be exactly {0} characters long",
        "isLengthBetween" => "must be between {0} and {1} characters long",
        "isAlpha" => "must contain only letters",
        "isAlphanumeric" => "must contain only letters and numbers",
        "isNumeric" => "must contain only digits",
        "isAscii" => "must contain only ASCII characters",
        "isLowercase" => "must be lowercase",
        "isUppercase" => "must be uppercase",
        "isContains" => "must contain \"{0}\"",
        "isStartsWith" => "must start with \"{0}\"",
        "isEndsWith" => "must end with \"{0}\"",
        "isMatchesRegex" => "must match the pattern \"{0}\"",
        // Number
        "isInteger" => "must be an integer",
        "isPositiveInteger" => "must be a positive integer",
        "isNegativeInteger" => "must be a negative integer",
        "isFloat" => "must be a number",
        "isPositiveNumber" => "must be a positive number",
        "isNegativeNumber" => "must be a negative number",
        "isInRange" => "must be between {0} and {1}",
        "isMinValue" => "must be at least {0}",
        "isMaxValue" => "must be at most {0}",
        "isMultipleOf" => "must be a multiple of {0}",
        // Email
        "isEmail" => "must be a valid email address",
        // UUID
        "isUuid" => "must be a valid UUID",
        "isUuidV4" => "must be a valid UUID v4",
        "isUuidV7" => "must be a valid UUID v7",
        // URL
        "isUrl" => "must be a valid URL",
        "isUrlWithScheme" => "must be a valid URL with scheme \"{0}\"",
        // IP
        "isIp" => "must be a valid IP address",
        "isIpv4" => "must be a valid IPv4 address",
        "isIpv6" => "must be a valid IPv6 address",
        // Date
        "isDate" => "must be a valid date (YYYY-MM-DD)",
        "isDatetime" => "must be a valid date and time",
        "isTime" => "must be a valid time (HH:MM:SS)",
        // Boolean
        "isBooleanString" => "must be a boolean value",
        // Misc
        "isCreditCard" => "must be a valid credit card number",
        "isJson" => "must be valid JSON",
        "isHexColor" => "must be a valid hex color",
        "isBase64" => "must be a valid base64 string",
        "isSlug" => "must be a valid slug",
        _ => "is invalid",
    }
}
