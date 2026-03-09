pub fn get(rule: &str) -> &'static str {
    match rule {
        // String
        "isNotEmpty" => "no debe estar vacío",
        "isMinLength" => "debe tener al menos {0} caracteres",
        "isMaxLength" => "debe tener como máximo {0} caracteres",
        "isExactLength" => "debe tener exactamente {0} caracteres",
        "isLengthBetween" => "debe tener entre {0} y {1} caracteres",
        "isAlpha" => "solo debe contener letras",
        "isAlphanumeric" => "solo debe contener letras y números",
        "isNumeric" => "solo debe contener dígitos",
        "isAscii" => "solo debe contener caracteres ASCII",
        "isLowercase" => "debe estar en minúsculas",
        "isUppercase" => "debe estar en mayúsculas",
        "isContains" => "debe contener \"{0}\"",
        "isStartsWith" => "debe comenzar con \"{0}\"",
        "isEndsWith" => "debe terminar con \"{0}\"",
        "isMatchesRegex" => "debe coincidir con el patrón \"{0}\"",
        // Number
        "isInteger" => "debe ser un número entero",
        "isPositiveInteger" => "debe ser un número entero positivo",
        "isNegativeInteger" => "debe ser un número entero negativo",
        "isFloat" => "debe ser un número",
        "isPositiveNumber" => "debe ser un número positivo",
        "isNegativeNumber" => "debe ser un número negativo",
        "isInRange" => "debe estar entre {0} y {1}",
        "isMinValue" => "debe ser al menos {0}",
        "isMaxValue" => "debe ser como máximo {0}",
        "isMultipleOf" => "debe ser múltiplo de {0}",
        // Email
        "isEmail" => "debe ser un correo electrónico válido",
        // UUID
        "isUuid" => "debe ser un UUID válido",
        "isUuidV4" => "debe ser un UUID v4 válido",
        "isUuidV7" => "debe ser un UUID v7 válido",
        // URL
        "isUrl" => "debe ser una URL válida",
        "isUrlWithScheme" => "debe ser una URL válida con esquema \"{0}\"",
        // IP
        "isIp" => "debe ser una dirección IP válida",
        "isIpv4" => "debe ser una dirección IPv4 válida",
        "isIpv6" => "debe ser una dirección IPv6 válida",
        // Date
        "isDate" => "debe ser una fecha válida (YYYY-MM-DD)",
        "isDatetime" => "debe ser una fecha y hora válida",
        "isTime" => "debe ser una hora válida (HH:MM:SS)",
        // Boolean
        "isBooleanString" => "debe ser un valor booleano",
        // Misc
        "isCreditCard" => "debe ser un número de tarjeta de crédito válido",
        "isJson" => "debe ser JSON válido",
        "isHexColor" => "debe ser un color hexadecimal válido",
        "isBase64" => "debe ser una cadena base64 válida",
        "isSlug" => "debe ser un slug válido",
        _ => "es inválido",
    }
}
