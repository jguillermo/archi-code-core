mod en;
mod es;

use crate::Param;

pub fn get_message(rule: &str, params: &[Param], locale: &str, custom: Option<&str>) -> String {
    if let Some(msg) = custom {
        return msg.to_string();
    }
    let template = match locale {
        "es" => es::get(rule),
        _ => en::get(rule),
    };
    interpolate(template, params)
}

fn interpolate(template: &str, params: &[Param]) -> String {
    let mut result = template.to_string();
    for (i, param) in params.iter().enumerate() {
        let placeholder = format!("{{{i}}}");
        let value = match param {
            Param::Str(s) => s.clone(),
            Param::Num(n) => n.to_string(),
        };
        result = result.replace(&placeholder, &value);
    }
    result
}
