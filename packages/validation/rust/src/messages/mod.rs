mod en;
mod es;

pub fn get_message(rule: &str, params: &[serde_json::Value], locale: &str, custom: Option<&str>) -> String {
    if let Some(msg) = custom {
        return msg.to_string();
    }
    let template = match locale {
        "es" => es::get(rule),
        _ => en::get(rule),
    };
    interpolate(template, params)
}

fn interpolate(template: &str, params: &[serde_json::Value]) -> String {
    let mut result = template.to_string();
    for (i, param) in params.iter().enumerate() {
        let placeholder = format!("{{{i}}}");
        let value = match param {
            serde_json::Value::String(s) => s.clone(),
            serde_json::Value::Number(n) => n.to_string(),
            serde_json::Value::Bool(b) => b.to_string(),
            _ => param.to_string(),
        };
        result = result.replace(&placeholder, &value);
    }
    result
}
